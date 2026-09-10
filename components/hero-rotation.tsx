import Image from "next/image";

export function HeroRotation() {
  return (
    <section className="flex h-screen w-full items-center justify-center overflow-hidden bg-[#faf9f6] px-4">
      <div className="relative h-[88vh] w-full max-w-5xl">
        <Image
          src="/images/hero-poster.jpg"
          alt="أفرول طبي للسادة"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-contain"
        />
      </div>
    </section>
  );
}