"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { fetchPresetLogos } from "@/lib/api";
import {
  deleteProductDb,
  fetchAdminProducts,
  saveProduct,
} from "@/lib/admin";
import { PRODUCT_TYPE_OPTIONS, SIZES } from "@/lib/constants";
import { cn, formatPrice, slugify, discountRatio } from "@/lib/utils";
import { hasSupabase } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import type { Product, ProductType, PresetLogo } from "@/lib/database.types";

const COLORS_BY_TYPE: Record<ProductType, string[]> = {
  "scrub-half": ["أسود", "أزرق", "بترولي", "جنزاري", "مارون", "أزرق بيبي"],
  "scrub-full": ["أسود", "أزرق", "بترولي", "جنزاري", "مارون", "أزرق بيبي"],
  "coat-men": ["أبيض"],
  "coat-women": ["أبيض"],
};

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [logos, setLogos] = useState<PresetLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [tab, setTab] = useState<"products" | "logos" | "settings">("products");

  const load = useCallback(async () => {
    setLoading(true);
    const [p, l] = await Promise.all([fetchAdminProducts(), fetchPresetLogos()]);
    setProducts(p);
    setLogos(l);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (p: Product, field: "out_of_stock" | "discount_active") => {
    const ok = await saveProduct({ id: p.id, [field]: !p[field] });
    if (ok) {
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, [field]: !x[field] } : x)),
      );
      toast("تم الحفظ");
    } else toast("فشل الحفظ", "error");
  };

  return (
    <AdminShell title="إدارة المنتجات">
      <div className="mb-5 flex gap-2">
        <TabBtn active={tab === "products"} onClick={() => setTab("products")}>
          المنتجات ({products.length})
        </TabBtn>
        <TabBtn active={tab === "logos"} onClick={() => setTab("logos")}>
          الشعارات الجاهزة ({logos.length})
        </TabBtn>
        <TabBtn active={tab === "settings"} onClick={() => setTab("settings")}>
          الإعدادات
        </TabBtn>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-ink-100" />
          ))}
        </div>
      ) : tab === "products" ? (
        <>
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setEditing("new")}>+ إضافة منتج</Button>
          </div>
          <div className="space-y-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink-100 bg-[#F2F1F7] p-3 shadow-sm"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-50">
                  {p.image_urls[0] ? (
                    <Image src={p.image_urls[0]} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-300">+</div>
                  )}
                </div>
                <div className="min-w-40 flex-1">
                  <p className="font-bold text-ink-900">{p.name}</p>
                  <p className="text-xs text-ink-400">
                    {PRODUCT_TYPE_OPTIONS.find((t) => t.value === p.type)?.label} •{" "}
                    {formatPrice(discountRatio(p))}
                    {p.discount_active && (
                      <span className="text-red-600"> ({p.discount_percentage}%)</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Toggle
                    label="نفاد"
                    on={p.out_of_stock}
                    onClick={() => toggle(p, "out_of_stock")}
                    danger
                  />
                  <Toggle
                    label="خصم"
                    on={p.discount_active}
                    onClick={() => toggle(p, "discount_active")}
                  />
                  <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDelete(p)}
                  >
                    حذف
                  </Button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <p className="rounded-2xl border border-dashed border-ink-200 py-12 text-center text-ink-400">
                لا توجد منتجات — أضف أول منتج
              </p>
            )}
          </div>
        </>
      ) : tab === "logos" ? (
        <PresetLogosSection
          logos={logos}
          onChange={setLogos}
          onToast={toast}
          notify={load}
        />
      ) : (
        <SettingsSection onToast={toast} />
      )}

      {editing && (
        <ProductFormModal
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            toast("تم حفظ المنتج");
          }}
        />
      )}

      {confirmDelete && (
        <Modal
          open
          onClose={() => setConfirmDelete(null)}
          title="حذف المنتج؟"
          size="sm"
        >
          <p className="text-sm text-ink-600">
            سيتم حذف «{confirmDelete.name}» نهائياً. هل أنت متأكد؟
          </p>
          <div className="mt-5 flex gap-3">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={async () => {
                await deleteProductDb(confirmDelete.id);
                setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id));
                setConfirmDelete(null);
                toast("تم حذف المنتج");
              }}
            >
              حذف
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>
              إلغاء
            </Button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-10 rounded-xl px-4 text-sm font-bold transition",
        active ? "bg-primary-700 text-white" : "bg-[#F2F1F7] text-ink-600 border border-ink-200",
      )}
    >
      {children}
    </button>
  );
}

