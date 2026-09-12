import { ProductDetailClient } from "@/components/product-detail-client";
import { fetchProductById, fetchSetting } from "@/lib/api";
import { DEFAULT_SIZE_GUIDE_ROWS, SIZE_GUIDE_SETTING_KEY } from "@/lib/constants";
import type { SizeGuideRow } from "@/lib/database.types";
import { notFound } from "next/navigation";

export const metadata = {
  title: "تفاصيل المنتج",
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = rawSlug;
  }
  let product;
  try {
    product = await fetchProductById(slug);
  } catch {
    product = null;
  }
  if (!product) notFound();

  let sizeGuideRows: SizeGuideRow[] = DEFAULT_SIZE_GUIDE_ROWS;
  try {
    const raw = await fetchSetting(SIZE_GUIDE_SETTING_KEY);
    const stored = Array.isArray((raw as { rows?: unknown } | null)?.rows)
      ? ((raw as { rows: SizeGuideRow[] }).rows)
      : null;
    if (stored && stored.length > 0) {
      sizeGuideRows = stored
        .filter(
          (r) =>
            r && typeof r.weight === "string" && typeof r.size === "string",
        )
        .slice(0, 20);
    }
  } catch {
    /* keep defaults */
  }

  return (
    <ProductDetailClient
      product={{
        ...product,
      }}
      sizeGuideRows={sizeGuideRows}
    />
  );
}