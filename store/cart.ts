"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/database.types";

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "key">) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  updateCustomization: (key: string, patch: CartItem["customization"]) => void;
  clear: () => void;
}

function keySource(item: {
  productId: string;
  size: string;
  color: string;
  customization?: CartItem["customization"] | null;
}): string {
  return `${item.productId}::${item.size}::${item.color}::${
    item.customization?.name_tag_text ?? ""
  }::${item.customization?.preset_id ?? ""}::${item.customization?.logo_url ?? ""}`;
}

function hashKey(source: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < source.length; i++) {
    const ch = source.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0")
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const key = hashKey(keySource(item));
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, key }] };
        }),
      removeItem: (key) =>
        set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      setQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
        })),
      updateCustomization: (key, customization) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.key === key ? { ...i, customization } : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "ante-cart",
      version: 2,
      migrate: (persisted) => {
        const { items } = persisted as { items?: CartItem[] };
        return {
          items: (items ?? []).map((i) => ({
            ...i,
            key: hashKey(keySource(i)),
          })),
        };
      },
    },
  ),
);