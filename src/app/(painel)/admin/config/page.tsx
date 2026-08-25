import { PageHeader } from "@/components/admin/ui";
import { SettingsForm, type SettingsFormData } from "@/components/admin/settings-form";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Configurações" };

export default async function ConfigPage() {
  const s = await getSettings();

  // O formulário é "use client" e trabalha só com strings; os nulos do banco
  // viram "" aqui para os inputs nunca ficarem não-controlados.
  const initial: SettingsFormData = {
    storeName: s.storeName,
    tagline: s.tagline ?? "",
    whatsapp: s.whatsapp,
    instagram: s.instagram ?? "",
    email: s.email ?? "",
    address: s.address ?? "",
    pixKey: s.pixKey ?? "",
    pixHolder: s.pixHolder ?? "",
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
