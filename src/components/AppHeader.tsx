"use client"


import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";
import { RegionSelector } from "@/components/RegionSelector";
import { useRegion } from "@/contexts/RegionContext";
import { isModuleActive, platformModules } from "@/config/platformModules";

export default function AppHeader() {
  const pathname = usePathname();
  const { switchRegion } = useRegion();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    window.location.href = "/";
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
        {/* Right: Module Navigation + Logout */}
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
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut size={18} />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}
