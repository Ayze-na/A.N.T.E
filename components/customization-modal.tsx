"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { fetchPresetLogos } from "@/lib/api";
import { PRESET_LOGO_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  CustomizationType,
  PresetLogo,
} from "@/lib/database.types";

export type CustomizationState = {
  type: CustomizationType;
  logo_url: string | null;
  preset_id: string | null;
  name_tag_text: string;
};

const MENU_ITEMS = ["upload", "preset", "name"] as const;

export function CustomizationModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (customization: CustomizationState | null) => void;
  initial?: CustomizationState | null;
}) {
  const [activeTab, setActiveTab] = useState<(typeof MENU_ITEMS)[number]>("upload");
  const [presets, setPresets] = useState<PresetLogo[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PresetLogo | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [nameText, setNameText] = useState("");

  useEffect(() => {
    if (open) {
      setNameText(initial?.name_tag_text ?? "");
      setUploadedUrl(
        initial?.type === "uploaded" ? (initial.logo_url ?? null) : null,
      );
      if (initial?.type === "uploaded") {
        setActiveTab("upload");
      } else if (initial?.type === "preset") {
        setActiveTab("preset");
      } else {
        setActiveTab("upload");
        setSelectedPreset(null);
      }
      fetchPresetLogos().then((logos) => {
        setPresets(logos);
        if (initial?.type === "preset" && initial.preset_id) {
          const found =
            logos.find((l) => l.id === initial.preset_id) ??
            ({
              id: initial.preset_id,
              image_url: initial.logo_url ?? "",
              label: "",
              category: "عام",
              active: true,
              created_at: "",
            } as PresetLogo);
          setSelectedPreset(found);
          setCategoryFilter(found.category || "all");
        } else {
          setCategoryFilter("all");
        }
      });
    }
  }, [open, initial]);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedUrl(String(reader.result));
      setUploadFile(file);
    };
    reader.readAsDataURL(file);
  }, []);

  const previewLogo = uploadedUrl ?? selectedPreset?.image_url ?? null;
  const hasAny = Boolean(previewLogo || nameText.trim());

  const save = () => {
    const isUploaded = Boolean(uploadFile || uploadedUrl);
    const result: CustomizationState = {
      type: isUploaded ? "uploaded" : selectedPreset ? "preset" : "none",
      logo_url: isUploaded ? uploadedUrl : null,
      preset_id: isUploaded ? null : (selectedPreset?.id ?? null),
      name_tag_text: nameText.trim(),
    };
    if (result.type === "none" && !nameText.trim()) {
      onSave(null);
    } else {
      onSave(result);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="تخصيص الطلب" size="lg">
      <div className="grid gap-6 sm:grid-cols-[1fr,160px]">
        {/* Preview */}
        <div className="rounded-2xl border border-ink-200 bg-gradient-to-b from-primary-50 to-white p-6">
          <p className="mb-4 text-center text-sm font-bold text-ink-600">
            معاينة الجيب الأمامي
          </p>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[260px] overflow-hidden rounded-xl border border-ink-200 bg-[#F2F1F7] shadow-inner">
            {/* garment backdrop */}
            <div className="absolute inset-0 bg-[#F2F1F7]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-primary-50" />
            {/* pocket */}
            <div className="absolute left-1/2 top-[58%] h-[34%] w-[62%] -translate-x-1/2 rounded-lg border-2 border-ink-200 bg-ink-50" />
            {/* logo */}
            {previewLogo && (
              <Image
                src={previewLogo}
                alt="شعار"
                width={120}
                height={120}
                className="absolute left-1/2 top-[46%] w-[38%] -translate-x-1/2 -translate-y-1/2 object-contain"
              />
            )}
            {/* name */}
            {nameText.trim() && (
              <div
                className="absolute left-1/2 top-[70%] max-w-[80%] -translate-x-1/2 truncate rounded px-1 text-center font-black tracking-wide text-black"
                style={{ fontSize: `${Math.min(20, Math.max(12, 18 - nameText.length * 0.3))}px` }}
              >
                {nameText.trim()}
              </div>
            )}
            {!hasAny && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-ink-400">
                  أضف شعار أو اسم ليظهر هنا
                </span>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-[11px] leading-5 text-ink-400">
            توضيح فقط — يتم وضع الشعار والاسم فعلياً على الجيب أثناء التصنيع
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-row gap-2 sm:flex-col">
          {MENU_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => setActiveTab(item)}
              className={cn(
                "flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:flex-none",
                activeTab === item
                  ? "bg-primary-700 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200",
              )}
            >
              {item === "upload" && "رفع شعار"}
              {item === "preset" && "شعار جاهز"}
              {item === "name" && "اسم"}
            </button>
          ))}
        </div>
      </div>

      {/* Active tab content */}
      <div className="mt-5">
        {activeTab === "upload" && (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-300 bg-ink-50 px-4 py-8 text-center transition hover:border-primary-400 hover:bg-primary-50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary-600">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span className="text-sm font-bold text-ink-700">
              اضغط لاختيار صورة الشعار
            </span>
            <span className="text-xs text-ink-400">
              PNG / JPG / WebP بحد أقصى 5MB
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {uploadedUrl && (
              <span className="text-xs font-bold text-green-600">✓ تم اختيار الشعار</span>
            )}
          </label>
        )}

        {activeTab === "preset" && (
          <>
            {(() => {
              const categories = Array.from(
                new Set(presets.map((p) => p.category).filter(Boolean)),
              ).sort((a, b) => {
                const ia = PRESET_LOGO_CATEGORIES.indexOf(a as never);
                const ib = PRESET_LOGO_CATEGORIES.indexOf(b as never);
                return (
                  (ia === -1 ? PRESET_LOGO_CATEGORIES.length : ia) -
                  (ib === -1 ? PRESET_LOGO_CATEGORIES.length : ib)
                );
              });
              const shown = presets.filter(
                (p) => categoryFilter === "all" || p.category === categoryFilter,
              );
              return (
                <>
                  <label className="mb-2 block text-xs font-bold text-ink-500">
                    اختر من الشعارات الجاهزة
                  </label>
                  {categories.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {["all", ...categories].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setCategoryFilter(cat);
                            setSelectedPreset(null);
                          }}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-bold transition",
                            categoryFilter === cat
                              ? "bg-primary-700 text-white"
                              : "bg-ink-100 text-ink-600 hover:bg-ink-200",
                          )}
                        >
                          {cat === "all" ? "الكل" : cat}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {shown.length === 0 && (
                      <p className="col-span-3 py-6 text-center text-sm text-ink-400">
                        لا توجد شعارات في هذه الفئة
                      </p>
                    )}
                    {shown.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setSelectedPreset(preset);
                          setUploadFile(null);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border-2 bg-[#F2F1F7] p-2 transition",
                          selectedPreset?.id === preset.id
                            ? "border-primary-600 ring-2 ring-primary-200"
                            : "border-ink-200 hover:border-primary-300",
                        )}
                      >
                        <Image
                          src={preset.image_url}
                          alt={preset.label}
                          width={80}
                          height={80}
                          className="h-14 w-14 rounded-lg object-contain"
                        />
                        <span className="text-[11px] font-bold text-ink-600">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
          </>
        )}

        {activeTab === "name" && (
          <div>
            <label className="mb-2 block text-xs font-bold text-ink-500">
              اسم الطبيب أو العيادة (يُطبع بالأسود)
            </label>
            <input
              value={nameText}
              onChange={(e) => setNameText(e.target.value)}
              className="h-12 w-full rounded-xl border border-ink-300 bg-[#F2F1F7] px-4 text-lg font-black text-black focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              placeholder="د. أحمد محمد"
              maxLength={30}
            />
            <p className="mt-1 text-left text-[11px] text-ink-400">
              {nameText.length}/30 حرف
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Button className="flex-1" onClick={save} disabled={!hasAny}>
          حفظ التخصيص
        </Button>
        <Button variant="outline" onClick={onClose}>
          بدون تخصيص
        </Button>
      </div>
    </Modal>
  );
}