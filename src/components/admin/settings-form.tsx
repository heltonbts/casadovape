"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveSettingsAction } from "@/app/actions/admin/settings";

export type SettingsFormData = {
  storeName: string;
  tagline: string;
  whatsapp: string;
  instagram: string;
  email: string;
  address: string;
  pixKey: string;
  pixHolder: string;
  announcement: string;
  ageGateEnabled: boolean;
  legalNotice: string;
};

export function SettingsForm({ initial }: { initial: SettingsFormData }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveSettingsAction({
        storeName: form.storeName,
        tagline: form.tagline,
        whatsapp: form.whatsapp,
        instagram: form.instagram,
        email: form.email,
        address: form.address,
        pixKey: form.pixKey,
        pixHolder: form.pixHolder,
        announcement: form.announcement,
        ageGateEnabled: form.ageGateEnabled,
        legalNotice: form.legalNotice,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Configurações salvas");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-2 xl:items-start">
      <section className="surface p-5">
        <h2 className="mb-4 font-bold text-white">Identidade</h2>
        <div className="grid gap-4">
          <Field label="Nome da loja *" value={form.storeName} onChange={(v) => set("storeName", v)} required />
          <Field
            label="Frase de apoio"
            value={form.tagline}
            onChange={(v) => set("tagline", v)}
            placeholder="Os melhores pods, entrega rápida."
          />
          <Field
            label="Faixa de aviso no topo"
            value={form.announcement}
            onChange={(v) => set("announcement", v)}
            placeholder="Frete grátis em Aracati e região"
          />
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="mb-4 font-bold text-white">Contato</h2>
        <div className="grid gap-4">
          <Field
            label="WhatsApp *"
            value={form.whatsapp}
            onChange={(v) => set("whatsapp", v)}
            required
            hint="Com DDI e DDD, só números. Ex.: 5511999999999"
          />
          <Field label="Instagram" value={form.instagram} onChange={(v) => set("instagram", v)} placeholder="casadovape" />
          <Field label="E-mail" value={form.email} onChange={(v) => set("email", v)} />
          <Field label="Endereço / cidade" value={form.address} onChange={(v) => set("address", v)} />
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="mb-4 font-bold text-white">Pagamento</h2>
        <div className="grid gap-4">
          <Field
            label="Chave Pix"
            value={form.pixKey}
            onChange={(v) => set("pixKey", v)}
            hint="Aparece na confirmação do pedido. Deixe vazio para esconder o Pix."
          />
          <Field label="Titular da chave" value={form.pixHolder} onChange={(v) => set("pixHolder", v)} />
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="mb-4 font-bold text-white">Conformidade</h2>
        <label className="flex items-center gap-2.5 text-sm text-white/70">
          <input
            type="checkbox"
            className="size-4 accent-brand-500"
            checked={form.ageGateEnabled}
            onChange={(e) => set("ageGateEnabled", e.target.checked)}
          />
          Exibir verificação de idade 18+ ao entrar na loja
        </label>

        <div className="mt-4">
          <label className="label">Aviso legal no rodapé</label>
          <textarea
            className="field min-h-24 resize-y"
            value={form.legalNotice}
            onChange={(e) => set("legalNotice", e.target.value)}
          />
        </div>

        <Button type="submit" size="lg" className="mt-6 w-full" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {pending ? "Salvando…" : "Salvar configurações"}
        </Button>
      </section>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
      {hint && <p className="mt-1 text-xs text-white/35">{hint}</p>}
    </div>
  );
}
