"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductGrid } from "@/components/product-grid";
import { fetchProducts } from "@/lib/api";
import { PRODUCT_TYPE_OPTIONS } from "@/lib/constants";
import type { Product, ProductType } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export function ProductsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeType = searchParams.get("type") as ProductType | null;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts().then((prods) => {
      setProducts(prods);
      setLoading(false);
    });
  }, []);

  const filtered = activeType
    ? products.filter((p) => p.type === activeType)
    : products;

  const setFilter = (type?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type) params.set("type", type);
    else params.delete("type");
    router.replace(`/products?${params.toString()}`);
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-black text-ink-900 sm:text-3xl">
            المنتجات
          </h1>
          <span className="text-sm font-semibold text-ink-400">
            {loading ? "…" : `${filtered.length} منتج`}
          </span>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <FilterChip active={!activeType} onClick={() => setFilter()}>
            الكل
          </FilterChip>
          {PRODUCT_TYPE_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              active={activeType === opt.value}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </FilterChip>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-2xl bg-ink-100"
              />
            ))}
          </div>
        ) : (
          <ProductGrid products={filtered} />
        )}
      </main>
      <Footer />
    </>
  );
}

function FilterChip({
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
        "h-10 rounded-full px-4 text-sm font-bold transition",
        active
          ? "bg-primary-700 text-white shadow"
          : "border border-ink-200 bg-[#F2F1F7] text-ink-600 hover:border-primary-300 hover:text-primary-700",
      )}
    >
      {children}
    </button>
  );
}