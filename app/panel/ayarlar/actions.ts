"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireActiveUser } from "@/lib/auth/guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { firstIssueMessage } from "@/lib/auth/register-schema";
import { settingsCommandSchema } from "@/lib/account/settings-commands";
import { runSettingsCommand } from "@/lib/account/settings-service";
import { CommandError } from "@/lib/panel/command-receipt";
import { formDataObject, type SettingsActionState } from "@/lib/account/settings-schema";

/**
 * PANEL · HESAP AYARLARI — server action'lar.
 *
 * GÜVENLİK:
 *  - Her action kendi oturumunu `requireActiveUser` ile alır ve YALNIZ kendi
 *    kaydını yazar; formdan hiçbir kullanıcı kimliği okunmaz.
 *  - `guardMutation` same-origin + hız limiti uygular ve yönetici
 *    önizlemesinde (View As) yazmayı engeller.
 *  - Bu ayarlar hiçbir ürün erişimi açmaz; yalnız iletişim ve profil verisidir.
 *  - Yazma kuralı mobil `/api/panel/me/settings` ile ORTAKTIR
 *    (`lib/account/settings-service.ts`): rol bölüm kapsamı, tek transaction
 *    içinde kayıt + audit.
 */

function saved(message: string): SettingsActionState {
  revalidatePath("/panel/ayarlar", "layout");
  return { ok: true, message, savedAt: Date.now() };
}

function failed(message: string): SettingsActionState {
  return { ok: false, message };
}

type CommandType = z.output<typeof settingsCommandSchema>["type"];

async function runAction(type: CommandType, action: string, formData: FormData, options: { arrayKeys?: string[]; invalid?: string; fallback?: string } = {}): Promise<SettingsActionState> {
  const session = await requireActiveUser();
  const guard = await guardMutation({
    action,
    userId: session.userId,
    requireSameOrigin: true,
    rateLimitKey: `account:settings:${session.userId}`,
    rateLimit: { max: 60, windowMs: 15 * 60_000 },
  });
  if (!guard.ok) return failed(guard.message);

  const parsed = settingsCommandSchema.safeParse({ ...formDataObject(formData, options.arrayKeys), type });
  if (!parsed.success) return failed(options.invalid ?? firstIssueMessage(parsed.error, options.fallback));
  try {
    const { result } = await runSettingsCommand(session, parsed.data);
    return saved(result.message);
  } catch (error) {
    if (error instanceof CommandError) return failed(error.message);
    throw error;
  }
}

export async function saveProfileSettings(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  return runAction("profile", "account.settings.profile", formData);
}

export async function saveEducationSettings(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  return runAction("education", "account.settings.education", formData, { arrayKeys: ["weakSubjects"] });
}

export async function saveContactSettings(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  return runAction("contact", "account.settings.contact", formData);
}

export async function saveBillingSettings(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  return runAction("billing", "account.settings.billing", formData);
}

export async function saveConsentSettings(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  return runAction("consents", "account.settings.consents", formData, { invalid: "Onaylar okunamadı." });
}

export async function addPendingChild(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  return runAction("addChild", "account.settings.add_child", formData, { fallback: "Çocuğun ad soyad, sınıf ve hedef sınav bilgisi zorunlu." });
}

export async function cancelPendingChild(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  return runAction("cancelChild", "account.settings.cancel_child", formData, { invalid: "Kayıt bulunamadı." });
}
