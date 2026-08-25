import { PageHeader } from "@/components/admin/ui";
import { CouponManager } from "@/components/admin/coupon-manager";
import { db } from "@/lib/db";

export const metadata = { title: "Cupons" };

export default async function CuponsPage() {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <PageHeader
        title="Cupons"
        description="Descontos aplicados pelo cliente na etapa de checkout."
      />
      <CouponManager
        coupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          minSubtotalCents: c.minSubtotalCents,
          maxUses: c.maxUses,
          uses: c.uses,
          active: c.active,
          expiresAt: c.expiresAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
