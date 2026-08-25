import { getSettings } from "@/lib/settings";
import { CartView } from "@/components/store/cart-view";

export const metadata = { title: "Carrinho" };

export default async function CarrinhoPage() {
  const settings = await getSettings();
  return (
    <CartView
      freeShippingMinCents={settings.freeShippingMinCents}
      flatShippingCents={settings.flatShippingCents}
    />
  );
}
