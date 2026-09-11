import { DEPOSIT_PERCENTAGE } from "@/lib/constants";
import { generateOrderNumber, getStored, setStored } from "@/lib/utils";
import type {
  CartItem,
  OrderWithItems,
  PaymentMethod,
} from "@/lib/database.types";

export type PlaceOrderInput = {
  customer_name: string;
  phone_1: string;
  phone_2: string;
  address: string;
  city: string;
  items: CartItem[];
  payment_method: PaymentMethod;
  payment_proof_data?: string | null;
  payment_proof_name?: string | null;
  honeypot?: string;
};

/**
 * Downscales an image data URL (browser-only) so uploaded proofs/logos stay
 * far below API payload limits even for 5MB phone screenshots.
 */
async function compressImage(dataUrl: string, maxDim = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const DEMO_ORDERS_KEY = "ante-demo-orders";

function hasSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co",
  );
}

export function demoOrders(): OrderWithItems[] {
  return getStored<OrderWithItems[]>(DEMO_ORDERS_KEY, []);
}

export async function placeOrder(input: PlaceOrderInput): Promise<{
  ok: boolean;
  orderNumber?: string;
  error?: string;
}> {
  const subtotal = input.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const deposit = Math.round(subtotal * DEPOSIT_PERCENTAGE);
  const remaining = subtotal - deposit;
  const orderNumber = generateOrderNumber();

  if (!hasSupabase()) {
    // ---- DEMO MODE: persist locally so the whole flow (incl. admin) works
    // before the backend is wired up.
    const order: OrderWithItems = {
      id: `demo-${Date.now()}`,
      order_number: orderNumber,
      customer_name: input.customer_name,
      phone_1: input.phone_1,
      phone_2: input.phone_2,
      address: input.address,
      city: input.city,
      subtotal,
      deposit_amount: deposit,
      remaining_amount: remaining,
      payment_method: input.payment_method,
      payment_proof_url: input.payment_proof_data ?? null,
      status: "pending",
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order_items: input.items.map((item) => ({
        id: `demo-item-${Math.random().toString(36).slice(2)}`,
        order_id: "",
        product_id: item.productId,
        product_name: item.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_price: item.unit_price,
        customization_type: item.customization?.type ?? "none",
        customization_logo_url_or_preset_id:
          item.customization?.type === "uploaded"
            ? (item.customization.logo_url ?? null)
            : item.customization?.preset_id ?? null,
        name_tag_text: item.customization?.name_tag_text ?? null,
      })),
    };
    setStored(DEMO_ORDERS_KEY, [...demoOrders(), order]);
    return { ok: true, orderNumber };
  }

  // ---- SUPABASE MODE: delegate to the server route which re-validates the
  // order server-side (authoritative prices, stock, sizes, colors) and
  // persists it with the service-role key.
  try {
    const [proofData, compressedItems] = await Promise.all([
      input.payment_proof_data
        ? compressImage(input.payment_proof_data)
        : Promise.resolve(null),
      Promise.all(
        input.items.map(async (item) => ({
          ...item,
          customization:
            item.customization && item.customization.type === "uploaded" && item.customization.logo_url
              ? {
                  ...item.customization,
                  logo_url: await compressImage(item.customization.logo_url),
                }
              : item.customization,
        })),
      ),
    ]);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: input.customer_name,
        phone_1: input.phone_1,
        phone_2: input.phone_2,
        address: input.address,
        city: input.city,
        items: compressedItems,
        payment_method: input.payment_method,
        payment_proof_data: proofData,
        payment_proof_name: input.payment_proof_name,
        honeypot: input.honeypot ?? "",
      }),
    });

    const data = await res.json().catch(() => ({})) as {
      ok?: boolean;
      orderNumber?: string;
      error?: string;
    };
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error ?? "حدث خطأ أثناء تسجيل الطلب، حاول مرة أخرى" };
    }
    return { ok: true, orderNumber: data.orderNumber };
  } catch (e) {
    console.error("placeOrder error", e);
    return { ok: false, error: "حدث خطأ أثناء تسجيل الطلب، حاول مرة أخرى" };
  }
}