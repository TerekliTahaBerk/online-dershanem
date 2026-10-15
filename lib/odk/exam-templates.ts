/**
 * Config-based TYT / AYT / LGS sınav şablonları — sürümlü (Faz 3,
 * docs/roadmaps/odk-exam-experience-overhaul.md).
 *
 * - Her şablonun sürümü, kaynağı ve SINIRLI geçerlilik yılı vardır; resmî
 *   biçim değişince yeni sürüm eklenir, eskisi tarihsel kayıtlar için kalır.
 * - `mode`: OFFICIAL = resmî sınav biçimi (standart dışı soru sayısı yayını
 *   engeller), CUSTOM = branş/özel deneme (standart dışı sayı yalnız uyarı).
 * - Deneme oluşturulurken şablonun anlık görüntüsü sürüm ayarlarına
 *   (`OdkExamVersion.settings.template`) yazılır; hazırlık ve puanlama bu
 *   görüntüyü okur. Şablon değişse de geçmiş denemeler yeniden yorumlanmaz.
 * - Alt test soru sayıları ÖSYM/MEB'in yayımladığı soru dağılımıdır; bölüm
 *   içinde kitapçık sırasıyla ardışık kabul edilir. Resmî dağılım değişirse
 *   yeni şablon sürümü eklenmelidir.
 */

import type { OdkExamFamily } from "@prisma/client";
import { LGS_FULL_SESSION_PLAN, type ExamSessionPlan } from "./exam-sessions";

export type ExamTemplateMode = "OFFICIAL" | "CUSTOM";

export type ExamTemplateSubtest = { code: string; title: string; questionCount: number };

export type ExamTemplateSection = {
  code: string;
  title: string;
  questionCount: number;
  durationMinutes?: number;
  /** Bölüm içi alt testler (ör. Fen → Fizik/Kimya/Biyoloji), kitapçık sırasıyla. */
  subtests?: ExamTemplateSubtest[];
};

export type ExamTemplateTrack = { label: string; sectionCodes: string[] };

export type ExamTemplate = {
  code: string;
  family: OdkExamFamily;
  label: string;
  structureMode: "MATH_ONLY" | "FULL_TEMPLATE";
  mode: ExamTemplateMode;
  /** `YYYY.n` — biçimin yürürlüğe girdiği yıl ve o yıldaki revizyon. */
  templateVersion: string;
  /** Soru dağılımının dayanağı. */
  source: string;
  validFromYear: number;
  /** Gözden geçirme zorunluluğu: bu yıldan sonra şablon yeniden doğrulanmadan kullanılamaz. */
  validToYear: number | null;
  durationMinutes: number;
  scoringPolicyCode: string;
  wrongPenalty: number;
  sections: ExamTemplateSection[];
  /** Oturumlu düzen (LGS: Sözel → ara → Sayısal); sürüm ayarlarına `sessions` olarak yazılır. */
  sessions?: ExamSessionPlan;
  /** Alan bazlı beklenen bölümler (AYT: SAY / EA / SÖZ). */
  tracks?: Record<string, ExamTemplateTrack>;
};

const YKS_SOURCE = "ÖSYM YKS kılavuzu soru dağılımı (2018 ve sonrası)";
const LGS_SOURCE = "MEB LGS uygulama kılavuzu (2018 ve sonrası, iki oturum)";
/** Şablonların son doğrulandığı akademik yıl; sonrası için şablon gözden geçirilmelidir. */
const REVIEWED_THROUGH_YEAR = 2027;

const yks = { templateVersion: "2018.1", source: YKS_SOURCE, validFromYear: 2018, validToYear: REVIEWED_THROUGH_YEAR } as const;
const lgs = { templateVersion: "2018.1", source: LGS_SOURCE, validFromYear: 2018, validToYear: REVIEWED_THROUGH_YEAR } as const;

