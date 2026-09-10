"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cart";

export function Header() {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="w-24" aria-hidden />

        <Link
          href="/"
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-700 text-sm font-black text-white">
            A
          </span>
          <span className="text-lg font-black tracking-tight text-primary-800">
            A.N.T.E
          </span>
        </Link>

        <Link
          href="/cart"
          className="relative flex h-11 items-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-bold text-white transition hover:bg-primary-800"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          السلة
          {count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-black text-primary-700">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}