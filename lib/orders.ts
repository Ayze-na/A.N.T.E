import { createClient } from "@/lib/supabase/client";
import {
  DEPOSIT_PERCENTAGE,
} from "@/lib/constants";
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
};

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

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
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

  // ---- SUPABASE MODE
  const supabase = createClient();
  try {
    const publicUrl = (bucket: string, path: string) =>
      supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

    let proofUrl: string | null = null;
    if (input.payment_proof_data) {
      const blob = await dataUrlToBlob(input.payment_proof_data);
      if (blob.size > 5 * 1024 * 1024) {
        return { ok: false, error: "حجم الإثبات أكبر من 5MB" };
      }
      const path = `${orderNumber}/proof-${Date.now()}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, blob, { contentType: blob.type || "image/png" });
      if (upErr) throw upErr;
      proofUrl = publicUrl("payment-proofs", path);
    }

    // Uploaded customization logos -> uploaded-logos bucket
    const resolvedItems = await Promise.all(
      input.items.map(async (item) => {
        let logoRef: string | null = null;
        if (item.customization?.type === "uploaded" && item.customization.logo_url) {
          const blob = await dataUrlToBlob(item.customization.logo_url);
          if (blob.size > 5 * 1024 * 1024) {
            return { ok: false as const, item, error: "حجم الشعار أكبر من 5MB" };
          }
          const path = `${orderNumber}/logo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const { error: upErr } = await supabase.storage
            .from("uploaded-logos")
            .upload(path, blob, { contentType: blob.type || "image/png" });
          if (upErr) throw upErr;
          logoRef = publicUrl("uploaded-logos", path);
        }
        return {
          ok: true as const,
          item,
          logoRef: item.customization?.type === "preset"
            ? item.customization.preset_id
            : logoRef,
        };
      }),
    );

    const failed = resolvedItems.find((r) => !r.ok);
    if (failed) return { ok: false, error: failed.error };

    const orderId = crypto.randomUUID();
    const { error: orderErr } = await supabase.from("orders").insert({
      id: orderId,
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
      payment_proof_url: proofUrl,
      status: "pending",
    });
    if (orderErr) throw orderErr;

    const { error: itemsErr } = await supabase.from("order_items").insert(
      resolvedItems.map((r) => ({
        order_id: orderId,
        product_id: r.item.productId,
        product_name: r.item.name,
        size: r.item.size,
        color: r.item.color,
        quantity: r.item.quantity,
        unit_price: r.item.unit_price,
        customization_type: r.item.customization?.type ?? "none",
        customization_logo_url_or_preset_id: r.logoRef,
        name_tag_text: r.item.customization?.name_tag_text ?? null,
      })),
    );
    if (itemsErr) throw itemsErr;

    return { ok: true, orderNumber };
  } catch (e) {
    console.error("placeOrder error", e);
    return { ok: false, error: "حدث خطأ أثناء تسجيل الطلب، حاول مرة أخرى" };
  }
}