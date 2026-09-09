import { createClient } from "@/lib/supabase/client";
import type { Product, PresetLogo, PaymentMethodRow } from "@/lib/database.types";
import {
  SEED_PAYMENT_METHODS,
  SEED_PRESET_LOGOS,
  SEED_PRODUCTS,
} from "@/lib/seed";

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