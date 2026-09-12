import Image from "next/image";

export function HeroRotation() {
  return (
    <section className="w-full bg-[#F2F1F7]">
      <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] lg:aspect-[21/9]">
        <Image
          src="/images/hero-poster.jpg"
          alt="بالطو طبي للسادة"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}