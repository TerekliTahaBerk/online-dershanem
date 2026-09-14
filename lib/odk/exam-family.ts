import type { OdkExamFamily } from "@prisma/client";

const LEGACY_ODK_FAMILIES = new Set<OdkExamFamily>(["LGS", "TYT", "AYT"]);

export function asLegacyOdkExamFamily(code: string): OdkExamFamily | null {
  return LEGACY_ODK_FAMILIES.has(code as OdkExamFamily)
    ? (code as OdkExamFamily)
    : null;
}

export function getOdkExamFamilyCode(input: {
  family: OdkExamFamily | null;
  examFamilyRef?: { code: string } | null;
}): string {
  const code = input.examFamilyRef?.code ?? input.family;
  if (!code) throw new Error("Sınav ailesi bağlantısı eksik.");
  return code;
}
