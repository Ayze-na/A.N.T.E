import Image from "next/image";

export function HeroRotation() {
  return (
    <section className="flex h-screen w-full items-center justify-center overflow-hidden bg-[#F2F1F7]">
      <div className="relative h-full w-full">
        <Image
          src="/images/hero-poster.jpg"
          alt="أفرول طبي للسادة"
          fill
          priority
          sizes="100vw"
          className="object-contain"
        />
      </div>
    </section>
  );
}