const ADMIN_DEMO_COOKIE = "ante_admin_session";
const DEMO_PRODUCTS_KEY = "ante-demo-products";

import { createClient } from "@/lib/supabase/client";
import { demoOrders } from "@/lib/orders";
import { SEED_PRODUCTS } from "@/lib/seed";
import { slugify, getStored, setStored } from "@/lib/utils";
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderWithItems,
  PaymentMethodRow,
  Product,
  ProductType,
  GalleryImage,
  GalleryOrientation,
} from "@/lib/database.types";

export function hasSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co",
  );
}

export function isDemoAdminCookie(cookie: string) {
  return cookie === "1";
}

/**
 * Resolves a stored object reference (path, legacy public URL or demo data
 * URL) into a viewable URL for the admin. Uses a short-lived signed URL so
 * private buckets (uploaded-logos / payment-proofs) stay private to the
 * public while remaining visible to admins.
 */
export async function resolveStorageSignedUrl(
  bucket: string,
  ref: string | null,
  expiresIn = 3600,
): Promise<string | null> {
  if (!ref) return null;
  if (ref.startsWith("data:")) return ref;

  const supabase = createClient();

  let path = ref;
  if (/^https?:\/\//.test(ref)) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = ref.indexOf(marker);
    if (idx === -1) {
      // Legacy URL from a bucket that is now private — cannot be salvaged.
      return null;
    }
    path = ref.slice(idx + marker.length);
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

// ---------------------------------------------------------------- Orders

export async function fetchAdminOrders(): Promise<OrderWithItems[]> {
  if (!hasSupabase()) return demoOrders();

  const supabase = createClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !orders) {
    console.error("fetchAdminOrders error", error);
    return [];
  }

  const ids = (orders as Order[]).map((o) => o.id);
  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", ids.length ? ids : [""]);

  if (itemsErr) console.error("fetchOrderItems error", itemsErr);

  return (orders as Order[]).map((o) => ({
    ...o,
    order_items: (items ?? []).filter((i) => i.order_id === o.id),
  }));
}

export async function updateOrderStatusDb(
  id: string,
  status: OrderStatus,
): Promise<boolean> {
  if (!hasSupabase()) {
    const orders = demoOrders().map((o) =>
      o.id === id
        ? { ...o, status, updated_at: new Date().toISOString() }
        : o,
    );
    setStored("ante-demo-orders", orders);
    return true;
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);
  if (error) console.error("update status error", error);
  return !error;
}

// ---------------------------------------------------------------- Products

export function demoProducts(): Product[] {
  if (typeof window === "undefined") return [];
  const stored = getStored<Product[]>(DEMO_PRODUCTS_KEY, null as never);
  if (stored) return stored;
  return SEED_PRODUCTS as unknown as Product[];
}

export async function fetchAdminProducts(): Promise<Product[]> {
  if (!hasSupabase()) return demoProducts();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function saveProduct(
  product: Partial<Product> & { id?: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabase()) {
    const now = new Date().toISOString();
    const slug = product.slug || slugify(product.name || "product");
    const existing = demoProducts();
    if (product.id) {
      const next = existing.map((p) =>
        p.id === product.id ? { ...p, ...product, slug, updated_at: now } : p,
      );
      setStored(DEMO_PRODUCTS_KEY, next);
    } else {
      const id = `demo-p-${Date.now()}`;
      setStored(DEMO_PRODUCTS_KEY, [
        ...existing,
        {
          id,
          name: product.name ?? "",
          slug,
          type: (product.type ?? "scrub-half") as ProductType,
          fabric: product.fabric ?? "لين",
          description: product.description ?? "",
          colors: product.colors ?? [],
          sizes: product.sizes ?? [],
          image_urls: product.image_urls ?? [],
          price: product.price ?? 0,
          currency: "EGP",
          customization_enabled: product.customization_enabled ?? false,
          out_of_stock: product.out_of_stock ?? false,
          discount_active: product.discount_active ?? false,
          discount_percentage: product.discount_percentage ?? 0,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
    return { ok: true };
  }

  const supabase = createClient();
  const { id: _id, slug: _slug, ...rest } = product;
  if (product.id) {
    const { error } = await supabase
      .from("products")
      .update({
        ...rest,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const { error } = await supabase.from("products").insert({
    ...rest,
    slug: product.slug || slugify(product.name || ""),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteProductDb(id: string): Promise<boolean> {
  if (!hasSupabase()) {
    setStored(
      DEMO_PRODUCTS_KEY,
      demoProducts().filter((p) => p.id !== id),
    );
    return true;
  }
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) console.error(error);
  return !error;
}

// ---------------------------------------------------------------- Settings

export type StoreSettings = {
  whatsapp_number: string;
  instapay_phone: string;
  instapay_holder: string;
  orange_phone: string;
  orange_holder: string;
};

export async function fetchStoreSettings(): Promise<StoreSettings> {
  if (!hasSupabase()) {
    return {
      whatsapp_number: "201000000000",
      instapay_phone: "01000000000",
      instapay_holder: "A.N.T.E",
      orange_phone: "01000000000",
      orange_holder: "A.N.T.E",
    };
  }
  const supabase = createClient();
  const fallback: StoreSettings = {
    whatsapp_number: "201000000000",
    instapay_phone: "01000000000",
    instapay_holder: "A.N.T.E",
    orange_phone: "01000000000",
    orange_holder: "A.N.T.E",
  };
  try {
    const { data } = await supabase.from("settings").select("*").eq("key", "store");
    const raw = data?.[0]?.value;
    if (raw && typeof raw === "object") {
      return { ...fallback, ...(raw as Partial<StoreSettings>) };
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export async function saveStoreSettings(settings: StoreSettings): Promise<boolean> {
  if (!hasSupabase()) return true;
  const supabase = createClient();
  const { error } = await supabase.from("settings").upsert({
    key: "store",
    value: settings as never,
  });
  return !error;
}

// ---------------------------------------------------------------- Payment methods

export async function fetchAllPaymentMethods(): Promise<PaymentMethodRow[]> {
  if (!hasSupabase()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .order("updated_at", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function savePaymentMethod(
  id: string,
  patch: Partial<Pick<PaymentMethodRow, "method" | "label" | "phone_number" | "account_holder" | "is_active">>,
): Promise<boolean> {
  if (!hasSupabase()) return true;
  const supabase = createClient();
  const { error } = await supabase.from("payment_methods").update(patch).eq("id", id);
  return !error;
}

export async function addPaymentMethod(input: {
  method: string;
  label: string;
  phone_number: string;
  account_holder: string;
  is_active: boolean;
}): Promise<PaymentMethodRow | null> {
  if (!hasSupabase()) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .insert(input)
    .select()
    .single();
  if (error) return null;
  return data;
}

export async function deletePaymentMethod(id: string): Promise<boolean> {
  if (!hasSupabase()) return true;
  const supabase = createClient();
  const { error } = await supabase.from("payment_methods").delete().eq("id", id);
  return !error;
}

// ---------------------------------------------------------------- Gallery

const DEMO_GALLERY_KEY = "ante-demo-gallery";

export function demoGalleryImages(): GalleryImage[] {
  if (typeof window === "undefined") return [];
  const stored = getStored<GalleryImage[]>(DEMO_GALLERY_KEY, null as never);
  if (stored) return stored;
  return SEED_GALLERY_IMAGES;
}

const SEED_GALLERY_IMAGES: GalleryImage[] = seedGalleryRows();

function seedGalleryRows(): GalleryImage[] {
  const base = [
    "https://placehold.co/600x600/eff6ff/1e3a8a?text=Scrub",
    "https://placehold.co/600x600/f8fafc/1e3a8a?text=Coat+Men",
    "https://placehold.co/600x600/f8fafc/1e3a8a?text=Coat+Women",
    "https://placehold.co/600x600/e2e8f0/0f172a?text=Scrub+Half",
    "https://placehold.co/600x600/eff6ff/1e3a8a?text=Detail",
    "https://placehold.co/600x600/f8fafc/1e3a8a?text=Fitting",
  ] as const;
  const orientations: GalleryOrientation[] = [
    "portrait",
    "square",
    "portrait",
    "square",
    "landscape",
    "landscape",
  ];
  return base.map((url, i) => ({
    id: `seed-gallery-${i}`,
    image_url: url,
    alt: "",
    orientation: orientations[i],
    active: true,
    position: i,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  }));
}

export async function fetchGalleryImages(): Promise<GalleryImage[]> {
  if (!hasSupabase()) return demoGalleryImages();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchGalleryImages error", error);
    return demoGalleryImages();
  }
  return data ?? [];
}

export async function saveGalleryImage(
  image: Partial<GalleryImage> & { id?: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabase()) {
    const gallery = demoGalleryImages();
    if (image.id) {
      setStored(
        DEMO_GALLERY_KEY,
        gallery.map((g) => (g.id === image.id ? { ...g, ...image } : g)),
      );
    } else {
      setStored(DEMO_GALLERY_KEY, [
        ...gallery,
        {
          id: `demo-g-${Date.now()}`,
          image_url: image.image_url ?? "",
          alt: image.alt ?? "",
          orientation: image.orientation ?? "square",
          active: true,
          position: gallery.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    }
    return { ok: true };
  }

  const supabase = createClient();
  if (image.id) {
    const { id: _id, ...rest } = image;
    const { error } = await supabase
      .from("gallery_images")
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq("id", image.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const { error } = await supabase.from("gallery_images").insert({
    image_url: image.image_url ?? "",
    alt: image.alt ?? "",
    orientation: image.orientation ?? "square",
    active: true,
    position: (await maxGalleryPosition()) + 1,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function maxGalleryPosition(): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from("gallery_images")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  return data && data.length > 0 ? ((data[0] as { position: number }).position ?? 0) : -1;
}

export async function deleteGalleryImage(id: string): Promise<boolean> {
  if (!hasSupabase()) {
    setStored(
      DEMO_GALLERY_KEY,
      demoGalleryImages().filter((g) => g.id !== id),
    );
    return true;
  }
  const supabase = createClient();
  const { error } = await supabase.from("gallery_images").delete().eq("id", id);
  if (error) console.error(error);
  return !error;
}