"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type VerifyStatus = 'loading' | 'verified' | 'already_verified' | 'invalid' | 'expired' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
          { method: 'GET', credentials: 'include' },
        );
        if (cancelled) return;
        if (!res.ok) {
          setStatus('error');
          setErrorMsg(`Verification failed (HTTP ${res.status})`);
          return;
        }
        const data = await res.json();
        setStatus(data.status as VerifyStatus);
        setEmail(data.email ?? null);
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(e instanceof Error ? e.message : 'Network error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
            邮���验证
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center text-sm text-gray-600 py-4">
              正在验证您的邮箱…
            </div>
          )}

          {status === 'verified' && (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700 font-medium">
                  ✓ 邮箱验证成功!
                </p>
                {email && (
                  <p className="text-xs text-green-600 mt-1">
                    {email} 已激活
                  </p>
                )}
              </div>
              <Button className="w-full h-11" onClick={() => router.push('/login')}>
                立即登录
              </Button>
            </div>
          )}

          {status === 'already_verified' && (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  此邮箱已验证过,无需重复操作。
                </p>
              </div>
              <Button className="w-full h-11" onClick={() => router.push('/login')}>
                去登录
              </Button>
            </div>
          )}

          {(status === 'invalid' || status === 'expired') && (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-700">
                  {status === 'expired'
                    ? '验证链接已过期,请重新注册或在登录页申请重发。'
                    : '验证链接无效,请检查邮件中的完整链接。'}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full h-11">
                    去登录
                  </Button>
                </Link>
                <Link href="/register" className="flex-1">
                  <Button className="w-full h-11">重新注册</Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  {errorMsg ?? '验证失败,请稍后重试。'}
                </p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full h-11">
                  返回登录
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Loading…
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}