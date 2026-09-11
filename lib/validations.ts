import { z } from "zod";
import { SIZES } from "@/lib/constants";
import type { ProductType } from "@/lib/database.types";

const EGYPTIAN_PHONE = /^01[0125]\d{8}$/;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const customizationSchema = z
  .object({
    type: z.enum(["none", "uploaded", "preset"]),
    logo_url: z.string().max(8_000_000).nullable().default(null),
    preset_id: z.string().max(100).nullable().default(null),
    name_tag_text: z.string().max(120).default(""),
  })
  .nullable()
  .optional();

export const cartItemSchema = z.object({
  key: z.string().max(300),
  productId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  image_url: z.string().max(2500).default(""),
  size: z
    .string()
    .min(1)
    .max(10)
    .refine((s) => SIZES.includes(s), "مقاس غير صالح"),
  color: z.string().max(50),
  quantity: z.number().int().min(1).max(99),
  unit_price: z.number().int().min(0).max(10_000_000),
  customization: customizationSchema,
});

export const checkoutSchema = z.object({
  customer_name: z.string().min(2).max(80),
  phone_1: z.string().regex(EGYPTIAN_PHONE, "رقم هاتف غير صالح"),
  phone_2: z.string().regex(EGYPTIAN_PHONE, "رقم هاتف غير صالح").default(""),
  address: z.string().min(8).max(500),
  city: z.string().min(2).max(40),
  items: z.array(cartItemSchema).min(1).max(50),
  payment_method: z.string().min(1).max(100),
  payment_proof_data: z.string().max(8_000_000).nullable().default(null),
  payment_proof_name: z.string().max(255).nullable().default(null),
  honeypot: z.string().max(500).default(""),
});

export type CheckoutPayload = z.infer<typeof checkoutSchema>;

export const adminProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(150).optional(),
  type: z.enum(["scrub-half", "scrub-full", "coat-men", "coat-women"]),
  fabric: z.string().max(50).default("جبردين"),
  description: z.string().max(2000).nullable().default(null),
  colors: z.array(z.string().min(1).max(30)).max(20).default([]),
  sizes: z
    .array(
      z
        .string()
        .min(1)
        .max(10)
        .refine((s) => SIZES.includes(s), "مقاس غير صالح"),
    )
    .max(20)
    .default([]),
  image_urls: z.array(z.string().min(1).max(2500)).max(20).default([]),
  price: z.number().int().min(0).max(10_000_000),
  currency: z.string().max(10).default("EGP"),
  customization_enabled: z.boolean().default(false),
  out_of_stock: z.boolean().default(false),
  discount_active: z.boolean().default(false),
  discount_percentage: z.number().int().min(0).max(100).default(0),
});

export type AdminProductPayload = z.infer<typeof adminProductSchema>;

export const productTypes: ProductType[] = [
  "scrub-half",
  "scrub-full",
  "coat-men",
  "coat-women",
];