import type { UserRole } from "@prisma/client";

/**
 * Hesap tamamlama oranı — SAF (test edilebilir, DB yok).
 *
 * Kayıt bilerek hızlı tutulmuş olabilir (eski hesaplar, ödeme sonrası açılan
 * hesaplar); panel ayarları eksikleri buradan okur. Yüzde yalnızca
 * yönlendirme amaçlıdır, HİÇBİR erişim kararına girmez.
 */

export type ProfileCompletionInput = {
  role: UserRole;
  fullName: string | null;
  phone: string | null;
  kvkkAcceptedAt: Date | null;
  city: string | null;
  district: string | null;
  student?: {
    classLevel: string | null;
    examType: string | null;
    schoolName: string | null;
    birthDate: Date | null;
  } | null;
  parent?: {
    relationship: string | null;
    childCount: number;
  } | null;
};

export type ProfileRequirement = { key: string; label: string; href: string; done: boolean };

export type ProfileCompletion = {
  percent: number;
  complete: boolean;
  missing: ProfileRequirement[];
  requirements: ProfileRequirement[];
};

const SETTINGS = "/panel/ayarlar";

export function profileRequirements(input: ProfileCompletionInput): ProfileRequirement[] {
  const has = (value: string | null | undefined) => Boolean(value && value.trim());
  const base: ProfileRequirement[] = [
    { key: "fullName", label: "Ad soyad", href: `${SETTINGS}/profil`, done: has(input.fullName) },
    { key: "phone", label: "Cep telefonu", href: `${SETTINGS}/profil`, done: has(input.phone) },
  ];
  if (input.role !== "STUDENT" && input.role !== "PARENT") return base;

  const common: ProfileRequirement[] = [
    ...base,
    { key: "location", label: "İl ve ilçe", href: `${SETTINGS}/profil`, done: has(input.city) && has(input.district) },
    { key: "kvkk", label: "KVKK onayı", href: `${SETTINGS}/onaylar`, done: Boolean(input.kvkkAcceptedAt) },
  ];
  if (input.role === "STUDENT") {
    const student = input.student ?? null;
    return [
      ...common,
      { key: "classLevel", label: "Sınıf", href: `${SETTINGS}/egitim`, done: has(student?.classLevel) },
      { key: "examType", label: "Hedef sınav", href: `${SETTINGS}/egitim`, done: has(student?.examType) },
      { key: "schoolName", label: "Okul", href: `${SETTINGS}/egitim`, done: has(student?.schoolName) },
      { key: "birthDate", label: "Doğum tarihi", href: `${SETTINGS}/profil`, done: Boolean(student?.birthDate) },
    ];
  }
  const parent = input.parent ?? null;
  return [
    ...common,
    { key: "relationship", label: "Öğrenciye yakınlık", href: `${SETTINGS}/profil`, done: has(parent?.relationship) },
    { key: "children", label: "Çocuk bilgisi", href: `${SETTINGS}/cocuklarim`, done: (parent?.childCount ?? 0) > 0 },
  ];
}

export function computeProfileCompletion(input: ProfileCompletionInput): ProfileCompletion {
  const requirements = profileRequirements(input);
  const done = requirements.filter((requirement) => requirement.done).length;
  const percent = requirements.length ? Math.round((done / requirements.length) * 100) : 100;
  const missing = requirements.filter((requirement) => !requirement.done);
  return { percent, complete: missing.length === 0, missing, requirements };
}
