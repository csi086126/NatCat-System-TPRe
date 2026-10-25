"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export default function OasisBreadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean).slice(1);
  return (
    <nav className="mb-6 flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
      <Link href="/oasisui" className="inline-flex items-center gap-1 hover:text-blue-600">
        <Home className="h-4 w-4" /> Workbench
      </Link>
      {parts.map((part, index) => {
        const href = `/oasisui/${parts.slice(0, index + 1).join("/")}`;
        return (
          <span className="flex items-center gap-1" key={href}>
            <ChevronRight className="h-4 w-4 text-slate-300" />
            <Link href={href} className="capitalize hover:text-blue-600">{part.replaceAll("-", " ")}</Link>
          </span>
        );
      })}
    </nav>
  );
}
