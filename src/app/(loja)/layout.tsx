import { Suspense } from "react";
import { AgeGate } from "@/components/store/age-gate";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { getCategories } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const nav = categories.map((c) => ({ name: c.name, slug: c.slug }));

  return (
    <>
      {/* O header lê searchParams; o Suspense mantém o restante da página
          renderizável enquanto isso. */}
      <Suspense fallback={<div className="h-16 border-b border-white/8 bg-ink-950" />}>
        <SiteHeader
          storeName={settings.storeName}
          announcement={settings.announcement}
          categories={nav}
        />
      </Suspense>

      <main className="relative z-10 flex-1">{children}</main>

      <SiteFooter settings={settings} categories={nav} />

      {settings.ageGateEnabled && (
        <AgeGate storeName={settings.storeName} notice={settings.legalNotice} />
      )}
    </>
  );
}
