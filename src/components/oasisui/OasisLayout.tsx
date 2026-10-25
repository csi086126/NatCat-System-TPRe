"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import OasisSidebar from "./OasisSidebar";
import OasisBreadcrumbs from "./OasisBreadcrumbs";
import { useAuth } from "@/lib/AuthContext";

export default function OasisLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const checking = isLoading || !user;

  useEffect(() => {
    if (!isLoading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    return undefined;
  }, [isLoading, pathname, router, user]);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">正在验证平台会话...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <AppHeader />
      <div className="flex flex-col lg:flex-row">
        <OasisSidebar />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <OasisBreadcrumbs />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
