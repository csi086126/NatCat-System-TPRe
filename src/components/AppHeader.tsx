"use client"


import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, Map, Activity, Building2, Puzzle, LogOut } from "lucide-react";
import { RegionSelector } from "@/components/RegionSelector";

const navs = [
  { href: "/riskmap", label: "Risk Map", icon: <Map size={18} /> },
  { href: "/model", label: "Catastrophe Model", icon: <Activity size={18} /> },
  { href: "/asset", label: "Portfolio Management", icon: <Building2 size={18} /> },
  { href: "/fuzhu", label: "Extensions", icon: <Puzzle size={18} /> },
];

export default function AppHeader() {
  const pathname = usePathname();

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
          {navs.map((nav) => (
            <Link href={nav.href} key={nav.href}>
              <Button
                variant="ghost"
                className={`gap-2 ${
                  pathname === nav.href || 
                  (nav.href === "/model" && (pathname === "/oasis" || pathname === "/oasislmf")) // Cat Model includes both models
                    ? "text-lg font-bold" 
                    : ""
                }`}
              >
                {nav.icon}
                {nav.label}
              </Button>
            </Link>
          ))}
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut size={18} />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}
