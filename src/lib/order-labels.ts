import type { OrderStatus } from "@/generated/prisma/enums";

export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; tone: "neutral" | "brand" | "accent" | "success" | "warning" | "danger" }
> = {
  PENDING: { label: "Aguardando", tone: "warning" },
  PAID: { label: "Pago", tone: "brand" },
  SHIPPED: { label: "Enviado", tone: "accent" },
  DELIVERED: { label: "Entregue", tone: "success" },
  CANCELED: { label: "Cancelado", tone: "danger" },
};

export const ORDER_STATUS_ORDER: OrderStatus[] = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
];
