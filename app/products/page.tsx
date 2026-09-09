import { Suspense } from "react";
import { ProductsClient } from "@/components/products-client";

export const metadata = {
  title: "المنتجات",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsClient />
    </Suspense>
  );
}