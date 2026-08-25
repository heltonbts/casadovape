"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatusAction } from "@/app/actions/admin/orders";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/enums";

/**
 * Atalho do dia a dia na listagem: finalizar (baixa o estoque e entra no
 * faturamento) ou cancelar (devolve o estoque, se já tinha saído). Os demais
 * status continuam na página do pedido, para quem quiser o fluxo completo.
 */
export function OrderRowActions({
  orderId,
  orderNumber,
  status,
}: {
  orderId: string;
  orderNumber: number;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: OrderStatus, done: string) {
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Pedido #${orderNumber} ${done}`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
      {status !== "DELIVERED" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => change("DELIVERED", "finalizado")}
          title="Finalizar: baixa o estoque e entra no faturamento"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10",
            "px-2.5 py-1 text-xs font-medium text-emerald-300 transition",
            "hover:bg-emerald-500/20 disabled:opacity-50",
          )}
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Finalizar
        </button>
      )}
      {status !== "CANCELED" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => change("CANCELED", "cancelado")}
          title="Cancelar: devolve o estoque se já tinha saído"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1",
            "text-xs font-medium text-white/50 transition hover:border-red-500/30",
            "hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50",
          )}
        >
          <X size={12} />
          Cancelar
        </button>
      )}
    </div>
  );
}
