import { createHash } from "node:crypto";
import { z } from "zod";

export const TEACHER_AI_PROMPT_VERSION = "teacher-draft-v1" as const;
export const TEACHER_AI_MAX_OUTPUT_TOKENS = 600;

export const aiDraftTaskSchema = z.enum(["ASSIGNMENT", "MINI_CHECK"]);
export type AiDraftTask = z.infer<typeof aiDraftTaskSchema>;

export const aiDraftContentSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(10).max(1200),
  checkPrompt: z.string().trim().min(5).max(300),
  successCriteria: z.array(z.string().trim().min(3).max(160)).min(2).max(3),
  citations: z.array(z.string().trim().min(1).max(80)).min(1).max(6),
}).strict();
export type AiDraftContent = z.infer<typeof aiDraftContentSchema>;

export type TeacherAiSource = {
  taskType: AiDraftTask;
  subject: string;
  level: string | null;
  lessonTitle: string;
  topic: string | null;
  sharedNote: string | null;
  nextGoal: string | null;
  homework: string | null;
  outcomes: Array<{ code: string; title: string }>;
};

export type SafeTeacherAiSource = {
  taskType: AiDraftTask;
  subject: string;
  level: string | null;
  lessonTitle: string;
  sources: Array<{ id: string; label: string; text: string }>;
};

const injectionPattern = /(ignore|disregard|forget).{0,30}(instruction|prompt)|system\s+(prompt|message)|developer\s+message|önceki.{0,30}(talimat|komut)|sistem\s+(mesajı|talimatı)/i;
const forbiddenOutputPattern = /(tanı|depres|anksiyete|tembel|başarısız öğrenci|ceza|sınıf sırası|yüzdelik dilim|kesin kazanacak|garanti)/i;

function compact(value: string | null | undefined, max = 600) {
  return value?.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) || "";
}

export function redactSensitiveText(value: string, knownNames: string[] = []) {
  let text = compact(value);
  let redactionCount = 0;
  const patterns = [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    /(?:\+?90\s*)?(?:\(?0?5\d{2}\)?[\s.-]*)\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g,
    /\b[1-9]\d{10}\b/g,
    /https?:\/\/\S+/gi,
  ];
  for (const pattern of patterns) text = text.replace(pattern, () => { redactionCount += 1; return "[KİŞİSEL VERİ ÇIKARILDI]"; });
  for (const name of knownNames.filter((item) => item.trim().length >= 3).sort((a, b) => b.length - a.length)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(escaped, "gi"), () => { redactionCount += 1; return "[ÖĞRENCİ ADI ÇIKARILDI]"; });
  }
  return { text, redactionCount };
}

export function buildSafeTeacherAiSource(input: TeacherAiSource, knownNames: string[] = []) {
  const sourceRows: Array<{ id: string; label: string; text: string }> = [];
  let redactionCount = 0; let injectionDetected = false;
  const add = (id: string, label: string, raw: string | null | undefined) => {
    const compacted = compact(raw);
    if (!compacted) return;
    if (injectionPattern.test(compacted)) injectionDetected = true;
    const redacted = redactSensitiveText(compacted, knownNames); redactionCount += redacted.redactionCount;
    sourceRows.push({ id, label, text: redacted.text });
  };
  add("LESSON_TITLE", "Ders başlığı", input.lessonTitle);
  add("LESSON_TOPIC", "Ortak ders konusu", input.topic);
  add("SHARED_NOTE", "Gruba ortak not", input.sharedNote);
  add("NEXT_GOAL", "Sonraki hedef", input.nextGoal);
  add("HOMEWORK", "Öğretmenin çalışma notu", input.homework);
  for (const outcome of input.outcomes.slice(0, 3)) add(`OUTCOME:${compact(outcome.code, 30)}`, `Kazanım ${compact(outcome.code, 30)}`, outcome.title);
  const safe: SafeTeacherAiSource = { taskType: input.taskType, subject: compact(input.subject, 80), level: compact(input.level, 40) || null, lessonTitle: compact(input.lessonTitle, 140), sources: sourceRows };
  const sourceHash = createHash("sha256").update(JSON.stringify(safe)).digest("hex");
  return { safe, sourceHash, redactionCount, injectionDetected };
}

export function fallbackTeacherDraft(source: SafeTeacherAiSource): AiDraftContent {
  const topic = source.sources.find((item) => item.id === "LESSON_TOPIC")?.text || source.lessonTitle;
  const next = source.sources.find((item) => item.id === "NEXT_GOAL")?.text;
  const outcome = source.sources.find((item) => item.id.startsWith("OUTCOME:"));
  const citations = [outcome?.id, source.sources.find((item) => item.id === "LESSON_TOPIC")?.id, "LESSON_TITLE"].filter((item, index, all): item is string => Boolean(item) && all.indexOf(item) === index).slice(0, 3);
  if (source.taskType === "MINI_CHECK") return { title: `${topic} · kısa kontrol`, body: "Öğrenciden çözüm yolunu kısa biçimde açıklamasını ve son adımı kontrol etmesini isteyin.", checkPrompt: next ? `${next} hedefine giderken hangi adımı önce kontrol edersin?` : `${topic} konusunda kullandığın ana adımı kendi cümlenle açıklar mısın?`, successCriteria: ["Ana adımı kendi cümlesiyle açıklar", "Sonucunu bir kontrol adımıyla doğrular"], citations };
  return { title: `${topic} çalışması`, body: next ? `${topic} konusunu kısa bir örnekle tekrar et. Ardından şu hedefe yönelik iki uygulama yap: ${next}` : `${topic} konusunu kısa bir örnekle tekrar et ve çözüm yolunu iki uygulamada göster.`, checkPrompt: "Çözümünde en çok hangi adımı kontrol etmen gerektiğini bir cümleyle yaz.", successCriteria: ["Çözüm yolunu açıkça gösterir", "Sonucunu kontrol eder"], citations };
}

export function validateTeacherAiOutput(content: unknown, allowedSourceIds: string[]) {
  const parsed = aiDraftContentSchema.safeParse(content);
  if (!parsed.success) return { ok: false as const, reason: "SCHEMA" as const };
  if (parsed.data.citations.some((citation) => !allowedSourceIds.includes(citation))) return { ok: false as const, reason: "UNSUPPORTED_CITATION" as const };
  const joined = `${parsed.data.title} ${parsed.data.body} ${parsed.data.checkPrompt} ${parsed.data.successCriteria.join(" ")}`;
  if (forbiddenOutputPattern.test(joined) || /https?:\/\/|\b\S+@\S+\.\S+\b/i.test(joined)) return { ok: false as const, reason: "UNSAFE_CONTENT" as const };
  return { ok: true as const, content: parsed.data };
}

export function changedFieldCount(original: AiDraftContent, reviewed: AiDraftContent) {
  return ["title", "body", "checkPrompt", "successCriteria"].filter((key) => JSON.stringify(original[key as keyof AiDraftContent]) !== JSON.stringify(reviewed[key as keyof AiDraftContent])).length;
}
