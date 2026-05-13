"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { pullFromSupabase, pushToSupabase } from "@/lib/supabase/sync";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "總覽" },
  { href: "/phases", label: "月計畫" },
  { href: "/plan", label: "本週菜單" },
  { href: "/plan/shopping", label: "採購清單" },
  { href: "/recipes", label: "食譜庫" },
  { href: "/progress", label: "進度" },
  { href: "/settings", label: "設定" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === "SIGNED_IN" && currentUser) {
          setSyncing(true);
          try {
            await pullFromSupabase(supabase);
            await pushToSupabase(supabase);
          } finally {
            setSyncing(false);
          }
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  }

  return (
    <nav className="no-print sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-y-2 gap-x-1">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold mr-3">
            <span className="inline-block h-5 w-5 rounded-lg bg-brand-500" />
            EatPlan
          </Link>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm transition",
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href) && item.href.length > 1)
                  ? "bg-brand-100 text-brand-700 dark:bg-brand-700/30 dark:text-brand-100"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
              )}
            >
              {item.label}
            </Link>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {syncing && (
              <span className="text-xs text-gray-400 animate-pulse">同步中…</span>
            )}
            {supabase ? (
              user ? (
                <>
                  <span className="hidden sm:block text-xs text-gray-500 truncate max-w-[140px]">
                    {user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="rounded-md px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                  >
                    登出
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm transition",
                    pathname === "/login"
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-700/30 dark:text-brand-100"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                  )}
                >
                  登入
                </Link>
              )
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
