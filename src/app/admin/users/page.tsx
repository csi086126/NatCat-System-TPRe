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
  X, UserPlus,
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

export interface AdminUsersPanelProps {
  /** Render inside User Center without adding another full-page shell. */
  embedded?: boolean;
}

export function AdminUsersPanel({ embedded = false }: AdminUsersPanelProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [showAddUser, setShowAddUser] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Creation result
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);
  const [copied, setCopied] = useState(false);

  // User list
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [search, setSearch] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  // Dialogs
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const [resendCopied, setResendCopied] = useState(false);

  // Redirect non-admin users.
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
        setCreateError(typeof data.detail === 'string' ? data.detail : `Failed to create user (HTTP ${res.status})`);
        return;
      }
      setCreateResult(data);
      // Clear the form for the next user.
      setEmail('');
      setDisplayName('');
      setOrganization('');
      setRole('user');
      // Refresh the list.
      fetchUsers();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Network error');
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
      // Clipboard access may be unavailable in some browsers.
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
        Loading…
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-gray-50 p-6"}>
      <div className={embedded ? "space-y-6" : "max-w-6xl mx-auto space-y-6"}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users size={28} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">User management</h1>
          </div>
          {!showAddUser && (
            <Button type="button" onClick={() => { setCreateError(''); setCreateResult(null); setShowAddUser(true); }}>
              <UserPlus size={16} className="mr-2" />
              Add user
            </Button>
          )}
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

        <div className="space-y-6">
          {showAddUser && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Add user</CardTitle>
                <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>
                  Back to users
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
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
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Jane Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={creating}
                    className="h-11"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    type="text"
                    placeholder="Company or institution"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    disabled={creating}
                    className="h-11"
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
                    disabled={creating}
                    className="w-full h-11 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {createError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{createError}</p>
                  </div>
                )}

                <Button type="submit" className="w-full h-11" disabled={creating}>
                  {creating ? 'Creating…' : 'Create user'}
                </Button>
              </form>

              {/* Show the password setup link after creation. */}
              {createResult && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md space-y-3">
                  <p className="text-sm font-medium text-green-800">
                    ✓ User created: {createResult.user.email}
                  </p>
                  <p className="text-xs text-green-700">
                    Send the password setup link below to the user. The link expires in{' '}
                    <strong>{createResult.expires_in_hours} hours</strong>.
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
                      title="Copy link"
                    >
                      {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {!showAddUser && (
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Input
                  type="search"
                  placeholder="Search email, display name, or organization"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10"
                />

                <div className="border rounded-md max-h-[500px] overflow-y-auto">
                  {loadingList ? (
                    <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
                  ) : users.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">No users found</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium text-gray-600">Email</th>
                          <th className="text-left p-2 font-medium text-gray-600">Organization</th>
                          <th className="text-left p-2 font-medium text-gray-600">Role</th>
                          <th className="text-left p-2 font-medium text-gray-600">Status</th>
                          <th className="text-right p-2 font-medium text-gray-600">Actions</th>
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
                                  <div className="text-[10px] text-blue-600">(you)</div>
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
                                    title={isMe ? 'Cannot resend a link to yourself' : 'Resend password setup link'}
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
                                        ? 'Cannot change your own status'
                                        : u.status === 'suspended'
                                        ? 'Reactivate user'
                                        : 'Suspend user'
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
                                    title={isMe ? 'Cannot delete yourself' : 'Delete user'}
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
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {dialog.kind === 'confirm_delete' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">Delete user?</h2>
                <p className="text-sm text-gray-600 mt-1">
                  This will permanently delete <strong className="text-gray-900">{dialog.user.email}</strong>.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  The user&apos;s sessions and associated query history will also be removed. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog({ kind: 'none' })}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(dialog.user)}
                disabled={busyUserId === dialog.user.id}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {busyUserId === dialog.user.id ? 'Deleting…' : 'Delete user'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resend link result dialog */}
      {dialog.kind === 'resend_result' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <KeyRound size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">New password setup link</h2>
                <p className="text-sm text-gray-600 mt-1">
                  A new link was generated for <strong>{dialog.result.user.email}</strong>. The previous link is no longer valid.
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
                This link expires in <strong>{dialog.result.expires_in_hours} hours</strong>.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => copyLink(dialog.result.set_password_url, () => setResendCopied(true))}
              >
                {resendCopied ? <><Check size={14} className="mr-1 text-green-600" />Copied</> : <><Copy size={14} className="mr-1" />Copy link</>}
              </Button>
              <Button onClick={() => setDialog({ kind: 'none' })}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Backward-compatible standalone admin route. */
export default function AdminUsersPage() {
  return <AdminUsersPanel />;
}
