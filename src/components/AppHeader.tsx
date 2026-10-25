"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut, User } from "lucide-react";
import { RegionSelector } from "@/components/RegionSelector";
import { ResponsiveLogo } from "@/components/ResponsiveLogo";
import { isModuleActive, platformModules } from "@/config/platformModules";
import { useRegion } from "@/contexts/RegionContext";
import { useAuth } from "@/lib/AuthContext";

type AppHeaderProps = {
  /** Kept for compatibility with the legacy User Center wrapper. */
  onLogout?: () => void;
  activePage?: string;
};

/**
 * Header visuals migrated from the old platform. Authentication and module
 * definitions still come from the new platform.
 */
export default function AppHeader({ onLogout: legacyLogout }: AppHeaderProps = {}) {
  const pathname = usePathname();
  const { switchRegion } = useRegion();
  const { user, isLoading, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    if (legacyLogout) legacyLogout();
    else window.location.href = "/login";
  };

  return (
    <header className="relative z-[1100] overflow-visible bg-white shadow-md">
      <div className="flex min-w-0 flex-nowrap items-center justify-between gap-2 px-2 py-3 sm:gap-3 sm:px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
          <ResponsiveLogo />
          <RegionSelector />
        </div>

        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1 lg:gap-2 xl:gap-4">
          {platformModules.map((module) => {
            const ModuleIcon = module.icon;
            const active = isModuleActive(pathname, module);

            return (
              <Link
                href={module.href}
                key={module.id}
                onClick={() => {
                  if (module.resetRegionOnEnter) switchRegion("worldwide");
                }}
              >
                <Button
                  variant="ghost"
                  className={`h-9 w-9 shrink-0 gap-2 rounded-none px-0 xl:w-auto xl:px-4 ${
                    active ? "border-b-2 border-blue-600 text-blue-700" : "border-b-2 border-transparent"
                  }`}
                  aria-label={module.title}
                  title={module.title}
                >
                  <ModuleIcon size={18} />
                  <span className="hidden whitespace-nowrap xl:inline">{module.title}</span>
                </Button>
              </Link>
            );
          })}

          {!isLoading && user && (
            <div
              className="group relative"
              onMouseEnter={() => setIsUserMenuOpen(true)}
              onMouseLeave={() => setIsUserMenuOpen(false)}
              onFocus={() => setIsUserMenuOpen(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsUserMenuOpen(false);
              }}
            >
              <Button
                variant="ghost"
                className="h-9 w-9 shrink-0 gap-2 px-0 xl:w-auto xl:px-4"
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                aria-label="User"
                title="User"
              >
                <User size={18} />
                <span className="hidden whitespace-nowrap xl:inline">User</span>
                <ChevronDown size={16} className="hidden transition-transform group-hover:rotate-180 group-focus-within:rotate-180 xl:inline" />
              </Button>
              <div
                role="menu"
                className="invisible absolute right-0 top-full z-[1200] w-44 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
              >
                <div className="rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                  <Link
                    href="/usercenter"
                    role="menuitem"
                    className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <User size={16} />
                    User center
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
