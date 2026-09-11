"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "لوحة التحكم", icon: "M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z" },
  { href: "/admin/orders", label: "الطلبات", icon: "M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4z" },
  { href: "/admin/products", label: "المنتجات", icon: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" },
  { href: "/admin/gallery", label: "معرض الصور", icon: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm6.5 3.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM6 17l3.5-4.5 3 3.5L16 12l4.5 5.5z" },
];

export function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    document.cookie = "ante_admin_session=; Max-Age=0; path=/";
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
    ) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        await createClient().auth.signOut();
      } catch {
        /* ignore */
      }
    }
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-ink-50 md:flex-row">
      <aside className="border-b border-ink-200 bg-[#F2F1F7] md:w-60 md:border-b-0 md:border-l">
        <div className="flex items-center justify-between gap-2 px-4 py-4 md:block">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-700 text-sm font-black text-white">
              A
            </span>
            <span className="font-black text-primary-800">A.N.T.E</span>
          </Link>
          <button
            onClick={signOut}
            className="rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-bold text-ink-600 hover:bg-ink-200 md:mt-4"
          >
            تسجيل الخروج
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {NAV.map((item) => {
            const active = pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                  active
                    ? "bg-primary-700 text-white"
                    : "text-ink-600 hover:bg-ink-100",
                )}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8">
        <h1 className="mb-6 text-2xl font-black text-ink-900">{title}</h1>
        {children}
      </main>
    </div>
  );
}