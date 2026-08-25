"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteOrderAction, updateOrderStatusAction } from "@/app/actions/admin/orders";
import { ORDER_STATUS, ORDER_STATUS_ORDER } from "@/lib/order-labels";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/enums";

export function OrderStatusControls({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<OrderStatus | null>(null);

  function change(status: OrderStatus) {
    if (status === current) return;
    setTarget(status);
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, status);
      setTarget(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Pedido marcado como "${ORDER_STATUS[status].label}"`);
      router.refresh();
    });
  }

  return (
    <div>
      <span className="label">Status do pedido</span>
      <div className="flex flex-wrap gap-2">
        {ORDER_STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            disabled={pending}
            onClick={() => change(status)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm transition disabled:opacity-50",
              status === current
                ? "border-brand-400 bg-brand-500/15 font-semibold text-brand-200"
                : "border-white/10 text-white/60 hover:border-white/30",
            )}
          >
            {pending && target === status && <Loader2 size={13} className="animate-spin" />}
            {ORDER_STATUS[status].label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/40">
        Marcar como <strong className="text-white/60">Pago</strong> dá baixa no estoque.
        Cancelar devolve as unidades.
      </p>
    </div>
  );
}

export function DeleteOrderButton({ orderId, number }: { orderId: string; number: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        <Trash2 size={14} /> Excluir
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/50">Excluir #{number}?</span>
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteOrderAction(orderId);
            if (!result.ok) {
              toast.error(result.error);
              setConfirming(false);
              return;
            }
            toast.success("Pedido excluído");
            router.push("/admin/pedidos");
          })
        }
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : "Confirmar"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </div>
  );
}