export const ODK_EXAM_TEMPLATES: Record<string, ExamTemplate> = {
  LGS_MATH: {
    code: "LGS_MATH",
    family: "LGS",
    label: "LGS Matematik",
    structureMode: "MATH_ONLY",
    mode: "CUSTOM",
    ...lgs,
    durationMinutes: 40,
    scoringPolicyCode: "LGS_MATH_V1",
    wrongPenalty: 3,
    sections: [{ code: "MAT", title: "LGS Matematik", questionCount: 20 }],
  },
  TYT_MATH: {
    code: "TYT_MATH",
    family: "TYT",
    label: "TYT Matematik",
    structureMode: "MATH_ONLY",
    mode: "CUSTOM",
    ...yks,
    durationMinutes: 40,
    scoringPolicyCode: "YKS_MATH_V1",
    wrongPenalty: 4,
    sections: [{ code: "MAT", title: "TYT Matematik", questionCount: 40 }],
  },
  AYT_MATH: {
    code: "AYT_MATH",
    family: "AYT",
    label: "AYT Matematik",
    structureMode: "MATH_ONLY",
    mode: "CUSTOM",
    ...yks,
    durationMinutes: 40,
    scoringPolicyCode: "YKS_MATH_V1",
    wrongPenalty: 4,
    sections: [{ code: "MAT", title: "AYT Matematik", questionCount: 40 }],
  },
  LGS_FULL: {
    code: "LGS_FULL",
    family: "LGS",
    label: "LGS Tam Deneme",
    structureMode: "FULL_TEMPLATE",
    mode: "OFFICIAL",
    ...lgs,
    durationMinutes: 155,
    scoringPolicyCode: "LGS_FULL_V1",
    wrongPenalty: 3,
    sections: [
      { code: "TURKCE", title: "Türkçe", questionCount: 20 },
      { code: "INKILAP", title: "T.C. İnkılap Tarihi ve Atatürkçülük", questionCount: 10 },
      { code: "DIN", title: "Din Kültürü ve Ahlak Bilgisi", questionCount: 10 },
      { code: "INGILIZCE", title: "Yabancı Dil", questionCount: 10 },
      { code: "MAT", title: "Matematik", questionCount: 20 },
      { code: "FEN", title: "Fen Bilimleri", questionCount: 20 },
    ],
    sessions: LGS_FULL_SESSION_PLAN,
  },
  TYT_FULL: {
    code: "TYT_FULL",
    family: "TYT",
    label: "TYT Tam Deneme",
    structureMode: "FULL_TEMPLATE",
    mode: "OFFICIAL",
    ...yks,
    durationMinutes: 165,
    scoringPolicyCode: "TYT_FULL_V1",
    wrongPenalty: 4,
    sections: [
      { code: "TURKCE", title: "Türkçe", questionCount: 40 },
      {
        code: "SOSYAL",
        title: "Sosyal Bilimler",
        questionCount: 20,
        subtests: [
          { code: "TARIH", title: "Tarih", questionCount: 5 },
          { code: "COGRAFYA", title: "Coğrafya", questionCount: 5 },
          { code: "FELSEFE", title: "Felsefe", questionCount: 5 },
          { code: "DIN", title: "Din Kültürü ve Ahlak Bilgisi / ek Felsefe", questionCount: 5 },
        ],
      },
      { code: "MAT", title: "Temel Matematik", questionCount: 40 },
      {
        code: "FEN",
        title: "Fen Bilimleri",
        questionCount: 20,
        subtests: [
          { code: "FIZIK", title: "Fizik", questionCount: 7 },
          { code: "KIMYA", title: "Kimya", questionCount: 7 },
          { code: "BIYOLOJI", title: "Biyoloji", questionCount: 6 },
        ],
      },
    ],
  },
  AYT_FULL: {
    code: "AYT_FULL",
    family: "AYT",
    label: "AYT Tam Deneme",
    structureMode: "FULL_TEMPLATE",
    mode: "OFFICIAL",
    ...yks,
    durationMinutes: 180,
    scoringPolicyCode: "AYT_FULL_V1",
    wrongPenalty: 4,
    sections: [
      {
        code: "EDB_SOS1",
        title: "Türk Dili ve Edebiyatı / Sosyal Bilimler-1",
        questionCount: 40,
        subtests: [
          { code: "EDEBIYAT", title: "Türk Dili ve Edebiyatı", questionCount: 24 },
          { code: "TARIH1", title: "Tarih-1", questionCount: 10 },
          { code: "COGRAFYA1", title: "Coğrafya-1", questionCount: 6 },
        ],
      },
      {
        code: "SOS2",
        title: "Sosyal Bilimler-2",
        questionCount: 40,
        subtests: [
          { code: "TARIH2", title: "Tarih-2", questionCount: 11 },
          { code: "COGRAFYA2", title: "Coğrafya-2", questionCount: 11 },
          { code: "FELSEFE_GRUBU", title: "Felsefe Grubu", questionCount: 12 },
          { code: "DIN", title: "Din Kültürü ve Ahlak Bilgisi / ek Felsefe Grubu", questionCount: 6 },
        ],
      },
      { code: "MAT", title: "Matematik", questionCount: 40 },
      {
        code: "FEN",
        title: "Fen Bilimleri",
        questionCount: 40,
        subtests: [
          { code: "FIZIK", title: "Fizik", questionCount: 14 },
          { code: "KIMYA", title: "Kimya", questionCount: 13 },
          { code: "BIYOLOJI", title: "Biyoloji", questionCount: 13 },
        ],
      },
    ],
    tracks: {
      SAY: { label: "Sayısal", sectionCodes: ["MAT", "FEN"] },
      EA: { label: "Eşit ağırlık", sectionCodes: ["MAT", "EDB_SOS1"] },
      SOZ: { label: "Sözel", sectionCodes: ["EDB_SOS1", "SOS2"] },
    },
  },
};

