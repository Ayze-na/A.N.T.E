"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HeroRotation } from "@/components/hero-rotation";
import { ProductGrid } from "@/components/product-grid";
import { fetchProducts, fetchSetting } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Product, ProductType } from "@/lib/database.types";

const CATEGORIES: { value: ProductType | "all"; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "scrub-full", label: "كم طويل" },
  { value: "scrub-half", label: "كم قصير" },
  { value: "coat-men", label: "أفرول رجالي" },
  { value: "coat-women", label: "أفرول حريمي" },
];

export function HomeClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [whatsapp, setWhatsapp] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ProductType | "all">("all");

  useEffect(() => {
    (async () => {
      const [prods, setting] = await Promise.all([
        fetchProducts(),
        fetchSetting("whatsapp_number"),
      ]);
      setProducts(prods);
      setWhatsapp(setting?.whatsapp as string | undefined);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      category === "all"
        ? products
        : products.filter((p) => p.type === category),
    [products, category],
  );

  return (
    <>
      <Header />
      <main className="flex-1">
        <HeroRotation />

        <section id="products" className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 flex justify-center">
            <div className="flex flex-wrap justify-center gap-1.5 rounded-full border border-ink-200 bg-white p-1.5 shadow-sm">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "h-9 rounded-full px-4 text-sm font-bold transition",
                    category === cat.value
                      ? "bg-primary-700 text-white shadow"
                      : "text-ink-600 hover:bg-primary-50 hover:text-primary-800",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-2xl bg-ink-100"
                />
              ))}
            </div>
          ) : (
            <ProductGrid products={filtered} />
          )}

          <div className="mt-10 rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center sm:p-8">
            <h3 className="text-lg font-black text-primary-900">
              عايز تشوف كتالوج كامل أو تسأل عن مقاس؟
            </h3>
            <p className="mt-1 text-sm text-primary-700">
              كلمنا على واتساب وهنرد عليك في أسرع وقت
            </p>
            <a
              href={`https://wa.me/${whatsapp || "201000000000"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-6 text-sm font-bold text-white transition hover:bg-green-700"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.5A9.96 9.96 0 1 0 12.04 2Zm5.9 14.07c-.25.7-1.45 1.34-2 1.38-.52.04-1.02.2-3.45-.72-2.92-1.1-4.77-3.98-4.91-4.16-.14-.18-1.17-1.56-1.17-2.98 0-1.41.74-2.11 1-2.4.26-.29.57-.36.76-.36h.55c.17 0 .41-.06.64.5.23.56.8 1.95.87 2.09.07.14.12.3.02.49-.1.18-.14.3-.29.46-.14.18-.3.4-.43.54-.14.14-.29.3-.13.58.16.29.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.17-.18.7-.81.88-1.09.18-.28.37-.24.62-.14.26.1 1.65.78 1.93.92.28.14.47.2.54.32.07.11.07.66-.18 1.31Z" />
              </svg>
              تواصل واتساب
            </a>
          </div>
        </section>
      </main>
      <Footer whatsapp={whatsapp} />
    </>
  );
}