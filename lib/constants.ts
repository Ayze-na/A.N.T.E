import type { OrderStatus, PaymentMethod, ProductType } from "@/lib/database.types";

export const PRODUCT_TYPES: Record<ProductType, { label: string; fabric: string; colors: string[] }> = {
  "scrub-half": {
    label: "اسكراب — كم قصير",
    fabric: "لين",
    colors: ["أسود", "أزرق", "بترولي", "جنزاري", "مارون", "أزرق بيبي"],
  },
  "scrub-full": {
    label: "اسكراب — كم طويل",
    fabric: "لين",
    colors: ["أسود", "أزرق", "بترولي", "جنزاري", "مارون", "أزرق بيبي"],
  },
  "coat-men": {
    label: "بالطو طبي — رجالي",
    fabric: "جبردين",
    colors: ["أبيض"],
  },
  "coat-women": {
    label: "بالطو طبي — حريمي",
    fabric: "جبردين",
    colors: ["أبيض"],
  },
};

export const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = Object.entries(
  PRODUCT_TYPES,
).map(([value, meta]) => ({ value: value as ProductType, label: meta.label }));

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "قيد المراجعة",
  confirmed: "تم التأكيد",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as OrderStatus, label }),
);

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  instapay: "إنستاباي InstaPay",
  orange_cash: "أورنج كاش Orange Cash",
};

export const SIZES = [
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "X3L",
  "X4L",
  "X5L",
  "X6L",
];

export const PRESET_LOGO_CATEGORIES = [
  "بشري",
  "بيطري",
  "اسنان",
  "صيدلة",
  "علاج طبيعي",
  "تمريض",
  "علوم",
];

export const NEW_CATEGORY_VALUE = "__new__";

export const DEPOSIT_PERCENTAGE = 0.2;

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};