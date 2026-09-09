export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(amount: number, currency = "EGP"): string {
  return `${amount.toLocaleString("en-EG")} ${currency === "EGP" ? "ج.م" : currency}`;
}

export function discountedPrice(price: number, percent: number): number {
  if (percent <= 0) return price;
  return Math.round(price * (1 - percent / 100));
}

export function discountRatio(product: {
  price: number;
  discount_active: boolean;
  discount_percentage: number;
}): number {
  if (!product.discount_active || product.discount_percentage <= 0)
    return product.price;
  return discountedPrice(product.price, product.discount_percentage);
}

export function generateOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ANTE-${stamp}${rand}`;
}

export function slugify(name: string): string {
  const latin = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return latin || `product-${Date.now()}`;
}

export function getStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setStored<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}