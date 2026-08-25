"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  productName: string;
  variantName: string;
  unitCents: number;
  quantity: number;
  /** Estoque conhecido no momento em que o item entrou no carrinho. */
  maxStock: number;
};

type CartState = {
  items: CartItem[];
  hydrated: boolean;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,

      add: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, ...item, quantity: Math.min(i.quantity + quantity, item.maxStock) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: Math.min(quantity, item.maxStock) }] };
        }),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.flatMap((i) => {
            if (i.variantId !== variantId) return [i];
            const next = Math.min(Math.max(quantity, 0), i.maxStock);
            return next === 0 ? [] : [{ ...i, quantity: next }];
          }),
        })),

      remove: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),

      clear: () => set({ items: [] }),
    }),
    {
      name: "cdv-cart",
      // `hydrated` evita piscar "carrinho vazio" antes do localStorage carregar.
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((sum, i) => sum + i.quantity, 0);
export const cartSubtotal = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.unitCents * i.quantity, 0);
