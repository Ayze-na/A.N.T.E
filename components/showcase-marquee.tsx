"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/lib/database.types";

const ORIENTATIONS = [
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[4/3]",
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[4/3]",
];

export function ShowcaseMarquee({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  const items = Array.from({ length: 6 }, (_, i) => products[i % products.length]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="columns-2 gap-4 md:columns-3">
        {items.map((p, i) => (
          <motion.div
            key={`${p.slug}-${i}`}
            className={`mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm ${ORIENTATIONS[i % ORIENTATIONS.length]}`}
            initial={{ opacity: 0, y: 90 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
          >
            <Image
              src={p.image_urls[0]}
              alt={p.name}
              width={600}
              height={600}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}