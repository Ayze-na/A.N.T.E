import type {
  PaymentMethod,
  PresetLogo,
} from "@/lib/database.types";

export const SEED_PRODUCTS = [
  {
    id: "seed-scrub-full-blue",
    name: "اسكراب طبي كم طويل — أزرق",
    slug: "scrub-full-blue",
    type: "scrub-full" as const,
    fabric: "لين",
    description:
      "اسكراب طبي كم طويل من قماش اللين، مريح وخفيف للاستخدام اليومي الطويل.",
    colors: ["أزرق"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    image_urls: [
      "https://placehold.co/600x600/eff6ff/1e3a8a?text=Scrub+Blue",
      "https://placehold.co/600x600/dbeafe/1e3a8a?text=Back",
    ],
    price: 450,
    currency: "EGP",
    customization_enabled: true,
    out_of_stock: false,
    discount_active: true,
    discount_percentage: 15,
  },
  {
    id: "seed-scrub-half-black",
    name: "اسكراب طبي كم قصير — أسود",
    slug: "scrub-half-black",
    type: "scrub-half" as const,
    fabric: "لين",
    description: "اسكراب طبي كم قصير بلون أسود عصري وأنيق.",
    colors: ["أسود"],
    sizes: ["M", "L", "XL", "XXL"],
    image_urls: [
      "https://placehold.co/600x600/e2e8f0/0f172a?text=Scrub+Black",
    ],
    price: 420,
    currency: "EGP",
    customization_enabled: true,
    out_of_stock: true,
    discount_active: false,
    discount_percentage: 0,
  },
  {
    id: "seed-coat-men",
    name: "بالطو طبي رجالي — أبيض",
    slug: "coat-men-white",
    type: "coat-men" as const,
    fabric: "جبردين",
    description: "بالطو طبي رجالي أنيق من قماش الجبردين الفاخر.",
    colors: ["أبيض"],
    sizes: ["M", "L", "XL", "XXL"],
    image_urls: [
      "https://placehold.co/600x600/f8fafc/1e3a8a?text=Coat+Men",
      "https://placehold.co/600x600/e2e8f0/1e3a8a?text=Back",
    ],
    price: 600,
    currency: "EGP",
    customization_enabled: false,
    out_of_stock: false,
    discount_active: false,
    discount_percentage: 0,
  },
  {
    id: "seed-coat-women",
    name: "بالطو طبي حريمي — أبيض",
    slug: "coat-women-white",
    type: "coat-women" as const,
    fabric: "جبردين",
    description: "بالطو طبي حريمي بقصّة راقية ومريحة.",
    colors: ["أبيض"],
    sizes: ["M", "L", "XL", "XXL"],
    image_urls: [
      "https://placehold.co/600x600/f1f5f9/1e3a8a?text=Coat+Women",
    ],
    price: 580,
    currency: "EGP",
    customization_enabled: false,
    out_of_stock: false,
    discount_active: false,
    discount_percentage: 0,
  },
];

export const SEED_PRESET_LOGOS: PresetLogo[] = [
  {
    id: "preset-1",
    image_url: "https://placehold.co/300x300/1d4ed8/ffffff?text=ANTE",
    label: "شعار A.N.T.E",
    category: "شعار العلامة",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "preset-2",
    image_url: "https://placehold.co/300x300/0f172a/ffffff?text=MD",
    label: "شعار MD",
    category: "شعارات طبية",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "preset-3",
    image_url: "https://placehold.co/300x300/15803d/ffffff?text=Dr%2B",
    label: "شعار Dr+",
    category: "شعارات طبية",
    active: true,
    created_at: new Date().toISOString(),
  },
];

export const SEED_PAYMENT_METHODS: {
  id: string;
  method: PaymentMethod;
  phone_number: string;
  account_holder: string;
  is_active: boolean;
  updated_at: string;
}[] = [
  {
    id: "pm-instapay",
    method: "instapay",
    phone_number: "01000000000",
    account_holder: "A.N.T.E",
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: "pm-orange",
    method: "orange_cash",
    phone_number: "01000000000",
    account_holder: "A.N.T.E",
    is_active: true,
    updated_at: new Date().toISOString(),
  },
];

export const SEED_WHATSAPP = "201000000000";

export const SEED_SETTINGS = { whatsapp_number: SEED_WHATSAPP };