'use client'

import * as React from 'react'

export interface AuthUser {
  id: number
  email: string
  display_name: string | null
  role: 'user' | 'admin'
  created_at: string
  last_login_at: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    displayName?: string,
    organization?: string,
  ) => Promise<{ verification_required: boolean }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

// 调试期开关:开启后整个 auth 流程走 mock,跳过 FastAPI 后端验证。
// 设为 'true'/'1' 启用;其它任何值或不设置都视为关闭(走真实登录)。
// 注意:这是前端 mock,FastAPI 后端并未改动 — 其它模块如果直接调后端 auth 端点不受影响。
const AUTH_BYPASS_FLAG = String(
  process.env.NEXT_PUBLIC_AUTH_BYPASS ?? '',
)
  .trim()
  .toLowerCase()
export const AUTH_BYPASS = AUTH_BYPASS_FLAG === 'true' || AUTH_BYPASS_FLAG === '1'

// bypass 模式下使用的固定 admin 用户。/api/auth/me 在此模式下不会被调用,
// 所以这里填什么都行,只要类型对齐 AuthUser 即可。
const BYPASS_ADMIN_USER: AuthUser = {
  id: 0,
  email: 'admin@natcat.local',
  display_name: 'Local Debug Admin',
  role: 'admin',
  created_at: new Date(0).toISOString(),
  last_login_at: null,
}

async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    if (data?.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
    if (data?.error) return data.error
  } catch {
    /* not JSON */
  }
  return `${fallback} (HTTP ${res.status})`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(
    AUTH_BYPASS ? BYPASS_ADMIN_USER : null,
  )
  const [isLoading, setIsLoading] = React.useState(!AUTH_BYPASS)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (AUTH_BYPASS) {
      // bypass 模式下永远视为已登录,不发请求。
      setUser(BYPASS_ADMIN_USER)
      setIsLoading(false)
      return
    }
    setError(null)
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const me: AuthUser = await res.json()
        setUser(me)
      } else if (res.status === 401) {
        setUser(null)
      } else {
        setUser(null)
        setError(await extractError(res, 'Failed to load profile'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const login = React.useCallback(async (email: string, password: string) => {
    if (AUTH_BYPASS) {
      // bypass 模式下任何 email/password 都视为登录成功。
      setUser({ ...BYPASS_ADMIN_USER, email: email || BYPASS_ADMIN_USER.email })
      return
    }
    setError(null)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const message = await extractError(res, 'Login failed')
      setError(message)
      throw new Error(message)
    }
    const data = await res.json()
    setUser(data.user as AuthUser)
  }, [])

  const register = React.useCallback(
    async (email: string, password: string, displayName?: string, organization?: string) => {
      if (AUTH_BYPASS) {
        // bypass 模式下注册视为"立即可用",不调后端。
        setUser({ ...BYPASS_ADMIN_USER, email })
        return { verification_required: false }
      }
      setError(null)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName || null,
          organization: organization || null,
        }),
      })
      if (!res.ok) {
        const message = await extractError(res, 'Registration failed')
        setError(message)
        throw new Error(message)
      }
      const data = await res.json()
      // 邮箱验证流程启用后,不在注册时设 user — 等用户验证邮箱后再登录。
      // 后端会返回 verification_required=true;前端根据此字段展示「请查收邮件」。
      setUser(null)
      return { verification_required: !!data.verification_required }
    },
    [],
  )

  const logout = React.useCallback(async () => {
    if (AUTH_BYPASS) {
      // bypass 模式下 logout 是 no-op,保留会话状态。
      return
    }
    setError(null)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      setUser(null)
    }
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, isLoading, error, login, register, logout, refresh }),
    [user, isLoading, error, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>')
  }
  return ctx
}