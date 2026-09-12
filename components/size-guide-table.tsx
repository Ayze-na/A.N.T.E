"use client";

import { cn } from "@/lib/utils";
import type { SizeGuideRow } from "@/lib/database.types";

export function SizeGuideTable({ rows }: { rows: SizeGuideRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="mt-14 rounded-2xl border border-ink-100 bg-[#F2F1F7] p-5 shadow-sm">
      <h2 className="mb-4 text-center text-xl font-black tracking-tight text-[#0C447C]">
        دليل المقاسات
      </h2>
      <p className="mb-4 text-center text-xs text-ink-500">
        اختر المقاس حسب وزن عميلك — لأصحاب الأوزان المتوسطة يفضل المقاس الأصغر الحجم
      </p>
      <div className="mx-auto max-w-md overflow-hidden rounded-lg border border-[#185FA5] bg-white text-sm shadow-sm">
        <div className="grid grid-cols-2 bg-[#185FA5] text-white">
          <div className="py-2.5 text-center text-sm font-bold">الوزن (كجم)</div>
          <div className="py-2.5 text-center text-sm font-bold">المقاس</div>
        </div>
        {rows.map((row, i) => (
          <div
            key={i}
            className={cn(
              "grid grid-cols-2 border-t border-[#D0D5DA]",
              i % 2 === 1 && "bg-[#EDF4FB]",
            )}
          >
            <div className="py-2 text-center text-ink-700">{row.weight}</div>
            <div className="py-2 text-center font-bold text-[#0C2F4A]" dir="ltr">
              {row.size}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}