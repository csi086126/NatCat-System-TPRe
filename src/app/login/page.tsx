"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 验证账号密码
    if (username === 'admin' && password === '123') {
      // 登录成功，保存登录状态
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', username);
      
      // 跳转到主页
      setTimeout(() => {
        router.push('/');
      }, 500);
    } else {
      // 登录失败
      setError('用户名或密码错误');
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
              <Label htmlFor="username">账号</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入账号"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
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
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600 text-center">{error}</p>
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
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
