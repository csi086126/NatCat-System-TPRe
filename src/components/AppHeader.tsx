"use client"

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, LogOut, LogIn, UserCircle2, Loader2, ShieldCheck } from "lucide-react";
import { RegionSelector } from "@/components/RegionSelector";
import { useRegion } from "@/contexts/RegionContext";
import { isModuleActive, platformModules } from "@/config/platformModules";
import { useAuth } from "@/lib/AuthContext";

export default function AppHeader() {
  const pathname = usePathname();
  const { switchRegion } = useRegion();
  const { user, isLoading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  // 防止 SSR/CSR hydration mismatch:useEffect 之后才显示真实 user 状态
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <header className="bg-white shadow-md">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Logo + Home + Region Selector */}
        <div className="flex items-center gap-4">
          <Image src="/taipinglogo.png" alt="China Taiping Logo" width={280} height={31} />
          <Link href="/">
            <Button
              variant={pathname === "/" ? "default" : "outline"}
              className={`gap-2 ${pathname === "/" ? "font-bold" : ""}`}
            >
              <Home size={18} />
              Home
            </Button>
          </Link>
          <RegionSelector />
        </div>
        {/* Right: Module Navigation + User / Logout */}
        <nav className="flex items-center gap-4">
          {platformModules.map((module) => {
            const ModuleIcon = module.icon;

            return (
            <Link href={module.href} key={module.id}>
              <Button
                variant="ghost"
                onClick={() => {
                  if (module.resetRegionOnEnter) {
                    switchRegion("worldwide");
                  }
                }}
                className={`gap-2 ${isModuleActive(pathname, module) ? "text-lg font-bold" : ""}`}
              >
                <ModuleIcon size={18} />
                {module.title}
              </Button>
            </Link>
            );
          })}

          {mounted && (
            <>
              {isLoading ? (
                <Loader2 size={18} className="animate-spin text-gray-400" />
              ) : user ? (
                <>
                  {user.role === 'admin' && (
                    <Link href="/admin/users">
                      <Button variant="outline" className="gap-2">
                        <ShieldCheck size={18} />
                        管理后台
                      </Button>
                    </Link>
                  )}
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    <UserCircle2 size={20} className="text-blue-600" />
                    <span className="font-medium">
                      {user.display_name || user.email}
                    </span>
                    {user.role === "admin" && (
                      <span className="ml-1 text-[10px] uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        admin
                      </span>
                    )}
                  </span>
                  <Button variant="outline" onClick={handleLogout} className="gap-2">
                    <LogOut size={18} />
                    Logout
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button variant="outline" className="gap-2">
                    <LogIn size={18} />
                    Login
                  </Button>
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}