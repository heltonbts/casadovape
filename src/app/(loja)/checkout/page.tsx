import { CheckoutForm } from "@/components/store/checkout-form";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Finalizar pedido" };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <CheckoutForm
      freeShippingMinCents={settings.freeShippingMinCents}
      flatShippingCents={settings.flatShippingCents}
      storeAddress={settings.address}
      hasPix={Boolean(settings.pixKey)}
    />
  );
}
