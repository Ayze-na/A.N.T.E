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

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const key = `${item.productId}::${item.size}::${item.color}::${
            item.customization?.name_tag_text ?? ""
          }::${item.customization?.preset_id ?? ""}::${
            item.customization?.logo_url ?? ""
          }`;
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
    { name: "ante-cart" },
  ),
);