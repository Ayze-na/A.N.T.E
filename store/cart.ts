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

function instanceKey(): string {
  return `u${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-6)}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      // Every unit becomes its own cart line (quantity 1) so that multiple
      // items of the same product/size can be customized individually.
      addItem: (item) =>
        set((state) => {
          const count = Math.max(1, item.quantity);
          const units: CartItem[] =
            count === 1
              ? [{ ...item, key: instanceKey() }]
              : Array.from({ length: count }, () => ({
                  ...item,
                  quantity: 1,
                  key: instanceKey(),
                }));
          return { items: [...state.items, ...units] };
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
      version: 3,
      migrate: (persisted) => {
        const { items } = persisted as { items?: CartItem[] };
        const out: CartItem[] = [];
        (items ?? []).forEach((i) => {
          const count = Math.max(1, i.quantity);
          for (let n = 0; n < count; n++) {
            out.push({ ...i, quantity: 1, key: instanceKey() });
          }
        });
        return { items: out };
      },
    },
  ),
);