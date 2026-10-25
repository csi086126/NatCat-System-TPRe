"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardList, LayoutDashboard, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/oasisui", label: "Workbench", icon: LayoutDashboard },
  { href: "/oasisui/portfolios", label: "Portfolios", icon: Boxes },
  { href: "/oasisui/models", label: "Models", icon: Settings2 },
  { href: "/oasisui/analyses", label: "Analyses", icon: ClipboardList },
];

export default function OasisSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-full shrink-0 border-b bg-white/90 p-3 lg:min-h-[calc(100vh-73px)] lg:w-60 lg:border-b-0 lg:border-r lg:p-4">
      <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:block">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/oasisui" && pathname.startsWith(`${href}/`));
          return (
            <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", active ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-blue-600")}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
