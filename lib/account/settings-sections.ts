import type { UserRole } from "@prisma/client";

/** Hesap ayarı bölümleri (web `/panel/ayarlar/[section]`, mobil P5.2) — SAF. */
export type SettingsSection = "profil" | "egitim" | "cocuklarim" | "iletisim" | "fatura" | "onaylar" | "guvenlik";

export const SETTINGS_SECTION_LABEL: Record<SettingsSection, string> = {
  profil: "Profil",
  egitim: "Eğitim bilgileri",
  cocuklarim: "Çocuklarım",
  iletisim: "İletişim tercihleri",
  fatura: "Fatura bilgileri",
  onaylar: "Onaylar",
  guvenlik: "Güvenlik",
};

/** Rolün görebildiği ayar bölümleri. Personel yalnız profil ve güvenliği görür. */
export function settingsSectionsFor(role: UserRole): SettingsSection[] {
  if (role === "STUDENT") return ["profil", "egitim", "iletisim", "fatura", "onaylar", "guvenlik"];
  if (role === "PARENT") return ["profil", "cocuklarim", "iletisim", "fatura", "onaylar", "guvenlik"];
  return ["profil", "guvenlik"];
}