function Toggle({
  label,
  on,
  onClick,
  danger,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition",
        on
          ? danger
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-primary-200 bg-primary-50 text-primary-700"
          : "border-ink-200 bg-[#F2F1F7] text-ink-400",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          on ? (danger ? "bg-red-500" : "bg-primary-500") : "bg-ink-300",
        )}
      />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------- Product form

function ProductFormModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: product?.name ?? "",
    type: (product?.type ?? "scrub-half") as ProductType,
    description: product?.description ?? "",
    price: product?.price ?? 0,
    colors: product?.colors ?? [],
    sizes: product?.sizes ?? [],
    image_urls: product?.image_urls ?? [],
    customization_enabled: product?.customization_enabled ?? true,
    out_of_stock: product?.out_of_stock ?? false,
    discount_active: product?.discount_active ?? false,
    discount_percentage: product?.discount_percentage ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [imageInput, setImageInput] = useState("");
  const [error, setError] = useState("");

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const availableColors = useMemo(
    () => COLORS_BY_TYPE[form.type] ?? [],
    [form.type],
  );

  const toggleColor = (color: string) =>
    set(
      "colors",
      form.colors.includes(color)
        ? form.colors.filter((c) => c !== color)
        : [...form.colors, color],
    );

  const toggleSize = (size: string) =>
    set(
      "sizes",
      form.sizes.includes(size)
        ? form.sizes.filter((s) => s !== size)
        : [...form.sizes, size],
    );

  const uploadImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast("حجم الصورة أكبر من 5MB", "error");
      return;
    }
    if (hasSupabase()) {
      const supabase = createClient();
      const path = `p-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
      const { error, data } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type });
      if (error || !data) {
        toast("فشل رفع الصورة", "error");
        return;
      }
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      set("image_urls", [...form.image_urls, pub.publicUrl]);
    } else {
      const reader = new FileReader();
      reader.onload = () =>
        set("image_urls", [...form.image_urls, String(reader.result)]);
      reader.readAsDataURL(file);
    }
  };

  const submit = async () => {
    setError("");
    if (!form.name.trim()) return setError("اسم المنتج مطلوب");
    if (form.price <= 0) return setError("السعر مطلوب");
    if (form.image_urls.length === 0) return setError("أضف صورة واحدة على الأقل");
    setSaving(true);
    const name = form.name.trim();
    const res = await saveProduct({
      id: product?.id,
      name,
      type: form.type,
      description: form.description,
      price: form.price,
      colors: form.colors.length ? form.colors : availableColors,
      sizes: form.sizes,
      image_urls: form.image_urls,
      customization_enabled: form.customization_enabled,
      out_of_stock: form.out_of_stock,
      discount_active: form.discount_active,
      discount_percentage: Math.min(100, Math.max(0, form.discount_percentage)),
      ...(product?.id ? {} : { slug: slugify(name) }),
    });
    setSaving(false);
    if (!res.ok) {
      toast(res.error ?? "فشل الحفظ", "error");
      return;
    }
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? "تعديل المنتج" : "منتج جديد"}
      size="lg"
    >
      <div className="space-y-4">
        <Input
          label="اسم المنتج"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="مثال: اسكراب طبي كم طويل — أزرق"
        />

        <Select
          label="النوع"
          value={form.type}
          onChange={(e) => {
            const type = e.target.value as ProductType;
            set("type", type);
            set("colors", COLORS_BY_TYPE[type][0] ? [COLORS_BY_TYPE[type][0]] : []);
          }}
        >
          {PRODUCT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Textarea
          label="الوصف"
          rows={2}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Input
            label="السعر (ج.م)"
            type="number"
            dir="ltr"
            value={form.price || ""}
            onChange={(e) => set("price", Number(e.target.value))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-700">
              نسبة الخصم (٪)
            </label>
            <input
              type="number"
              dir="ltr"
              className="h-11 w-full rounded-xl border border-ink-300 bg-[#F2F1F7] px-3.5 text-sm disabled:opacity-40"
              value={form.discount_active ? form.discount_percentage || "" : ""}
              disabled={!form.discount_active}
              onChange={(e) =>
                set("discount_percentage", Number(e.target.value))
              }
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
              <input
                type="checkbox"
                checked={form.discount_active}
                onChange={(e) => set("discount_active", e.target.checked)}
                className="h-4 w-4 accent-primary-700"
              />
              خصم مفعّل
            </label>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink-700">الألوان المتاحة</p>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((c) => (
              <button
                key={c}
                onClick={() => toggleColor(c)}
                className={cn(
                  "h-9 rounded-xl border px-3 text-xs font-bold transition",
                  form.colors.includes(c)
                    ? "border-primary-600 bg-primary-700 text-white"
                    : "border-ink-200 bg-[#F2F1F7] text-ink-600",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink-700">المقاسات</p>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => toggleSize(s)}
                className={cn(
                  "h-10 min-w-10 rounded-xl border px-2.5 text-sm font-black transition",
                  form.sizes.includes(s)
                    ? "border-primary-600 bg-primary-700 text-white"
                    : "border-ink-200 bg-[#F2F1F7] text-ink-600",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink-700">الصور</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {form.image_urls.map((url, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg bg-ink-50">
                <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                <button
                  onClick={() =>
                    set(
                      "image_urls",
                      form.image_urls.filter((_, idx) => idx !== i),
                    )
                  }
                  className="absolute left-0 top-0 bg-ink-900/70 px-1 text-[10px] font-bold text-white"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              dir="ltr"
              placeholder="أو ألصق رابط صورة https://..."
              value={imageInput}
              onChange={(e) => setImageInput(e.target.value)}
              className="h-11 min-w-52 flex-1 rounded-xl border border-ink-300 bg-[#F2F1F7] px-3.5 text-sm"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (imageInput.trim()) {
                  set("image_urls", [...form.image_urls, imageInput.trim()]);
                  setImageInput("");
                }
              }}
            >
              إضافة الرابط
            </Button>
            <label className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-lg bg-ink-100 px-3 text-xs font-bold text-ink-700 hover:bg-ink-200">
              رفع ملف
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                }}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
            <input
              type="checkbox"
              checked={form.customization_enabled}
              onChange={(e) => set("customization_enabled", e.target.checked)}
              className="h-4 w-4 accent-primary-700"
            />
            التخصيص مفعّل
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
            <input
              type="checkbox"
              checked={form.out_of_stock}
              onChange={(e) => set("out_of_stock", e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            غير متوفر
          </label>
        </div>

        {error && <p className="text-xs font-bold text-red-600">{error}</p>}
      </div>

      <div className="mt-6 flex gap-3">
        <Button className="flex-1" onClick={submit} loading={saving}>
          حفظ
        </Button>
        <Button variant="outline" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Preset logos

function PresetLogosSection({
  logos,
  onChange,
  onToast,
  notify,
}: {
  logos: PresetLogo[];
  onChange: (l: PresetLogo[]) => void;
  onToast: ReturnType<typeof useToast>["toast"];
  notify: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const addLogo = async () => {
    if (!label.trim() || !imageUrl.trim()) {
      onToast("أكمل الاسم والصورة", "error");
      return;
    }
    setBusy(true);
    let url = imageUrl.trim();
    if (hasSupabase()) {
      // If pasted as data URL, upload to preset-logos bucket
      if (url.startsWith("data:")) {
        const blob = await (await fetch(url)).blob();
        const supabase = createClient();
        const path = `preset-${Date.now()}.png`;
        const { error, data } = await supabase.storage
          .from("preset-logos")
          .upload(path, blob, { contentType: "image/png" });
        if (error || !data) {
          onToast("فشل رفع الشعار", "error");
          setBusy(false);
          return;
        }
        url = supabase.storage.from("preset-logos").getPublicUrl(path).data.publicUrl;
      }
    }
    const logo: PresetLogo = {
      id: `logo-${Date.now()}`,
      image_url: url,
      label: label.trim(),
      active: true,
      created_at: new Date().toISOString(),
    };
    if (hasSupabase()) {
      const supabase = createClient();
      const { error } = await supabase
        .from("preset_logos")
        .insert({ image_url: url, label: label.trim(), active: true });
      if (error) {
        onToast("فشل الحفظ", "error");
        setBusy(false);
        return;
      }
    }
    onChange([...logos, logo]);
    setLabel("");
    setImageUrl("");
    setAdding(false);
    setBusy(false);
    onToast("تمت إضافة الشعار");
    notify();
  };

  const removeLogo = async (id: string) => {
    if (hasSupabase()) {
      const supabase = createClient();
      await supabase.from("preset_logos").delete().eq("id", id);
    }
    onChange(logos.filter((l) => l.id !== id));
    onToast("تم الحذف");
    notify();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setAdding(true)}>+ إضافة شعار</Button>
      </div>
      {adding && (
        <div className="mb-4 rounded-2xl border border-primary-200 bg-primary-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="اسم الشعار" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Input
              label="رابط الصورة"
              dir="ltr"
              placeholder="https://... أو ارفع ملف"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={addLogo} loading={busy}>
              إضافة
            </Button>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-[#F2F1F7] px-3 text-xs font-bold text-ink-600 border border-ink-200">
              رفع ملف
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size <= 5 * 1024 * 1024) {
                    const reader = new FileReader();
                    reader.onload = () => setImageUrl(String(reader.result));
                    reader.readAsDataURL(f);
                  }
                }}
              />
            </label>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {logos.map((logo) => (
          <div
            key={logo.id}
            className="flex flex-col items-center gap-2 rounded-2xl border border-ink-100 bg-[#F2F1F7] p-4 shadow-sm"
          >
            <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-ink-50">
              <Image
                src={logo.image_url.startsWith("data:") ? logo.image_url : logo.image_url}
                alt={logo.label}
                fill
                sizes="80px"
                className="object-contain p-1"
              />
            </div>
            <p className="text-sm font-bold text-ink-700">{logo.label}</p>
            {!logo.active && <Badge>غير مفعل</Badge>}
            <Button variant="destructive" size="sm" onClick={() => removeLogo(logo.id)}>
              حذف
            </Button>
          </div>
        ))}
        {logos.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-ink-200 py-10 text-center text-ink-400">
            لا توجد شعارات جاهزة
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Settings

function SettingsSection({ onToast }: { onToast: ReturnType<typeof useToast>["toast"] }) {
  const [form, setForm] = useState({
    whatsapp_number: "",
    instapay_phone: "",
    instapay_holder: "",
    orange_phone: "",
    orange_holder: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { fetchStoreSettings } = await import("@/lib/admin");
      const s = await fetchStoreSettings();
      setForm({
        whatsapp_number: s.whatsapp_number,
        instapay_phone: s.instapay_phone,
        instapay_holder: s.instapay_holder,
        orange_phone: s.orange_phone,
        orange_holder: s.orange_holder,
      });
      setLoaded(true);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { saveStoreSettings } = await import("@/lib/admin");
    await saveStoreSettings(form);
    setSaving(false);
    onToast("تم حفظ الإعدادات");
  };

  if (!loaded) return <div className="h-40 animate-pulse rounded-2xl bg-ink-100" />;

  return (
    <div className="max-w-2xl space-y-4 rounded-2xl border border-ink-100 bg-[#F2F1F7] p-5 shadow-sm">
      <div>
        <h3 className="mb-3 font-black text-ink-800">رقم الواتساب</h3>
        <Input
          label="رقم الواتساب (بصيغة دولية بدون +)"
          dir="ltr"
          value={form.whatsapp_number}
          onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
          placeholder="201000000000"
        />
      </div>
      <div className="border-t border-ink-100 pt-4">
        <h3 className="mb-3 font-black text-ink-800">إنستاباي InstaPay</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="رقم الهاتف"
            dir="ltr"
            value={form.instapay_phone}
            onChange={(e) => setForm({ ...form, instapay_phone: e.target.value })}
          />
          <Input
            label="اسم الحساب"
            value={form.instapay_holder}
            onChange={(e) => setForm({ ...form, instapay_holder: e.target.value })}
          />
        </div>
      </div>
      <div className="border-t border-ink-100 pt-4">
        <h3 className="mb-3 font-black text-ink-800">أورنج كاش Orange Cash</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="رقم الهاتف"
            dir="ltr"
            value={form.orange_phone}
            onChange={(e) => setForm({ ...form, orange_phone: e.target.value })}
          />
          <Input
            label="اسم الحساب"
            value={form.orange_holder}
            onChange={(e) => setForm({ ...form, orange_holder: e.target.value })}
          />
        </div>
      </div>
      <Button onClick={save} loading={saving}>
        حفظ الإعدادات
      </Button>
    </div>
  );
}