export function getExamTemplate(code: string): ExamTemplate | null {
  return ODK_EXAM_TEMPLATES[code] ?? null;
}

export function templateValidForYear(template: Pick<ExamTemplate, "validFromYear" | "validToYear">, year: number): boolean {
  return year >= template.validFromYear && (template.validToYear === null || year <= template.validToYear);
}

/** Şablon tutarlılığı: alt testler bölüm soru sayısını tam karşılar, kodlar benzersizdir. */
export function templateIntegrityIssues(template: ExamTemplate): string[] {
  const issues: string[] = [];
  const sectionCodes = new Set<string>();
  for (const section of template.sections) {
    if (sectionCodes.has(section.code)) issues.push(`${section.code}: bölüm kodu tekrarlanıyor`);
    sectionCodes.add(section.code);
    if (section.subtests?.length) {
      const total = section.subtests.reduce((sum, subtest) => sum + subtest.questionCount, 0);
      if (total !== section.questionCount) issues.push(`${section.code}: alt testler ${total}, bölüm ${section.questionCount} soru`);
      if (new Set(section.subtests.map((subtest) => subtest.code)).size !== section.subtests.length) issues.push(`${section.code}: alt test kodu tekrarlanıyor`);
    }
  }
  for (const [key, track] of Object.entries(template.tracks ?? {})) {
    for (const code of track.sectionCodes) if (!sectionCodes.has(code)) issues.push(`${key}: bilinmeyen bölüm ${code}`);
  }
  for (const session of template.sessions ?? []) {
    for (const code of session.sectionCodes) if (!sectionCodes.has(code)) issues.push(`${session.key}: bilinmeyen bölüm ${code}`);
  }
  return issues;
}

/** Alan (SAY/EA/SÖZ) için beklenen bölümler; alanı olmayan şablon ya da bilinmeyen alan için null. */
export function templateTrackSections(template: Pick<ExamTemplate, "tracks">, fieldTrack: string | null | undefined): string[] | null {
  if (!fieldTrack || !template.tracks) return null;
  return template.tracks[fieldTrack.toUpperCase()]?.sectionCodes ?? null;
}

export function resolveTemplateForCreate(input: {
  family: OdkExamFamily;
  structureMode?: "MATH_ONLY" | "FULL_TEMPLATE";
  templateCode?: string | null;
  /** Denemenin akademik yılı; verilirse şablonun geçerlilik penceresinde olmalıdır. */
  academicYear?: number | null;
}): ExamTemplate {
  let template: ExamTemplate | null;
  if (input.templateCode) {
    template = getExamTemplate(input.templateCode);
    if (!template) throw new Error(`Bilinmeyen sınav şablonu: ${input.templateCode}`);
    if (template.family !== input.family) throw new Error("Şablon sınav türüyle eşleşmiyor.");
  } else {
    const mode = input.structureMode || "FULL_TEMPLATE";
    const code = mode === "MATH_ONLY" ? `${input.family}_MATH` : `${input.family}_FULL`;
    template = getExamTemplate(code);
    if (!template) throw new Error(`Şablon bulunamadı: ${code}`);
  }
  if (input.academicYear && !templateValidForYear(template, input.academicYear)) {
    throw new Error(`${template.label} şablonu (${template.templateVersion}) ${input.academicYear} için geçerli değil; şablonun gözden geçirilmesi gerekir.`);
  }
  return template;
}

