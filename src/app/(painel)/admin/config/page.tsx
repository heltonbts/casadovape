import { PageHeader } from "@/components/admin/ui";
import { SettingsForm, type SettingsFormData } from "@/components/admin/settings-form";
import { getSettings } from "@/lib/settings";
import { fromCents } from "@/lib/utils";

export const metadata = { title: "Configurações" };

export default async function ConfigPage() {
  const s = await getSettings();

  // A conversão mora aqui (Server Component) porque o módulo do formulário é
  // "use client" — funções exportadas de lá não podem ser chamadas no servidor.
  const initial: SettingsFormData = {
    storeName: s.storeName,
    tagline: s.tagline ?? "",
    whatsapp: s.whatsapp,
    instagram: s.instagram ?? "",
    email: s.email ?? "",
    address: s.address ?? "",
    pixKey: s.pixKey ?? "",
    pixHolder: s.pixHolder ?? "",
    freeShippingMin: s.freeShippingMinCents ? fromCents(s.freeShippingMinCents) : "",
    flatShipping: s.flatShippingCents ? fromCents(s.flatShippingCents) : "",
    announcement: s.announcement ?? "",
    ageGateEnabled: s.ageGateEnabled,
    legalNotice: s.legalNotice ?? "",
  };

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Dados que aparecem na loja, no checkout e na mensagem do WhatsApp."
      />
      <SettingsForm initial={initial} />
    </>
  );
}
