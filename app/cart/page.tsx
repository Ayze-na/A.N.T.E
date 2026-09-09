"use client";

import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { DEPOSIT_PERCENTAGE } from "@/lib/constants";
import { useState } from "react";
import {
  CustomizationModal,
  type CustomizationState,
} from "@/components/customization-modal";
import { useToast } from "@/components/ui/toast";

export default function CartPage() {
  const { items, setQuantity, removeItem, updateCustomization } = useCartStore();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editCustom, setEditCustom] = useState<CustomizationState | null>(null);
  const { toast } = useToast();

  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const deposit = Math.round(subtotal * DEPOSIT_PERCENTAGE);
  const remaining = subtotal - deposit;

  const openEdit = (key: string) => {
    const item = items.find((i) => i.key === key);
    if (!item || !item.customization) return;
    setEditCustom(item.customization);
    setEditKey(key);
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-2xl font-black text-ink-900 sm:text-3xl">
          سلة المشتريات
        </h1>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 py-20 text-center">
            <p className="text-lg font-bold text-ink-400">سلتك فارغة</p>
            <Link
              href="/products"
              className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800"
            >
              تصفح المنتجات
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
            {/* Items */}
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="flex gap-4 rounded-2xl border border-ink-100 bg-white p-3 shadow-sm"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-50">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-ink-300">+</div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/products/${item.productId}`}
                          className="font-bold text-ink-900 hover:text-primary-700"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {[item.color, item.size].filter(Boolean).join(" — ")}
                        </p>
                        {item.customization && (
                          <button
                            onClick={() => openEdit(item.key)}
                            className="mt-1 rounded-lg bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-700 hover:bg-primary-100"
                          >
                            ✎ {item.customization.name_tag_text || "شعار"}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.key)}
                        className="text-ink-400 hover:text-red-600"
                        aria-label="حذف"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center rounded-lg border border-ink-200">
                        <button
                          className="h-8 w-8 font-black text-primary-700 disabled:opacity-30"
                          onClick={() => setQuantity(item.key, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-black">
                          {item.quantity}
                        </span>
                        <button
                          className="h-8 w-8 font-black text-primary-700"
                          onClick={() => setQuantity(item.key, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <span className="font-black text-primary-800">
                        {formatPrice(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <aside className="h-fit rounded-2xl border border-ink-100 bg-ink-50 p-5">
              <h2 className="font-black text-ink-900">ملخص الطلب</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-500">المجموع الفرعي</dt>
                  <dd className="font-bold">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">الشحن</dt>
                  <dd className="font-bold text-green-600">مجاني</dd>
                </div>
                <div className="flex justify-between border-t border-ink-200 pt-2">
                  <dt className="text-ink-500">دفعة مقدمة ({DEPOSIT_PERCENTAGE * 100}%)</dt>
                  <dd className="font-bold text-primary-700">{formatPrice(deposit)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">الباقي عند الاستلام</dt>
                  <dd className="font-bold">{formatPrice(remaining)}</dd>
                </div>
              </dl>
              <Link
                href="/checkout"
                className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-primary-700 px-6 text-sm font-bold text-white transition hover:bg-primary-800"
              >
                إتمام الطلب
              </Link>
            </aside>
          </div>
        )}
      </main>

      <CustomizationModal
        open={Boolean(editKey)}
        onClose={() => setEditKey(null)}
        onSave={(c) => {
          if (editKey) updateCustomization(editKey, c ?? undefined);
          setEditKey(null);
          toast("تم تحديث التخصيص");
        }}
        initial={editCustom?.type === "none" ? null : editCustom}
      />
      <Footer />
    </>
  );
}