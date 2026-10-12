"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Copy, Check, Users, AlertCircle,
  Power, Trash2, RotateCw, KeyRound,
  X,
} from 'lucide-react';

interface AdminUserItem {
  id: number;
  email: string;
  display_name: string | null;
  organization: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'pending_verification' | 'suspended';
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface CreateResult {
  user: AdminUserItem;
  set_password_url: string;
  expires_in_hours: number;
}

interface ResendResult {
  user: AdminUserItem;
  set_password_url: string;
  expires_in_hours: number;
}

type DialogState =
  | { kind: 'none' }
  | { kind: 'confirm_delete'; user: AdminUserItem }
  | { kind: 'resend_result'; result: ResendResult };

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // 表单状态
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // 创建结果
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);
  const [copied, setCopied] = useState(false);

  // 用户列表
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  // 弹窗
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const [resendCopied, setResendCopied] = useState(false);

  // 守卫:非 admin 跳走
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
    }
  }, [authLoading, user, router]);

  const fetchUsers = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/auth/admin/users?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        console.error('Failed to load users', res.status);
        return;
      }
      const data = await res.json();
      setUsers(data.items);
      setTotal(data.total);
    } finally {
      setLoadingList(false);
    }
  }, [search]);

  useEffect(() => {
    if (user?.role === 'admin') fetchUsers();
  }, [user, fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const res = await fetch('/api/auth/admin/create-user', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          display_name: displayName.trim() || null,
          organization: organization.trim() || null,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(typeof data.detail === 'string' ? data.detail : `创建失败 (HTTP ${res.status})`);
        return;
      }
      setCreateResult(data);
      // 清空表单
      setEmail('');
      setDisplayName('');
      setOrganization('');
      setRole('user');
      // 刷新列表
      fetchUsers();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (url: string, onCopied: () => void) => {
    try {
      await navigator.clipboard.writeText(url);
      onCopied();
      setTimeout(onCopied, 2000);
    } catch {
      // 浏览器没开 clipboard API
    }
  };

  // ====== Actions ======

  const handleToggleStatus = async (u: AdminUserItem) => {
    setActionError('');
    const next = u.status === 'suspended' ? 'active' : 'suspended';
    setBusyUserId(u.id);
    try {
      const res = await fetch(`/api/auth/admin/users/${u.id}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.detail === 'string' ? data.detail : `HTTP ${res.status}`;
        setActionError(`${msg}`);
        return;
      }
      await fetchUsers();
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDelete = async (u: AdminUserItem) => {
    setActionError('');
    setBusyUserId(u.id);
    try {
      const res = await fetch(`/api/auth/admin/users/${u.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.detail === 'string' ? data.detail : `HTTP ${res.status}`;
        setActionError(`${msg}`);
        return;
      }
      setDialog({ kind: 'none' });
      await fetchUsers();
    } finally {
      setBusyUserId(null);
    }
  };

  const handleResend = async (u: AdminUserItem) => {
    setActionError('');
    setBusyUserId(u.id);
    try {
      const res = await fetch(`/api/auth/admin/users/${u.id}/resend-setup`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.detail === 'string' ? data.detail : `HTTP ${res.status}`;
        setActionError(`${msg}`);
        return;
      }
      const data = await res.json();
      setDialog({ kind: 'resend_result', result: data });
      await fetchUsers();
    } finally {
      setBusyUserId(null);
    }
  };

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        加载中…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 标题 */}
        <div className="flex items-center gap-3">
          <Users size={28} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
            <p className="text-sm text-gray-500">
              管理员手动开通账号,共 <strong>{total}</strong> 个用户
            </p>
          </div>
        </div>

        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{actionError}</p>
            <button onClick={() => setActionError('')} className="ml-auto">
              <X size={14} className="text-red-400" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 创建用户表单 */}
          <Card>
            <CardHeader>
              <CardTitle>开通新账号</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱 *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={creating}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">显示名</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="张三 /"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={creating}
                    className="h-11"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">所在单位</Label>
                  <Input
                    id="organization"
                    type="text"
                    placeholder="中国太平保险(香港) /"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    disabled={creating}
                    className="h-11"
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">角色</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
                    disabled={creating}
                    className="w-full h-11 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">普通用户</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>

                {createError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{createError}</p>
                  </div>
                )}

                <Button type="submit" className="w-full h-11" disabled={creating}>
                  {creating ? '创建中…' : '开通账号'}
                </Button>
              </form>

              {/* 创建成功后显示设置密码链接 */}
              {createResult && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md space-y-3">
                  <p className="text-sm font-medium text-green-800">
                    ✓ 账号已创建:{createResult.user.email}
                  </p>
                  <p className="text-xs text-green-700">
                    把下面的「设置密码」链接发给用户(微信 / 企业邮箱 / 钉钉),用户点链接设置密码后即可登录。
                    链接 <strong>{createResult.expires_in_hours} 小时</strong>内有效。
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={createResult.set_password_url}
                      className="h-10 text-xs font-mono"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyLink(createResult.set_password_url, () => setCopied(true))}
                      className="h-10 w-10"
                      title="复制链接"
                    >
                      {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 用户列表 */}
          <Card>
            <CardHeader>
              <CardTitle>已有用户</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Input
                  type="search"
                  placeholder="搜索邮箱 / 显示名 / 单位"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10"
                />

                <div className="border rounded-md max-h-[500px] overflow-y-auto">
                  {loadingList ? (
                    <div className="p-6 text-center text-sm text-gray-500">加载中…</div>
                  ) : users.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">暂无用户</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium text-gray-600">邮箱</th>
                          <th className="text-left p-2 font-medium text-gray-600">单位</th>
                          <th className="text-left p-2 font-medium text-gray-600">角色</th>
                          <th className="text-left p-2 font-medium text-gray-600">状态</th>
                          <th className="text-right p-2 font-medium text-gray-600">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => {
                          const isMe = u.id === user.id;
                          const busy = busyUserId === u.id;
                          return (
                            <tr key={u.id} className="border-t hover:bg-gray-50">
                              <td className="p-2">
                                <div className="font-medium">{u.email}</div>
                                {u.display_name && (
                                  <div className="text-xs text-gray-500">{u.display_name}</div>
                                )}
                                {isMe && (
                                  <div className="text-[10px] text-blue-600">(你)</div>
                                )}
                              </td>
                              <td className="p-2 text-gray-600">
                                {u.organization || <span className="text-gray-400">—</span>}
                              </td>
                              <td className="p-2">
                                {u.role === 'admin' ? (
                                  <span className="text-[10px] uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                    admin
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500">user</span>
                                )}
                              </td>
                              <td className="p-2">
                                <span
                                  className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                                    u.status === 'active'
                                      ? 'bg-green-100 text-green-700'
                                      : u.status === 'pending_verification'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {u.status}
                                </span>
                              </td>
                              <td className="p-2">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={busy || isMe}
                                    onClick={() => handleResend(u)}
                                    title={isMe ? '不能给自己重发链接' : '重发设置密码链接'}
                                  >
                                    <RotateCw size={12} />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className={`h-7 w-7 ${u.status === 'suspended' ? 'text-green-600' : 'text-amber-600'}`}
                                    disabled={busy || isMe}
                                    onClick={() => handleToggleStatus(u)}
                                    title={
                                      isMe
                                        ? '不能修改自己状态'
                                        : u.status === 'suspended'
                                        ? '解禁此用户'
                                        : '禁用此用户'
                                    }
                                  >
                                    <Power size={12} />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 text-red-600"
                                    disabled={busy || isMe}
                                    onClick={() => setDialog({ kind: 'confirm_delete', user: u })}
                                    title={isMe ? '不能删除自己' : '删除此用户'}
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {dialog.kind === 'confirm_delete' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">确认删除用户?</h2>
                <p className="text-sm text-gray-600 mt-1">
                  将永久删除 <strong className="text-gray-900">{dialog.user.email}</strong>。
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  该用户的登录会话、查询历史关联将一并清理。此操作不可撤销。
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog({ kind: 'none' })}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(dialog.user)}
                disabled={busyUserId === dialog.user.id}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {busyUserId === dialog.user.id ? '删除中…' : '确认删除'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 重发链接结果弹窗 */}
      {dialog.kind === 'resend_result' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <KeyRound size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">新的设置密码链接</h2>
                <p className="text-sm text-gray-600 mt-1">
                  给 <strong>{dialog.result.user.email}</strong> 重发,旧链接已失效。
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Input
                readOnly
                value={dialog.result.set_password_url}
                className="text-xs font-mono"
                onClick={(e) => e.currentTarget.select()}
              />
              <p className="text-xs text-gray-500">
                链接 <strong>{dialog.result.expires_in_hours} 小时</strong>内有效。
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => copyLink(dialog.result.set_password_url, () => setResendCopied(true))}
              >
                {resendCopied ? <><Check size={14} className="mr-1 text-green-600" />已复制</> : <><Copy size={14} className="mr-1" />复制链接</>}
              </Button>
              <Button onClick={() => setDialog({ kind: 'none' })}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}