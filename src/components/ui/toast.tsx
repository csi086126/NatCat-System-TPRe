'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  durationMs?: number
}

interface ToastContextValue {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => string
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
}

const VARIANT_ICONS: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

let counter = 0
const nextId = () => `toast-${Date.now()}-${++counter}`

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts(current => current.filter(toast => toast.id !== id))
  }, [])

  const push = React.useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = nextId()
    const item: ToastItem = { durationMs: 4500, ...toast, id }
    setToasts(current => [...current, item])
    if (item.durationMs && item.durationMs > 0) {
      window.setTimeout(() => dismiss(id), item.durationMs)
    }
    return id
  }, [dismiss])

  const value = React.useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastViewport() {
  const { toasts, dismiss } = useToast()
  if (toasts.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))] pointer-events-none"
    >
      {toasts.map(toast => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  )
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const Icon = VARIANT_ICONS[toast.variant]
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto rounded-lg border shadow-sm px-4 py-3 flex items-start gap-3',
        'animate-in fade-in slide-in-from-top-2',
        VARIANT_STYLES[toast.variant],
      )}
    >
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{toast.title}</div>
        {toast.description && (
          <div className="text-xs mt-1 opacity-90 whitespace-pre-wrap break-words">{toast.description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded hover:bg-black/5 flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}