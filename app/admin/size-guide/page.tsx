"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { fetchSetting } from "@/lib/api";
import { saveSizeGuideRows } from "@/lib/admin";
import { DEFAULT_SIZE_GUIDE_ROWS, SIZE_GUIDE_SETTING_KEY } from "@/lib/constants";
import type { SizeGuideRow } from "@/lib/database.types";

export default function AdminSizeGuidePage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<SizeGuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await fetchSetting(SIZE_GUIDE_SETTING_KEY);
        const stored = Array.isArray((raw as { rows?: unknown } | null)?.rows)
          ? ((raw as { rows: SizeGuideRow[] }).rows).filter(
              (r) => r && typeof r === "object",
            )
          : [];
        setRows(stored.length > 0 ? stored : DEFAULT_SIZE_GUIDE_ROWS);
      } catch {
        setRows(DEFAULT_SIZE_GUIDE_ROWS);
      }
      setLoading(false);
    })();
  }, []);

  const update = useCallback((index: number, patch: Partial<SizeGuideRow>) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }, []);

  const remove = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const add = useCallback(() => {
    setRows((prev) => [...prev, { weight: "", size: "" }]);
  }, []);

  const save = async () => {
    const clean = rows
      .map((r) => ({ weight: r.weight.trim(), size: r.size.trim() }))
      .filter((r) => r.weight || r.size);
    if (clean.length === 0) {
      toast("أضف صفاً واحداً على الأقل", "error");
      return;
    }
    setSaving(true);
    const ok = await saveSizeGuideRows(clean);
    setSaving(false);
    if (ok) {
      toast("تم حفظ دليل المقاسات");
      setRows(clean);
    } else toast("فشل حفظ دليل المقاسات", "error");
  };

  return (
    <AdminShell title="دليل المقاسات">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-ink-500">
          يظهر هذا الجدول في صفحة كل منتج ويساعد العميل على اختيار المقاس حسب الوزن.
        </p>

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-ink-100" />
        ) : (
          <div className="rounded-2xl border border-ink-100 bg-[#F2F1F7] p-4 shadow-sm">
            <div className="mb-3 grid grid-cols-[1fr_1fr_2.5rem] gap-2">
              <div className="text-sm font-bold text-ink-700">الوزن (كجم)</div>
              <div className="text-sm font-bold text-ink-700">المقاس</div>
              <div />
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_2.5rem] gap-2">
                  <Input
                    dir="ltr"
                    placeholder="40 - 50"
                    value={row.weight}
                    onChange={(e) => update(i, { weight: e.target.value })}
                  />
                  <Input
                    dir="ltr"
                    placeholder="S"
                    value={row.size}
                    onChange={(e) => update(i, { size: e.target.value })}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(i)}
                    aria-label="حذف الصف"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={add}>
                + إضافة صف
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={save} loading={saving}>
            حفظ دليل المقاسات
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}