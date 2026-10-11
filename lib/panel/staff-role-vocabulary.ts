/**
 * Personel sorumlulukları sözlüğü — web formu
 * (`components/panel/admin-staff-responsibilities-form.tsx`) ve mobil yönetim
 * ucu AYNI etiketleri ve (ürün, rol) çiftlerini buradan okur. Sunucu
 * (`/api/panel/users/[id]/staff-roles`) çiftleri ayrıca doğrular.
 */
export const STAFF_PRODUCT_LABEL: Record<string, string> = {
  OD: "onlinedershanem.",
  OK: "Yön Koçluk",
  ODK: "Deneme Ligi",
};

export const STAFF_ROLE_LABEL: Record<string, string> = {
  TEACHER: "Ders öğretmeni",
  COACH: "Yön koçu",
  EXAM_EDITOR: "Deneme editörü",
  EXAM_OPERATOR: "Deneme operatörü",
  RESULT_PUBLISHER: "Sonuç yayıncısı",
  REPORT_VIEWER: "Rapor okuyucu",
  PRODUCT_MANAGER: "Ürün yöneticisi",
};

/** Geçerli (ürün, rol) çiftleri — sunucudaki matrisle aynı. */
export const STAFF_ROLE_OPTIONS: Array<{ product: string; role: string }> = [
  { product: "OD", role: "TEACHER" },
  { product: "OD", role: "PRODUCT_MANAGER" },
  { product: "OK", role: "COACH" },
  { product: "OK", role: "PRODUCT_MANAGER" },
  { product: "ODK", role: "REPORT_VIEWER" },
  { product: "ODK", role: "EXAM_EDITOR" },
  { product: "ODK", role: "EXAM_OPERATOR" },
  { product: "ODK", role: "RESULT_PUBLISHER" },
  { product: "ODK", role: "PRODUCT_MANAGER" },
];
