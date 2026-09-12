"use client";

import { useState } from "react";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useCartStore } from "@/store/cart";
import {
  CustomizationModal,
  type CustomizationState,
} from "@/components/customization-modal";
import { PRODUCT_TYPES } from "@/lib/constants";
import { cn, discountRatio, formatPrice } from "@/lib/utils";
import type { Product, SizeGuideRow } from "@/lib/database.types";
import { SizeGuideTable } from "@/components/size-guide-table";

export function ProductDetailClient({
  product,
  sizeGuideRows,
}: {
  product: Product;
  sizeGuideRows: SizeGuideRow[];
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(
    product.colors.length === 1 ? product.colors[0] : null,
  );
  const [quantity, setQuantity] = useState(1);
  const [multiMode, setMultiMode] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [customization, setCustomization] = useState<CustomizationState | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const { toast } = useToast();

  const price = discountRatio(product);
  const hasDiscount = product.discount_active && product.discount_percentage > 0;
  const canOrder = !product.out_of_stock;

  const addToCart = () => {
    if (!product) return;

    if (multiMode) {
      const picks = product.sizes.filter((s) => (counts[s] ?? 0) > 0);
      if (picks.length === 0) {
        toast("حدد عدداً لمقاس واحد على الأقل", "error");
        return;
      }
      picks.forEach((s) =>
        addItem({
          productId: product.id,
          name: product.name,
          image_url: product.image_urls[0] ?? "",
          size: s,
          color: color ?? "",
          quantity: counts[s],
          unit_price: price,
          customization: customization ?? undefined,
        }),
      );
      setCounts({});
      toast(
        picks.length === 1
          ? "تمت إضافة المنتج إلى السلة 🛒"
          : `تمت إضافة ${picks.length} مقاسات إلى السلة 🛒`,
      );
      return;
    }

    if (!size) {
      toast("من فضلك اختار المقاس أولاً", "error");
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      image_url: product.image_urls[0] ?? "",
      size,
      color: color ?? "",
      quantity,
      unit_price: price,
      customization: customization ?? undefined,
    });
    toast("تمت إضافة المنتج إلى السلة 🛒");
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <div
              className="relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-ink-100 bg-ink-50"
              onClick={() => product.image_urls.length > 0 && setZoomOpen(true)}
            >
              {product.image_urls[imageIndex] ? (
                <Image
                  src={product.image_urls[imageIndex]}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-ink-300">
                  لا توجد صورة
                </div>
              )}
              {hasDiscount && (
                <span className="absolute right-3 top-3 rounded-full bg-red-600 px-3 py-1 text-sm font-black text-white">
                  خصم {product.discount_percentage}%
                </span>
              )}
            </div>
            {product.image_urls.length > 1 && (
              <div className="mt-3 flex gap-2">
                {product.image_urls.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setImageIndex(i)}
                    className={cn(
                      "relative h-20 w-20 overflow-hidden rounded-xl border-2 bg-ink-50 transition",
                      i === imageIndex
                        ? "border-primary-600"
                        : "border-transparent opacity-70 hover:opacity-100",
                    )}
                  >
                    <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <Badge className="bg-primary-50 text-primary-700">
              {PRODUCT_TYPES[product.type].label} — {product.fabric}
            </Badge>
            <h1 className="mt-3 text-2xl font-black text-ink-900 sm:text-3xl">
              {product.name}
            </h1>

            {product.description && (
              <p className="mt-2 text-sm leading-6 text-ink-500">
                {product.description}
              </p>
            )}

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-black text-primary-800">
                {formatPrice(price, product.currency)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg font-semibold text-ink-400 line-through">
                    {formatPrice(product.price, product.currency)}
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    وفّر {formatPrice(product.price - price, product.currency)}
                  </span>
                </>
              )}
            </div>

            {product.out_of_stock && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                هذا المنتج غير متوفر حالياً
              </div>
            )}

            <div className="mt-6 space-y-5">
              {/* Colors */}
              {product.colors.length > 1 && (
                <div>
                  <p className="mb-2 text-sm font-bold text-ink-700">اللون</p>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={cn(
                          "h-10 rounded-xl border px-4 text-sm font-bold transition",
                          color === c
                            ? "border-primary-600 bg-primary-700 text-white"
                            : "border-ink-200 bg-[#F2F1F7] text-ink-700 hover:border-primary-300",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sizes */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-ink-700">المقاس</p>
                  {product.sizes.length > 1 && (
                    <div className="flex overflow-hidden rounded-lg border border-ink-200 text-xs font-bold">
                      <button
                        onClick={() => setMultiMode(false)}
                        className={cn(
                          "px-3 py-1.5 transition",
                          !multiMode
                            ? "bg-primary-700 text-white"
                            : "bg-[#F2F1F7] text-ink-500",
                        )}
                      >
                        واحد
                      </button>
                      <button
                        onClick={() => setMultiMode(true)}
                        className={cn(
                          "px-3 py-1.5 transition",
                          multiMode
                            ? "bg-primary-700 text-white"
                            : "bg-[#F2F1F7] text-ink-500",
                        )}
                      >
                        متعدد
                      </button>
                    </div>
                  )}
                </div>

                {multiMode ? (
                  <div className="space-y-2">
                    {product.sizes.length === 0 ? (
                      <span className="text-sm text-ink-400">مقاس واحد</span>
                    ) : (
                      product.sizes.map((s) => (
                        <div
                          key={s}
                          className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-[#F2F1F7] px-3 py-1.5"
                        >
                          <span className="text-sm font-black text-ink-700">{s}</span>
                          <div className="inline-flex items-center rounded-lg border border-ink-200 bg-white">
                            <button
                              className="h-8 w-8 font-black text-primary-700 disabled:opacity-30"
                              onClick={() =>
                                setCounts((c) => ({
                                  ...c,
                                  [s]: Math.max(0, (c[s] ?? 0) - 1),
                                }))
                              }
                              disabled={(counts[s] ?? 0) <= 0}
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm font-black">
                              {counts[s] ?? 0}
                            </span>
                            <button
                              className="h-8 w-8 font-black text-primary-700"
                              onClick={() =>
                                setCounts((c) => ({ ...c, [s]: (c[s] ?? 0) + 1 }))
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    {product.sizes.length > 0 && (
                      <p className="text-[11px] leading-5 text-ink-400">
                        حدد عدداً لكل مقاس — ستُضاف كل مجموعة إلى السلة بمقاسها
                        الخاص.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.length === 0 ? (
                      <span className="text-sm text-ink-400">مقاس واحد</span>
                    ) : (
                      product.sizes.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSize(s)}
                          className={cn(
                            "h-11 min-w-12 rounded-xl border px-3 text-sm font-black transition",
                            size === s
                              ? "border-primary-600 bg-primary-700 text-white"
                              : "border-ink-200 bg-[#F2F1F7] text-ink-700 hover:border-primary-300",
                          )}
                        >
                          {s}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Quantity */}
              {!multiMode && (
                <div>
                  <p className="mb-2 text-sm font-bold text-ink-700">الكمية</p>
                  <div className="inline-flex items-center rounded-xl border border-ink-200">
                    <button
                      className="h-11 w-11 text-lg font-black text-primary-700 disabled:opacity-30"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      −
                    </button>
                    <span className="w-12 text-center text-lg font-black">{quantity}</span>
                    <button
                      className="h-11 w-11 text-lg font-black text-primary-700"
                      onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Customization */}
              {product.customization_enabled && (
                <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-primary-900">تخصيص (اختياري)</p>
                      <p className="text-xs text-primary-700">
                        {customization
                          ? `✓ ${customization.name_tag_text || "شعار"}`
                          : "أضف شعار على الجيب واسم"} — بدون أي رسوم إضافية
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomizeOpen(true)}
                      className="bg-[#F2F1F7]"
                    >
                      {customization ? "تعديل التخصيص" : "تخصيص"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <Button size="lg" onClick={addToCart} disabled={!canOrder}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                  أضف إلى السلة
                </Button>
                {!canOrder && (
                  <p className="text-center text-sm font-bold text-red-600">
                    غير متوفر حالياً — تواصل معنا واتساب للمعاينة
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <SizeGuideTable rows={sizeGuideRows} />
      </main>

      <CustomizationModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        onSave={(c) => setCustomization(c)}
      />

      {/* Zoom lightbox */}
      {zoomOpen && product.image_urls[imageIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur-sm"
          onClick={() => setZoomOpen(false)}
        >
          <div className="relative aspect-square w-full max-w-2xl overflow-hidden rounded-2xl">
            <Image
              src={product.image_urls[imageIndex]}
              alt={product.name}
              fill
              sizes="(max-width: 700px) 100vw, 672px"
              className="object-contain"
            />
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}