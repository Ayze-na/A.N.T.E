import { ProductDetailClient } from "@/components/product-detail-client";
import { fetchProductById } from "@/lib/api";
import { notFound } from "next/navigation";

export const metadata = {
  title: "تفاصيل المنتج",
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product;
  try {
    product = await fetchProductById(slug);
  } catch {
    product = null;
  }
  if (!product) notFound();

  return (
    <ProductDetailClient
      product={{
        ...product,
      }}
    />
  );
}