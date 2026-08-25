"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "@/app/actions/admin/auth";

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="surface w-full max-w-sm p-8">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500">
        <Zap size={20} className="text-white" fill="currentColor" />
      </span>
      <h1 className="mt-5 text-center text-xl font-black text-white">Painel da loja</h1>
      <p className="mt-1 text-center text-sm text-white/45">Entre para gerenciar produtos e pedidos</p>

      <div className="mt-7 space-y-4">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" className="field" required autoComplete="username" />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            className="field"
            required
            autoComplete="current-password"
          />
        </div>
      </div>

      {state.error && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle size={14} className="shrink-0" /> {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-6 w-full" disabled={pending}>
      {pending && <Loader2 size={16} className="animate-spin" />}
      {pending ? "Entrando…" : "Entrar"}
    </Button>
  );
}
