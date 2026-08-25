import { PageHeader } from "@/components/admin/ui";
import { BannerManager } from "@/components/admin/banner-manager";
import { db } from "@/lib/db";

export const metadata = { title: "Banners" };

export default async function BannersPage() {
  const banners = await db.banner.findMany({ orderBy: [{ position: "asc" }, { createdAt: "desc" }] });

  return (
    <>
      <PageHeader
        title="Banners"
        description="O primeiro banner ativo vira o destaque principal da home."
      />
      <BannerManager banners={banners} />
    </>
  );
}
