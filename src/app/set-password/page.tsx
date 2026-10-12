"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SetStatus = 'loading' | 'ready' | 'invalid' | 'expired' | 'already_used' | 'submitting' | 'success' | 'error';

function SetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<SetStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);

  // 预检 token 是否有效(可选 — 实际在 submit 时检查)
  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    setStatus('ready');
    setTokenValid(true);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (password.length < 8) {
      setError('密码至少 8 位');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('密码需包含字母与数字');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : `设置失败 (HTTP ${res.status})`);
        setStatus('error');
        return;
      }
      const st = data.status as string;
      if (st === 'ok') {
        setEmail(data.email ?? null);
        setStatus('success');
      } else if (st === 'invalid') {
        setStatus('invalid');
      } else if (st === 'expired') {
        setEmail(data.email ?? null);
        setStatus('expired');
      } else if (st === 'already_used') {
        setEmail(data.email ?? null);
        setStatus('already_used');
      } else {
        setError(`未知状态: ${st}`);
        setStatus('error');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center">
            <Image
              src="/taipinglogo.png"
              alt="China Taiping Logo"
              width={280}
              height={35}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-800">
            设置密码
          </CardTitle>
          {email && (status === 'success' || status === 'expired' || status === 'already_used') && (
            <p className="text-center text-sm text-gray-600">{email}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {(status === 'loading') && (
            <div className="text-center text-sm text-gray-500 py-4">校验链接…</div>
          )}

          {(status === 'invalid') && (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-700">链接无效或缺失 token,请联系管理员重新发起邀请。</p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full h-11">返回登录</Button>
              </Link>
            </div>
          )}

          {(status === 'expired') && (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-700">链接已过期,请联系管理员重新发起邀请。</p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full h-11">返回登录</Button>
              </Link>
            </div>
          )}

          {(status === 'already_used') && (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">此链接已使用过,如忘记密码请联系管理员重置。</p>
              </div>
              <Link href="/login">
                <Button className="w-full h-11">去登录</Button>
              </Link>
            </div>
          )}

          {(status === 'success') && (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700 font-medium">✓ 密码设置成功!</p>
              </div>
              <Button className="w-full h-11" onClick={() => router.push('/login')}>
                立即登录
              </Button>
            </div>
          )}

          {(tokenValid && (status === 'ready' || status === 'submitting' || status === 'error')) && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">新密码 *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="至少 8 位,包含字母与数字"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={status === 'submitting'}
                    className="h-11"
                    minLength={8}
                    maxLength={128}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认新密码 *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="再次输入"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={status === 'submitting'}
                    className="h-11"
                    minLength={8}
                    maxLength={128}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600 text-center">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? '提交中…' : '设置密码'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Loading…
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}