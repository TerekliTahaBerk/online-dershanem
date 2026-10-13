import { check, v, type Infer } from "./validate";

/**
 * HESAP AYARLARI (P5.2 · C07/C08/C10/C11, V10) — `GET /api/panel/me/settings`.
 * Bölüm verisi rol kapsamlıdır (rolün görmediği bölüm `null`); tercihler
 * bayrak kapalıyken `null`.
 */
const option = v.object({ value: v.nonEmpty(), label: v.string() });
const text = () => v.nullable(v.string());

const settings = v.object({
  contractVersion: v.literal(1),
  revision: v.nonEmpty(),
  role: v.oneOf(["ADMIN", "TEACHER", "STUDENT", "PARENT"]),
  sections: v.array(v.object({ key: v.oneOf(["profil", "egitim", "cocuklarim", "iletisim", "fatura", "onaylar", "guvenlik"]), label: v.string() })),
  completion: v.nullable(
    v.object({
      percent: v.int(0),
      complete: v.boolean(),
      contactFormSubmitted: v.boolean(),
      contactFormApplicable: v.boolean(),
      requirements: v.array(v.object({ key: v.nonEmpty(), label: v.string(), done: v.boolean(), section: v.string() })),
    }),
  ),
  memberships: v.array(v.object({ product: v.nonEmpty(), label: v.string(), expiresAt: v.nullable(v.iso()) })),
  profile: v.object({ fullName: text(), email: v.string(), phone: text(), birthDate: text(), relationship: text(), city: text(), district: text() }),
  education: v.nullable(
    v.object({
      classLevel: text(),
      examType: text(),
      fieldTrack: text(),
      schoolName: text(),
      schoolType: text(),
      targetRank: v.nullable(v.int(0)),
      weeklyStudyHours: v.nullable(v.int(0)),
      weakSubjects: v.array(v.string()),
      guardianName: text(),
      guardianPhone: text(),
      guardianEmail: text(),
    }),
  ),
  contact: v.nullable(v.object({ preferredChannel: v.nonEmpty(), preferredContactTime: v.nonEmpty(), note: text() })),
  billing: v.nullable(v.object({ billingAddress: text() })),
  consents: v.nullable(v.object({ kvkkAcceptedAt: v.nullable(v.iso()), kvkkVersion: text(), marketingConsent: v.boolean() })),
  children: v.nullable(
    v.object({
      linked: v.array(v.object({ name: v.string(), classLevel: text(), examType: text() })),
      pending: v.array(v.object({ id: v.nonEmpty(), fullName: v.string(), classLevel: text(), examType: text(), paid: v.boolean() })),
    }),
  ),
  options: v.object({
    classLevels: v.array(option),
    examTypes: v.array(option),
    fieldTracks: v.array(option),
    schoolTypes: v.array(option),
    subjects: v.array(option),
    relationships: v.array(option),
    contactChannels: v.array(option),
    contactTimes: v.array(option),
    fieldTrackExams: v.array(v.string()),
  }),
  preferences: v.object({
    accessibility: v.nullable(
      v.object({
        version: v.int(0),
        reducedMotion: v.boolean(),
        highContrast: v.boolean(),
        textScale: v.oneOf(["DEFAULT", "LARGE"]),
        comfortableSpacing: v.boolean(),
        captionsPreferred: v.boolean(),
        transcriptPreferred: v.boolean(),
      }),
    ),
    network: v.nullable(v.object({ version: v.int(0), lowDataMode: v.boolean(), offlineWritesEnabled: v.boolean() })),
  }),
});

export type AccountSettings = Infer<typeof settings>;
export type AccountSettingsSection = AccountSettings["sections"][number]["key"];
export type AccessibilityPreferences = NonNullable<AccountSettings["preferences"]["accessibility"]>;
export type NetworkPreferences = NonNullable<AccountSettings["preferences"]["network"]>;

/** `POST /api/panel/me/settings` gövdesindeki komut (sunucu: `lib/account/settings-commands.ts`). */
export type AccountSettingsCommand =
  | { type: "profile"; fullName: string; phone: string; city?: string | null; district?: string | null; birthDate?: string | null; relationship?: string | null }
  | {
      type: "education";
      classLevel: string;
      examType: string;
      fieldTrack?: string | null;
      schoolName?: string | null;
      schoolType?: string | null;
      targetRank?: number | null;
      weeklyStudyHours?: number | null;
      weakSubjects: string[];
      guardianName?: string | null;
      guardianPhone?: string | null;
      guardianEmail?: string | null;
    }
  | { type: "contact"; preferredChannel: string; preferredContactTime: string; note?: string | null }
  | { type: "billing"; billingAddress?: string | null }
  | { type: "consents"; kvkkConsent: boolean; marketingConsent: boolean }
  | { type: "addChild"; fullName: string; classLevel: string; examType: string; schoolName?: string | null; fieldTrack?: string | null; birthYear?: number | null; email?: string | null; phone?: string | null }
  | { type: "cancelChild"; childId: string };

/** Formu yeniden yazan komutlar `expectedRevision` taşır (sunucu `SETTINGS_REVISIONED`). */
export const REVISIONED_SETTINGS_COMMANDS: readonly AccountSettingsCommand["type"][] = ["profile", "education", "contact", "billing", "consents"];

export function parseAccountSettings(input: unknown) {
  return check(settings, input);
}

export function parseAccountSettingsWrite(input: unknown) {
  return check(v.object({ ok: v.literal(true), message: v.string(), replayed: v.boolean() }), input);
}

/** Erişilebilirlik ve düşük veri PATCH yanıtları: ortak alan yeni `version`. */
export function parsePreferenceWrite(input: unknown) {
  return check(v.object({ version: v.int(1) }), input);
}

export function parsePackageMeetingWrite(input: unknown) {
  return check(v.object({ ok: v.literal(true), message: v.string(), replayed: v.boolean() }), input);
}

/** P5.3 · `GET /api/panel/me/deletion-request`: açık talep tarihi ve DSR işlem durumu. */
export function parseDeletionRequestStatus(input: unknown) {
  return check(v.object({ contractVersion: v.literal(1), requestedAt: v.nullable(v.iso()), processing: v.nullable(v.oneOf(["PENDING_GRACE", "APPLIED"])) }), input);
}

export function parseDeletionRequestWrite(input: unknown) {
  return check(v.object({ ok: v.literal(true), requestedAt: v.iso(), alreadyRequested: v.boolean(), replayed: v.boolean() }), input);
}
