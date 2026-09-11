"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  deleteGalleryImage,
  fetchGalleryImages,
  hasSupabase,
  saveGalleryImage,
} from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import type {
  GalleryImage,
  GalleryOrientation,
} from "@/lib/database.types";

const ORIENTATION_LABELS: Record<GalleryOrientation, string> = {
  square: "مربعة",
  portrait: "طولية",
  landscape: "عرضية",
};

export default function AdminGalleryPage() {
  const { toast } = useToast();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [alt, setAlt] = useState("");
  const [orientation, setOrientation] = useState<GalleryOrientation>("square");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    const rows = await fetchGalleryImages();
    setImages(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const uploadAndAdd = async () => {
    if (!file) return toast("اختر صورة أولاً", "error");
    if (file.size > 5 * 1024 * 1024) return toast("حجم الصورة أكبر من 5MB", "error");
    setAdding(true);
    try {
      let url = "";
      if (hasSupabase()) {
        const supabase = createClient();
        const path = `g-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
        const { error, data } = await supabase.storage
          .from("gallery-images")
          .upload(path, file, { contentType: file.type });
        if (error || !data) return toast("فشل رفع الصورة", "error");
        url = supabase.storage.from("gallery-images").getPublicUrl(path).data.publicUrl;
      } else {
        url = URL.createObjectURL(file);
      }
      const res = await saveGalleryImage({
        image_url: url,
        alt: alt.trim(),
        orientation,
      });
      if (!res.ok) return toast(res.error ?? "فشل الإضافة", "error");
      setAlt("");
      setFile(null);
      toast("تمت إضافة الصورة");
      await load();
    } finally {
      setAdding(false);
    }
  };

  const patch = async (img: GalleryImage, changes: Partial<GalleryImage>) => {
    const res = await saveGalleryImage({ ...img, ...changes });
    if (!res.ok) return toast(res.error ?? "فشل الحفظ", "error");
    setImages((prev) =>
      prev.map((g) => (g.id === img.id ? { ...g, ...changes } : g)),
    );
  };

  const remove = async (img: GalleryImage) => {
    const ok = await deleteGalleryImage(img.id);
    if (!ok) return toast("فشل الحذف", "error");
    setImages((prev) => prev.filter((g) => g.id !== img.id));
    toast("تم حذف الصورة");
  };

  const move = async (img: GalleryImage, dir: -1 | 1) => {
    const sorted = [...images].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((g) => g.id === img.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    const a = sorted[idx];
    const b = swap;
    setImages((prev) =>
      prev.map((g) =>
        g.id === a.id
          ? { ...g, position: b.position }
          : g.id === b.id
            ? { ...g, position: a.position }
            : g,
      ),
    );
    await Promise.all([
      saveGalleryImage({ id: a.id, position: b.position }),
      saveGalleryImage({ id: b.id, position: a.position }),
    ]);
  };

  return (
    <AdminShell title="معرض الصور">
      <div className="mb-6 rounded-2xl border border-ink-100 bg-[#F2F1F7] p-4 shadow-sm">
        <h3 className="mb-3 font-black text-ink-800">إضافة صورة</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-ink-300 bg-white text-sm font-bold text-ink-600 transition hover:border-primary-500 hover:text-primary-700 md:col-span-2">
            {file ? file.name : "اختر صورة من جهازك…"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Input
            dir="rtl"
            placeholder="وصف الصورة (اختياري)"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as GalleryOrientation)}
          >
            {Object.entries(ORIENTATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <div className="sm:col-span-2 flex items-center justify-end">
            <Button onClick={uploadAndAdd} loading={adding}>
              إضافة إلى المعرض
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-ink-100" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <p className="rounded-2xl border border-ink-100 bg-[#F2F1F7] p-10 text-center text-sm text-ink-400">
          لا توجد صور بعد — أضف أول صورة من الأعلى
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[...images]
            .sort((a, b) => a.position - b.position)
            .map((img) => (
              <div
                key={img.id}
                className="overflow-hidden rounded-2xl border border-ink-100 bg-[#F2F1F7] shadow-sm"
              >
                <div
                  className={`w-full overflow-hidden bg-white ${
                    img.orientation === "landscape"
                      ? "aspect-[4/3]"
                      : img.orientation === "portrait"
                        ? "aspect-[3/4]"
                        : "aspect-square"
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt={img.alt || img.image_url}
                    className="h-full w-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
                <div className="space-y-2 p-3">
                  <Select
                    value={img.orientation}
                    onChange={(e) =>
                      patch(img, {
                        orientation: e.target.value as GalleryOrientation,
                      })
                    }
                  >
                    {Object.entries(ORIENTATION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => move(img, -1)}
                        disabled={img.position === 0}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-600 transition hover:bg-ink-200 disabled:opacity-40"
                        title="تحريك لليسار"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => move(img, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-600 transition hover:bg-ink-200"
                        title="تحريك لليمين"
                      >
                        →
                      </button>
                    </div>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-ink-600">
                      <input
                        type="checkbox"
                        checked={img.active}
                        onChange={(e) => patch(img, { active: e.target.checked })}
                      />
                      ظاهر
                    </label>
                  </div>
                  <button
                    onClick={() => remove(img)}
                    className="w-full rounded-lg bg-red-50 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                  >
                    حذف الصورة
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </AdminShell>
  );
}