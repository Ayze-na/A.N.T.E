import type { Product } from "@/lib/database.types";
import { ProductCard } from "@/components/product-card";

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 py-16 text-center text-ink-400">
        لا توجد منتجات متاحة حالياً
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}