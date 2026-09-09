"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

const FRAME_COUNT = 90;
const FRAME_PREFIX = "/frames/frame-";

/**
 * Hero with a scroll-driven 360° rotation.
 *
 * Primary technique (Apple-style "image scrubbing"):
 *   - Place ./public/frames/frame-001.webp … frame-090.webp (real rendered
 *     rotation frames of the coat) and the canvas path is used.
 *   - Each actually-circular rotation angle needs a different rendered view
 *     of the garment (from a 3D model or illustration export), so still
 *     images CANNOT fake the rotation — this is a flag-worthy asset dependency.
 *
 * Fallback: CSS perspective + rotateY mapped to scroll (reads as a tilt/
 * flip — the documented acceptable fallback).
 */
export function HeroRotation() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"loading" | "frames" | "css">("loading");

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const rotateY = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const opacity = useTransform(scrollYProgress, [0.85, 0.98], [1, 0]);

  // Detect whether the frame sequence exists. If not, use CSS fallback.
  useEffect(() => {
    let cancelled = false;
    const probe = document.createElement("img");
    probe.onload = () => {
      if (!cancelled) setMode("frames");
    };
    probe.onerror = () => {
      if (!cancelled) setMode("css");
    };
    probe.src = `${FRAME_PREFIX}${String(1).padStart(3, "0")}.webp`;
    return () => {
      cancelled = true;
    };
  }, []);

  // Preload + scrub frames onto canvas.
  useEffect(() => {
    if (mode !== "frames") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cached: HTMLImageElement[] = [];
    let loaded = 0;

    const drawFrame = (index: number) => {
      const img = cached[index] as HTMLImageElement | undefined;
      if (!img || !img.complete) return;
      const ratio = img.naturalHeight / img.naturalWidth;
      const width = canvas.width;
      const height = Math.round(width * ratio);
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
    };

    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = document.createElement("img");
      img.src = `${FRAME_PREFIX}${String(i).padStart(3, "0")}.webp`;
      img.onload = () => {
        loaded++;
        if (loaded === FRAME_COUNT) {
          const raf = () => {
            const p = scrollYProgress.get();
            const idx = Math.min(FRAME_COUNT - 1, Math.floor(p * FRAME_COUNT));
            drawFrame(idx);
            rafId = requestAnimationFrame(raf);
          };
          let rafId = requestAnimationFrame(raf);
          return () => cancelAnimationFrame(rafId);
        }
      };
      cached.push(img);
    }
  }, [mode, scrollYProgress]);

  return (
    <div ref={sectionRef} className="relative h-[250vh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white px-4">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary-100/60 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -right-24 h-80 w-80 rounded-full bg-primary-200/40 blur-3xl" />

        <motion.h1
          className="relative z-10 mb-2 text-center text-3xl font-black tracking-tight text-ink-900 sm:text-5xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          اسحب للأسفل ولفّ 👨‍⚕️
        </motion.h1>
        <motion.p
          className="relative z-10 mb-8 text-center text-sm font-semibold text-ink-500 sm:text-base"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          A.N.T.E — جودة تلبسها كل يوم شغل
        </motion.p>

        <div className="relative z-10 aspect-[1/2] w-56 sm:w-72" style={{ perspective: 1200 }}>
          {mode === "loading" && (
            <div className="flex h-full w-full items-center justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700" />
            </div>
          )}

          <motion.div
            className={mode === "css" ? "h-full w-full" : "hidden"}
            style={{ rotateY, opacity, transformStyle: "preserve-3d" }}
          >
            <Image
              src="/images/coat.svg"
              alt="دكتور يرتدي أفرول أبيض فوق اسكراب أزرق"
              width={400}
              height={800}
              priority
              className="h-full w-full object-contain drop-shadow-2xl"
            />
          </motion.div>

          <canvas
            ref={canvasRef}
            className={mode === "frames" ? "h-full w-full" : "hidden"}
            style={{ opacity: opacity as never }}
          />
        </div>

        <motion.div
          className="relative z-10 mt-8 flex flex-col items-center gap-2 text-primary-700"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
          <span className="text-xs font-bold">اسحب للأسفل</span>
        </motion.div>
      </div>
    </div>
  );
}