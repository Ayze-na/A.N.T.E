"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cart";

export function Header() {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-[#F2F1F7]/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="w-24" aria-hidden />

        <Link
          href="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <span className="text-lg font-black tracking-tight text-primary-800">
            A.N.T.E
          </span>
        </Link>

        <Link
          href="/cart"
          aria-label="سلة التسوق"
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-ink-300 bg-white/60 text-ink-900 shadow-sm transition hover:border-primary-500 hover:bg-white hover:text-primary-700"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-700 px-1 text-[11px] font-black text-white ring-2 ring-[#F2F1F7]">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}