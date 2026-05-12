"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "總覽" },
  { href: "/onboarding", label: "個人資料" },
  { href: "/plan", label: "本週菜單" },
  { href: "/plan/shopping", label: "採購清單" },
  { href: "/progress", label: "進度" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="no-print sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold">
          <span className="inline-block h-6 w-6 rounded-lg bg-brand-500" />
          EatPlan
        </Link>
        <div className="flex flex-wrap gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 transition",
                pathname === item.href
                  ? "bg-brand-100 text-brand-700 dark:bg-brand-700/30 dark:text-brand-100"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
