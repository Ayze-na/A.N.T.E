import { createClient } from "@/lib/supabase/client";
import {
  SEED_PAYMENT_METHODS,
  SEED_PRESET_LOGOS,
  SEED_PRODUCTS,
} from "@/lib/seed";
import type {
  Product,
  PresetLogo,
  PaymentMethodRow,
  GalleryImage,
  GalleryOrientation,
} from "@/lib/database.types";

function hasSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co",
  );
}

export async function fetchProducts(): Promise<Product[]> {
  if (!hasSupabase()) return SEED_PRODUCTS as unknown as Product[];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchProducts error", error);
    return SEED_PRODUCTS as unknown as Product[];
  }
  return data ?? [];
}

export async function fetchProductById(
  id: string,
): Promise<Product | null> {
  if (!hasSupabase()) {
    return (
      (SEED_PRODUCTS.find(
        (p) => p.slug === id || p.id === id,
      ) as unknown as Product | undefined) ?? null
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", id)
    .maybeSingle();

  if (error || !data) {
    const byId = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (byId.error || !byId.data) return null;
    return byId.data;
  }
  return data;
}

export async function fetchPresetLogos(): Promise<PresetLogo[]> {
  if (!hasSupabase()) return SEED_PRESET_LOGOS;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("preset_logos")
    .select("*")
    .eq("active", true)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return SEED_PRESET_LOGOS;
  return data ?? SEED_PRESET_LOGOS;
}

export async function fetchPaymentMethods(): Promise<PaymentMethodRow[]> {
  if (!hasSupabase()) return SEED_PAYMENT_METHODS as unknown as PaymentMethodRow[];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("is_active", true);

  if (error) return SEED_PAYMENT_METHODS as unknown as PaymentMethodRow[];
  return data ?? [];
}

export async function fetchSetting(key: string): Promise<Record<string, unknown> | null> {
  if (!hasSupabase()) {
    if (key === "whatsapp_number") return { value: SEED_PAYMENT_METHODS[0].phone_number };
    return null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;
  const raw = (data as unknown as { value: unknown }).value;
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

const SEED_GALLERY_IMAGES: {
  image_url: string;
  alt: string;
  orientation: GalleryOrientation;
}[] = [
  { image_url: "https://placehold.co/600x600/eff6ff/1e3a8a?text=Scrub", alt: "", orientation: "portrait" },
  { image_url: "https://placehold.co/600x600/f8fafc/1e3a8a?text=Coat+Men", alt: "", orientation: "square" },
  { image_url: "https://placehold.co/600x600/f8fafc/1e3a8a?text=Coat+Women", alt: "", orientation: "portrait" },
  { image_url: "https://placehold.co/600x600/e2e8f0/0f172a?text=Scrub+Half", alt: "", orientation: "square" },
  { image_url: "https://placehold.co/600x600/eff6ff/1e3a8a?text=Detail", alt: "", orientation: "landscape" },
  { image_url: "https://placehold.co/600x600/f8fafc/1e3a8a?text=Fitting", alt: "", orientation: "landscape" },
];

export async function fetchGalleryImages(): Promise<GalleryImage[]> {
  if (!hasSupabase()) {
    return SEED_GALLERY_IMAGES.map((g, i) => ({
      id: `seed-gallery-${i}`,
      image_url: g.image_url,
      alt: g.alt,
      orientation: g.orientation,
      active: true,
      position: i,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchGalleryImages error", error);
    return [];
  }
  return data ?? [];
}