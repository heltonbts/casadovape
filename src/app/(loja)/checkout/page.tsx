import { WhatsappCheckout } from "@/components/store/whatsapp-checkout";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Finalizar pedido" };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return <WhatsappCheckout whatsapp={settings.whatsapp} storeName={settings.storeName} />;
}
