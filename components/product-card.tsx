import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/database.types";
import { PRODUCT_TYPES } from "@/lib/constants";
import { discountRatio, formatPrice } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const price = discountRatio(product);
  const hasDiscount = product.discount_active && product.discount_percentage > 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-ink-50">
        {product.image_urls[0] ? (
          <Image
            src={product.image_urls[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3h18v18H3z" />
            </svg>
          </div>
        )}
        {hasDiscount && (
          <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white shadow">
            خصم {product.discount_percentage}%
          </span>
        )}
        {product.out_of_stock && (
          <span className="absolute left-3 top-3 rounded-full bg-ink-700 px-2.5 py-1 text-xs font-black text-white">
            غير متوفر
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-xs font-semibold text-primary-600">
          {PRODUCT_TYPES[product.type].label}
        </span>
        <h3 className="font-bold leading-snug text-ink-900 group-hover:text-primary-700">
          {product.name}
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-lg font-black text-primary-800">
            {formatPrice(price, product.currency)}
          </span>
          {hasDiscount && (
            <span className="text-sm font-semibold text-ink-400 line-through">
              {formatPrice(product.price, product.currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}