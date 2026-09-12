import { NextResponse } from "next/server";
import { checkoutSchema, MAX_UPLOAD_BYTES } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin-server";
import { generateOrderNumber, discountRatio } from "@/lib/utils";
import { DEPOSIT_PERCENTAGE } from "@/lib/constants";
import { sniffImageMime } from "@/lib/image-type";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOTAL_UPLOAD_BYTES = 20 * 1024 * 1024;

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("bad_data_url");
  return Buffer.from(dataUrl.slice(comma + 1), "base64");
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`orders:${ip}`, 10, "60 s");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "محاولات كثيرة جداً، حاول بعد قليل" },
      { status: 429 },
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_TOTAL_UPLOAD_BYTES * 2) {
    return NextResponse.json({ ok: false, error: "حجم الطلب كبير جداً" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "بيانات غير صالحة" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const detail = issue
      ? ` [${issue.path.join(".")}] ${issue.message}`
      : "";
    return NextResponse.json(
      { ok: false, error: `بيانات غير صالحة، تحقق من الحقول —${detail}` },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Honeypot: silently "succeed" without creating an order.
  if (data.honeypot) {
    return NextResponse.json({ ok: true, orderNumber: "SPAM-DROPPED" });
  }

  const supabase = createAdminClient();

  // ---- Verify payment method exists and is active.
  const { data: pm } = await supabase
    .from("payment_methods")
    .select("method, is_active")
    .eq("method", data.payment_method)
    .maybeSingle();
  if (!pm || !pm.is_active) {
    return NextResponse.json(
      { ok: false, error: "وسيلة الدفع غير متاحة حالياً" },
      { status: 400 },
    );
  }

  // ---- Re-fetch products (authoritative prices, sizes, colors, stock).
  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const { data: products, error: productErr } = await supabase
    .from("products")
    .select(
      "id, name, price, discount_active, discount_percentage, sizes, colors, customization_enabled, out_of_stock",
    )
    .in("id", productIds);

  if (productErr || !products || products.length !== productIds.length) {
    return NextResponse.json(
      { ok: false, error: "أحد المنتجات غير متوفر، حدّث السلة" },
      { status: 400 },
    );
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  // ---- Validate preset logos referenced by items.
  const presetIds = [...new Set(
    data.items
      .map((i) => (i.customization?.type === "preset" ? i.customization.preset_id : null))
      .filter((x): x is string => Boolean(x)),
  )];
  const presetsRes = presetIds.length
    ? await supabase.from("preset_logos").select("id, active").in("id", presetIds)
    : { data: [] };
  const activePresetIds = new Set(
    (presetsRes.data ?? []).filter((p) => p.active).map((p) => p.id),
  );

  // ---- Validate every line item and recompute authoritative prices.
  const orderNumber = generateOrderNumber();
  let subtotal = 0;
  let totalUploadBytes = 0;
  type LineItem = {
    product_id: string | null;
    product_name: string;
    size: string;
    color: string;
    quantity: number;
    unit_price: number;
    customization_type: "none" | "uploaded" | "preset";
    customization_logo_url_or_preset_id: string | null;
    name_tag_text: string | null;
  };
  const lineItems: LineItem[] = [];

  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json(
        { ok: false, error: "أحد المنتجات غير متوفر، حدّث السلة" },
        { status: 400 },
      );
    }
    if (product.out_of_stock) {
      return NextResponse.json(
        { ok: false, error: `منتج "${product.name}" غير متوفر حالياً` },
        { status: 400 },
      );
    }
    if (!product.sizes.includes(item.size)) {
      return NextResponse.json(
        { ok: false, error: `مقاس غير صالح لمنتج "${product.name}"` },
        { status: 400 },
      );
    }
    if (!product.colors.includes(item.color)) {
      return NextResponse.json(
        { ok: false, error: `لون غير صالح لمنتج "${product.name}"` },
        { status: 400 },
      );
    }

    let customizationType: LineItem["customization_type"] = "none";
    let customizationRef: string | null = null;
    let nameTag: string | null = null;

    const c = item.customization ?? null;
    if (c) {
      if (!product.customization_enabled) {
        return NextResponse.json(
          { ok: false, error: `التخصيص غير متاح لمنتج "${product.name}"` },
          { status: 400 },
        );
      }
      nameTag = c.name_tag_text?.trim() ? c.name_tag_text.trim() : null;

      if (c.type === "preset") {
        if (!c.preset_id || !activePresetIds.has(c.preset_id)) {
          return NextResponse.json(
            { ok: false, error: "الشعار المختار غير متاح" },
            { status: 400 },
          );
        }
        customizationType = "preset";
        customizationRef = c.preset_id;
      } else if (c.type === "uploaded") {
        if (!c.logo_url || !c.logo_url.startsWith("data:")) {
          return NextResponse.json({ ok: false, error: "ملف الشعار غير صالح" }, { status: 400 });
        }
        let buffer: Buffer;
        try {
          buffer = dataUrlToBuffer(c.logo_url);
        } catch {
          return NextResponse.json({ ok: false, error: "ملف الشعار غير صالح" }, { status: 400 });
        }
        if (buffer.byteLength > MAX_UPLOAD_BYTES) {
          return NextResponse.json({ ok: false, error: "حجم الشعار أكبر من 5MB" }, { status: 400 });
        }
        totalUploadBytes += buffer.byteLength;
        if (totalUploadBytes > MAX_TOTAL_UPLOAD_BYTES) {
          return NextResponse.json({ ok: false, error: "حجم الملفات كبير جداً" }, { status: 413 });
        }
        const mime = await sniffImageMime(buffer);
        if (!mime) {
          return NextResponse.json(
            { ok: false, error: "شعار غير مدعوم — PNG / JPG / WebP فقط" },
            { status: 400 },
          );
        }
        const path = `${orderNumber}/logo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const { error: upErr } = await supabase.storage
          .from("uploaded-logos")
          .upload(path, buffer, { contentType: mime, upsert: false });
        if (upErr) {
          console.error("logo upload error", upErr);
          return NextResponse.json({ ok: false, error: "تعذر رفع الشعار" }, { status: 500 });
        }
        customizationType = "uploaded";
        customizationRef = path;
      }
    }

    const unitPrice = discountRatio(product);
    subtotal += unitPrice * item.quantity;

    lineItems.push({
      product_id: item.productId,
      product_name: product.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unit_price: unitPrice,
      customization_type: customizationType,
      customization_logo_url_or_preset_id: customizationRef,
      name_tag_text: nameTag,
    });
  }

  // ---- Upload payment proof (if provided).
  let proofPath: string | null = null;
  if (data.payment_proof_data) {
    if (!data.payment_proof_data.startsWith("data:")) {
      return NextResponse.json({ ok: false, error: "ملف الإثبات غير صالح" }, { status: 400 });
    }
    let buffer: Buffer;
    try {
      buffer = dataUrlToBuffer(data.payment_proof_data);
    } catch {
      return NextResponse.json({ ok: false, error: "ملف الإثبات غير صالح" }, { status: 400 });
    }
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, error: "حجم الإثبات أكبر من 5MB" }, { status: 400 });
    }
    totalUploadBytes += buffer.byteLength;
    if (totalUploadBytes > MAX_TOTAL_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, error: "حجم الملفات كبير جداً" }, { status: 413 });
    }
    const mime = await sniffImageMime(buffer);
    if (!mime) {
      return NextResponse.json(
        { ok: false, error: "إثبات غير مدعوم — PNG / JPG / WebP فقط" },
        { status: 400 },
      );
    }
    proofPath = `${orderNumber}/proof-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const { error: upErr } = await supabase.storage
      .from("payment-proofs")
      .upload(proofPath, buffer, { contentType: mime, upsert: false });
    if (upErr) {
      console.error("proof upload error", upErr);
      return NextResponse.json({ ok: false, error: "تعذر رفع إثبات الدفع" }, { status: 500 });
    }
  }

  // ---- Persist order + line items (service role bypasses RLS).
  const orderId = crypto.randomUUID();
  const deposit = Math.round(subtotal * DEPOSIT_PERCENTAGE);
  const remaining = subtotal - deposit;

  const { error: orderErr } = await supabase.from("orders").insert({
    id: orderId,
    order_number: orderNumber,
    customer_name: data.customer_name,
    phone_1: data.phone_1,
    phone_2: data.phone_2,
    address: data.address,
    city: data.city,
    subtotal,
    deposit_amount: deposit,
    remaining_amount: remaining,
    payment_method: data.payment_method,
    payment_proof_url: proofPath,
    status: "pending",
  });
  if (orderErr) {
    console.error("order insert error", orderErr);
    return NextResponse.json({ ok: false, error: "حدث خطأ أثناء تسجيل الطلب" }, { status: 500 });
  }

  const { error: itemsErr } = await supabase.from("order_items").insert(
    lineItems.map((l) => ({ ...l, order_id: orderId })),
  );
  if (itemsErr) {
    console.error("order_items insert error", itemsErr);
    return NextResponse.json({ ok: false, error: "حدث خطأ أثناء تسجيل الطلب" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orderNumber });
}