"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_BYPASS, useAuth } from '@/lib/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // bypass 模式下登录页不展示,直接跳到主页(避免出现空表单页面)。
  useEffect(() => {
    if (AUTH_BYPASS) {
      router.replace('/');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      // 登录成功 — 跳转到主页
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
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
            Natural Catastrophe Risk Platform
          </CardTitle>
          <p className="text-center text-sm text-gray-600">
            自然灾害风险管理平台
          </p>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
                autoComplete="current-password"
              />
            </div>

            {(error || authError) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600 text-center">
                  {error || authError}
                </p>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={isLoading}
              >
                {isLoading ? '登录中...' : '登录'}
              </Button>
            </div>

            <p className="text-center text-sm text-gray-600 pt-2">
              还没有账号?{' '}
              <Link href="/register" className="text-blue-600 hover:underline font-medium">
                立即注册
              </Link>
            </p>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}