"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { onlyDigits } from "@/lib/utils";

const settingsSchema = z.object({
  storeName: z.string().trim().min(2, "Informe o nome da loja"),
  tagline: z.string().trim().optional(),
  whatsapp: z.string().transform(onlyDigits).pipe(z.string().min(10, "WhatsApp inválido")),
  instagram: z.string().trim().optional(),
  email: z.string().trim().optional(),
  address: z.string().trim().optional(),
  pixKey: z.string().trim().optional(),
  pixHolder: z.string().trim().optional(),
  announcement: z.string().trim().optional(),
  ageGateEnabled: z.boolean(),
  legalNotice: z.string().trim().optional(),
});

export type SettingsResult = { ok: true } | { ok: false; error: string };

export async function saveSettingsAction(
  input: z.input<typeof settingsSchema>,
): Promise<SettingsResult> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const data = {
    storeName: d.storeName,
    tagline: d.tagline || null,
    whatsapp: d.whatsapp,
    instagram: d.instagram || null,
    email: d.email || null,
    address: d.address || null,
    pixKey: d.pixKey || null,
    pixHolder: d.pixHolder || null,
    announcement: d.announcement || null,
    ageGateEnabled: d.ageGateEnabled,
    legalNotice: d.legalNotice || null,
  };

  await db.settings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });

  // As configurações aparecem no header, footer e checkout de toda a loja.
  revalidatePath("/", "layout");
  return { ok: true };
}
