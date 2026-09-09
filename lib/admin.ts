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
  Product,
  ProductType,
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
  const { id: _id, ...rest } = product;
  if (product.id) {
    const { error } = await supabase
      .from("products")
      .update({
        ...rest,
        slug: product.slug || slugify(product.name || ""),
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