import type { SelectedOutcome } from "@/components/panel/outcome-picker";

export type Attendance = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export type LessonStudent = {
  id: string;
  name: string;
  note: string;
  attendance: Attendance;
  supportLabels: string[];
};

export type NoteTemplate = {
  id: string;
  title: string;
  note: string;
  nextGoal: string;
  homework: string;
};

export type OutcomeSkipReason = "CATALOG_MISSING" | "COMPLETE_LATER" | "NOT_APPLICABLE" | null;

export type LessonData = {
  id: string;
  groupId: string;
  groupName: string;
  subject: string;
  title: string;
  timeLabel: string;
  topic: string;
  note: string;
  nextGoal: string;
  homework: string;
  previousGoal: string | null;
  previousContext: {
    topic: string | null;
    nextGoal: string | null;
    homework: string | null;
  } | null;
  closeVersion: number;
  status: "PLANNED" | "COMPLETED" | "CANCELLED";
  templates: NoteTemplate[];
  students: LessonStudent[];
  outcomeLinks: SelectedOutcome[];
  outcomeSkipReason: OutcomeSkipReason;
};

export type LessonTab = "hazirlik" | "ders" | "kapanis";

export const LESSON_TABS: Array<{ id: LessonTab; label: string }> = [
  { id: "hazirlik", label: "Hazırlık" },
  { id: "ders", label: "Ders" },
  { id: "kapanis", label: "Kapanış" },
];

export function parseLessonTab(value: string | string[] | undefined): LessonTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "hazirlik" || raw === "kapanis" ? raw : "ders";
}

/** Otomatik kaydın "değişti mi" karşılaştırması: yalnız kaydedilen alanlar. */
export function noteSnapshot(value: LessonData): string {
  return JSON.stringify({
    topic: value.topic,
    note: value.note,
    nextGoal: value.nextGoal,
    homework: value.homework,
    students: value.students,
    outcomeLinks: value.outcomeLinks,
    outcomeSkipReason: value.outcomeSkipReason,
  });
}

export const ATTENDANCE_OPTIONS: Array<{ value: Attendance; label: string; active: string }> = [
  { value: "PRESENT", label: "Burada", active: "bg-(--pn-tone-success) text-white" },
  { value: "LATE", label: "Geç", active: "bg-(--pn-tone-warning) text-white" },
  { value: "ABSENT", label: "Yok", active: "bg-(--pn-tone-critical) text-white" },
  { value: "EXCUSED", label: "Mazeret", active: "bg-(--pn-tone-info) text-white" },
];

/** Hazır not şablonları (öğretmenin kişisel şablonlarından önce gelir). */
export const BUILT_IN_TEMPLATES: Array<{ id: string; title: string; note: string; nextGoal: string; homework: string }> = [
  {
    id: "dengeli",
    title: "Dengeli ders şablonu",
    note: "Grup konuyu genel olarak kavradı; temel kazanımlar pekişiyor.",
    nextGoal: "Yeni nesil sorularda doğru stratejiyi seçmek.",
    homework: "Konu tarama çalışmasını tamamla ve yanlışlarını işaretle.",
  },
  {
    id: "destek",
    title: "Destek şablonu",
    note: "Temel adımlarda desteğe ihtiyaç var; birlikte örnek çözümü sürdüreceğiz.",
    nextGoal: "Temel işlem basamaklarını hatasız uygulamak.",
    homework: "Kolay düzey 15 soru çöz; takıldığın soruları işaretle.",
  },
  {
    id: "ileri",
    title: "İleri seviye",
    note: "Kazanımlar güçlü; hız ve farklı çözüm yollarına odaklanabiliriz.",
    nextGoal: "Zorlayıcı sorularda süreyi kontrollü kullanmak.",
    homework: "Orta-zor düzey 20 soru ve süre analizi.",
  },
];
