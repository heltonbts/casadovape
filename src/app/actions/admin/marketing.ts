"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { STORE_UTC_OFFSET } from "@/lib/utils";

export type CrudResult = { ok: true } | { ok: false; error: string };

const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(3, "O código precisa de ao menos 3 letras"),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().positive("O valor precisa ser maior que zero"),
  minSubtotalCents: z.number().int().nonnegative(),
  maxUses: z.number().int().positive().nullable(),
  active: z.boolean(),
  expiresAt: z.string().optional(),
});

const bannerSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Informe o título do banner"),
  subtitle: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  linkUrl: z.string().trim().optional(),
  ctaLabel: z.string().trim().optional(),
  position: z.number().int().nonnegative(),
  active: z.boolean(),
});

export async function saveCouponAction(input: z.input<typeof couponSchema>): Promise<CrudResult> {
  await requireAdmin();
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, code, expiresAt, ...rest } = parsed.data;

  if (rest.type === "PERCENT" && rest.value > 100) {
    return { ok: false, error: "Um desconto percentual não pode passar de 100%" };
  }

  const data = {
    ...rest,
    code: code.toUpperCase(),
    expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59${STORE_UTC_OFFSET}`) : null,
  };

  try {
    if (id) await db.coupon.update({ where: { id }, data });
    else await db.coupon.create({ data });
  } catch {
    return { ok: false, error: "Já existe um cupom com esse código" };
  }
  revalidatePath("/admin/cupons");
  return { ok: true };
}

export async function deleteCouponAction(id: string): Promise<CrudResult> {
  await requireAdmin();
  await db.coupon.delete({ where: { id } });
  revalidatePath("/admin/cupons");
  return { ok: true };
}

export async function saveBannerAction(input: z.input<typeof bannerSchema>): Promise<CrudResult> {
  await requireAdmin();
  const parsed = bannerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...rest } = parsed.data;

  const data = {
    title: rest.title,
    subtitle: rest.subtitle || null,
    imageUrl: rest.imageUrl || null,
    linkUrl: rest.linkUrl || null,
    ctaLabel: rest.ctaLabel || null,
    position: rest.position,
    active: rest.active,
  };

  if (id) await db.banner.update({ where: { id }, data });
  else await db.banner.create({ data });

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteBannerAction(id: string): Promise<CrudResult> {
  await requireAdmin();
  await db.banner.delete({ where: { id } });
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true };
}
