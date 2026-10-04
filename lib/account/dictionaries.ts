/**
 * Hesap / kayıt sözlükleri — SAF, bağımlılıksız.
 *
 * Kayıt formu (client), kayıt API'si, panel ayarları ve yönetim kuyruğu aynı
 * değer kümesini kullanır. Değerler veritabanına bu haliyle yazılır; etiketler
 * yalnız sunumdur. `StudentProfile.examType` sözlüğüyle hizalıdır
 * (LGS | TYT | AYT | TYT_AYT | OTHER).
 */

type Option<T extends string> = { readonly value: T; readonly label: string };

function values<T extends string>(options: readonly Option<T>[]): [T, ...T[]] {
  return options.map((option) => option.value) as [T, ...T[]];
}

export function optionLabel<T extends string>(options: readonly Option<T>[], value: string | null | undefined): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? value;
}

export const ACCOUNT_TYPE_OPTIONS = [
  { value: "STUDENT", label: "Öğrenciyim" },
  { value: "PARENT", label: "Veliyim" },
] as const satisfies readonly Option<string>[];
export const ACCOUNT_TYPES = values(ACCOUNT_TYPE_OPTIONS);
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CLASS_LEVEL_OPTIONS = [
  { value: "5", label: "5. sınıf" },
  { value: "6", label: "6. sınıf" },
  { value: "7", label: "7. sınıf" },
  { value: "8", label: "8. sınıf" },
  { value: "9", label: "9. sınıf" },
  { value: "10", label: "10. sınıf" },
  { value: "11", label: "11. sınıf" },
  { value: "12", label: "12. sınıf" },
  { value: "MEZUN", label: "Mezun" },
] as const satisfies readonly Option<string>[];
export const CLASS_LEVELS = values(CLASS_LEVEL_OPTIONS);

export const EXAM_TYPE_OPTIONS = [
  { value: "LGS", label: "LGS" },
  { value: "TYT", label: "TYT" },
  { value: "AYT", label: "AYT" },
  { value: "TYT_AYT", label: "TYT + AYT" },
  { value: "OTHER", label: "Diğer / henüz karar vermedim" },
] as const satisfies readonly Option<string>[];
export const EXAM_TYPES = values(EXAM_TYPE_OPTIONS);

export const FIELD_TRACK_OPTIONS = [
  { value: "SAY", label: "Sayısal" },
  { value: "EA", label: "Eşit ağırlık" },
  { value: "SOZ", label: "Sözel" },
  { value: "DIL", label: "Dil" },
] as const satisfies readonly Option<string>[];
export const FIELD_TRACKS = values(FIELD_TRACK_OPTIONS);

export const SCHOOL_TYPE_OPTIONS = [
  { value: "DEVLET", label: "Devlet okulu" },
  { value: "OZEL", label: "Özel okul" },
  { value: "ACIK_LISE", label: "Açık lise" },
  { value: "MEZUN", label: "Mezun" },
] as const satisfies readonly Option<string>[];
export const SCHOOL_TYPES = values(SCHOOL_TYPE_OPTIONS);

export const SUBJECT_OPTIONS = [
  { value: "MATEMATIK", label: "Matematik" },
  { value: "GEOMETRI", label: "Geometri" },
  { value: "FIZIK", label: "Fizik" },
  { value: "KIMYA", label: "Kimya" },
  { value: "BIYOLOJI", label: "Biyoloji" },
  { value: "TURKCE", label: "Türkçe / Edebiyat" },
  { value: "TARIH", label: "Tarih" },
  { value: "COGRAFYA", label: "Coğrafya" },
  { value: "FEN", label: "Fen Bilimleri" },
  { value: "INGILIZCE", label: "İngilizce" },
] as const satisfies readonly Option<string>[];
export const SUBJECTS = values(SUBJECT_OPTIONS);

export const RELATIONSHIP_OPTIONS = [
  { value: "ANNE", label: "Anne" },
  { value: "BABA", label: "Baba" },
  { value: "VASI", label: "Vasi" },
  { value: "DIGER", label: "Diğer" },
] as const satisfies readonly Option<string>[];
export const RELATIONSHIPS = values(RELATIONSHIP_OPTIONS);

export const PRODUCT_INTEREST_OPTIONS = [
  { value: "OD", label: "onlinedershanem.", hint: "Canlı grup dersleri" },
  { value: "OK", label: "onlinekoçum.", hint: "Birebir koçluk ve plan" },
  { value: "ODK", label: "onlinedenemekulübüm.", hint: "Deneme sınavları ve analiz" },
] as const;
export const PRODUCT_INTERESTS = PRODUCT_INTEREST_OPTIONS.map((option) => option.value) as ["OD", "OK", "ODK"];
export type InterestProduct = (typeof PRODUCT_INTERESTS)[number];

export const PURCHASE_STATUS_OPTIONS = [
  { value: "WANTS_TO_PURCHASE", label: "Paket satın almak istiyorum" },
  { value: "ALREADY_PURCHASED", label: "Zaten satın alım yaptım" },
  { value: "EXPLORING", label: "Önce bilgi almak istiyorum" },
] as const satisfies readonly Option<string>[];
export const PURCHASE_STATUSES = values(PURCHASE_STATUS_OPTIONS);

export const CONTACT_CHANNEL_OPTIONS = [
  { value: "PHONE", label: "Telefon" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "E-posta" },
] as const satisfies readonly Option<string>[];
export const CONTACT_CHANNELS = values(CONTACT_CHANNEL_OPTIONS);

export const CONTACT_TIME_OPTIONS = [
  { value: "MORNING", label: "Sabah (09–12)" },
  { value: "AFTERNOON", label: "Öğleden sonra (12–17)" },
  { value: "EVENING", label: "Akşam (17–21)" },
  { value: "ANY", label: "Fark etmez" },
] as const satisfies readonly Option<string>[];
export const CONTACT_TIMES = values(CONTACT_TIME_OPTIONS);

export const HEARD_FROM_OPTIONS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "GOOGLE", label: "Google araması" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "FRIEND", label: "Arkadaş / tavsiye" },
  { value: "SCHOOL", label: "Okul / öğretmen" },
  { value: "OTHER", label: "Diğer" },
] as const satisfies readonly Option<string>[];
export const HEARD_FROM = values(HEARD_FROM_OPTIONS);

export const CONTACT_STATUS_OPTIONS = [
  { value: "NEW", label: "Yeni" },
  { value: "CONTACTED", label: "Arandı" },
  { value: "UNREACHABLE", label: "Ulaşılamadı" },
  { value: "CONVERTED", label: "Müşteri oldu" },
  { value: "NOT_INTERESTED", label: "İlgilenmiyor" },
] as const satisfies readonly Option<string>[];
export const CONTACT_STATUSES = values(CONTACT_STATUS_OPTIONS);

/** KVKK aydınlatma metni sürümü. Metin değişince artırılır; onay sürümle saklanır. */
export const KVKK_TEXT_VERSION = "2026-10";

/** LGS'ye giden sınıflarda alan sorusu anlamsızdır. */
export function examNeedsFieldTrack(examType: string | null | undefined): boolean {
  return examType === "AYT" || examType === "TYT_AYT";
}
