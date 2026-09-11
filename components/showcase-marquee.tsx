"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { GalleryOrientation } from "@/lib/database.types";

const ORIENTATION_CLASS: Record<GalleryOrientation, string> = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
};

export type ShowcaseItem = {
  key: string;
  image_url: string;
  alt: string;
  orientation: GalleryOrientation;
};

export function ShowcaseMarquee({ gallery }: { gallery: ShowcaseItem[] }) {
  if (gallery.length === 0) return null;

  const items = gallery.slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="columns-2 gap-4 md:columns-3">
        {items.map((item, i) => (
          <motion.div
            key={item.key}
            className={`mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm ${
              ORIENTATION_CLASS[item.orientation]
            }`}
            initial={{ opacity: 0, y: 90 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
          >
            <Image
              src={item.image_url}
              alt={item.alt}
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