export function templateTotalQuestions(template: ExamTemplate): number {
  return template.sections.reduce((sum, section) => sum + section.questionCount, 0);
}

export function withSectionRanges(template: ExamTemplate): Array<ExamTemplateSection & { questionStart: number; questionEnd: number; position: number }> {
  let cursor = 1;
  return template.sections.map((section, position) => {
    const questionStart = cursor;
    const questionEnd = cursor + section.questionCount - 1;
    cursor = questionEnd + 1;
    return { ...section, questionStart, questionEnd, position };
  });
}

export type TemplateSnapshotSubtest = ExamTemplateSubtest & { questionStart: number; questionEnd: number };

/** Sürüm ayarlarına yazılan, denemenin ömrü boyunca değişmeyen şablon görüntüsü. */
export type TemplateSnapshot = {
  code: string;
  templateVersion: string;
  mode: ExamTemplateMode;
  source: string;
  scoringPolicyCode: string;
  sections: Array<{ code: string; title: string; questionCount: number; subtests: TemplateSnapshotSubtest[] }>;
  tracks: Record<string, ExamTemplateTrack>;
};

/**
 * Anlık görüntü. `actualCounts` sürümde gerçekten oluşturulan soru sayısıdır
 * (branş denemesinde soru sayısı değişebilir); sayı şablondan farklıysa alt
 * test aralıkları geçersiz olacağından o bölümün alt testleri yazılmaz.
 */
export function buildTemplateSnapshot(template: ExamTemplate, actualCounts: Record<string, number> = {}): TemplateSnapshot {
  return {
    code: template.code,
    templateVersion: template.templateVersion,
    mode: template.mode,
    source: template.source,
    scoringPolicyCode: template.scoringPolicyCode,
    sections: template.sections.map((section) => {
      const questionCount = actualCounts[section.code] ?? section.questionCount;
      let cursor = 1;
      const subtests = questionCount === section.questionCount
        ? (section.subtests ?? []).map((subtest) => {
            const range = { ...subtest, questionStart: cursor, questionEnd: cursor + subtest.questionCount - 1 };
            cursor += subtest.questionCount;
            return range;
          })
        : [];
      return { code: section.code, title: section.title, questionCount, subtests };
    }),
    tracks: template.tracks ?? {},
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isInt = (value: unknown): value is number => Number.isInteger(value);

/** Sürüm ayarlarından şablon görüntüsünü okur; yoksa/bozuksa null (eski denemeler). */
export function readTemplateSnapshot(settings: unknown): TemplateSnapshot | null {
  if (!isRecord(settings) || !isRecord(settings.template)) return null;
  const raw = settings.template;
  if (typeof raw.code !== "string" || typeof raw.templateVersion !== "string" || (raw.mode !== "OFFICIAL" && raw.mode !== "CUSTOM") || typeof raw.scoringPolicyCode !== "string" || !Array.isArray(raw.sections)) return null;
  const sections: TemplateSnapshot["sections"] = [];
  for (const item of raw.sections) {
    if (!isRecord(item) || typeof item.code !== "string" || typeof item.title !== "string" || !isInt(item.questionCount) || !Array.isArray(item.subtests)) return null;
    const subtests: TemplateSnapshotSubtest[] = [];
    for (const subtest of item.subtests) {
      if (!isRecord(subtest) || typeof subtest.code !== "string" || typeof subtest.title !== "string" || !isInt(subtest.questionCount) || !isInt(subtest.questionStart) || !isInt(subtest.questionEnd)) return null;
      subtests.push({ code: subtest.code, title: subtest.title, questionCount: subtest.questionCount, questionStart: subtest.questionStart, questionEnd: subtest.questionEnd });
    }
    sections.push({ code: item.code, title: item.title, questionCount: item.questionCount, subtests });
  }
  const tracks: Record<string, ExamTemplateTrack> = {};
  if (isRecord(raw.tracks)) {
    for (const [key, track] of Object.entries(raw.tracks)) {
      if (isRecord(track) && typeof track.label === "string" && Array.isArray(track.sectionCodes) && track.sectionCodes.every((code) => typeof code === "string")) tracks[key] = { label: track.label, sectionCodes: track.sectionCodes as string[] };
    }
  }
  return { code: raw.code, templateVersion: raw.templateVersion, mode: raw.mode, source: typeof raw.source === "string" ? raw.source : "", scoringPolicyCode: raw.scoringPolicyCode, sections, tracks };
}
