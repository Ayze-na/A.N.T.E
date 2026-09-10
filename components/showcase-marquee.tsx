"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/database.types";

export function ShowcaseMarquee({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  const sets = 4;
  const items = Array.from({ length: sets }).flatMap(() => products);

  return (
    <>
      <style>{`
        .showcase-track {
          animation: showcase-slide 50s linear infinite;
          will-change: transform;
        }
        .showcase-track:hover {
          animation-play-state: paused;
        }
        @keyframes showcase-slide {
          to { transform: translateX(-25%); }
        }
      `}</style>

      <section className="py-10">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#F2F1F7] to-transparent sm:w-28" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#F2F1F7] to-transparent sm:w-28" />

          <div className="showcase-track flex w-max gap-3 px-4">
            {items.map((p, i) => (
              <Link
                key={`${p.slug}-${i}`}
                href={`/products/${p.slug}`}
                className="group w-56 shrink-0 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-square overflow-hidden bg-[#F2F1F7]">
                  <Image
                    src={p.image_urls[0]}
                    alt={p.name}
                    width={600}
                    height={600}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}