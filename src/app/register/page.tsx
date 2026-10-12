"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/lib/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(
        email.trim(),
        password,
        displayName.trim() || undefined,
        organization.trim() || undefined,
      );
      if (result.verification_required) {
        setSuccess(
          '注册成功!请查收邮箱中的验证邮件(可能在垃圾邮件中),点击链接激活账号后再登录。',
        );
      } else {
        // 后端未启用验证,直接跳首页(向后兼容)
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
            注册账号
          </CardTitle>
          <p className="text-center text-sm text-gray-600">
            Create your Natural Catastrophe Risk Platform account
          </p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱 *</Label>
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
              <Label htmlFor="displayName">显示名(可选)</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="如:张三 / John Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
                className="h-11"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">所在单位</Label>
              <Input
                id="organization"
                type="text"
                placeholder="如:中国太平保险(香港) / Macau SMM"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                disabled={isLoading}
                className="h-11"
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码 *</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少 8 位,包含字母与数字"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码 *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700 text-center">{success}</p>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={isLoading}
              >
                {isLoading ? '注册中...' : '注册'}
              </Button>
            </div>

            <p className="text-center text-sm text-gray-600 pt-2">
              已有账号?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                立即登录
              </Link>
            </p>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}