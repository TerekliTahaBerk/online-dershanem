/**
 * Deneme Ligi OTURUMLU SINAV (LGS: Sözel → ara → Sayısal) — saf zaman çizelgesi.
 *
 * Oturum planı sürüm ayarlarında (`OdkExamVersion.settings.sessions`) durur;
 * planı olmayan sınavlar eskisi gibi tek oturumdur ve bu modül devreye girmez.
 *
 * Kurallar (sunucu tarafı tek kaynak):
 *  - İlk oturum denemenin başladığı an açılır; süresi kendi süresidir.
 *  - Bir oturum, öğrenci erken kapatınca (`closures`) ya da süresi dolunca kapanır.
 *  - Kapanan oturumdan sonra plandaki ara (`breakAfterMinutes`) başlar; ara
 *    bitince sıradaki oturum TAZE süreyle açılır.
 *  - Her zaman tek bir oturumun soruları yazılabilir; kapanan oturumun cevapları
 *    kilitlidir (okunur, değiştirilemez); sıradaki oturum ara bitmeden açılmaz.
 *  - Tüm zamanlar sınav penceresinin sonuyla (`hardDeadline`) sınırlıdır.
 *  - Son oturumun bitişi denemenin teslim sınırıdır (`finalDeadline`); deneme
 *    kaydındaki `deadlineAt` buna eşitlenir, böylece mevcut otomatik teslim,
 *    puanlama ve kalp atışı akışları değişmeden çalışır.
 */

export type ExamSessionPlanItem = {
  key: string;
  title: string;
  sectionCodes: string[];
  durationMinutes: number;
  /** Bu oturumdan sonraki ara (dk). Son oturumda yok sayılır. */
  breakAfterMinutes: number;
};

export type ExamSessionPlan = ExamSessionPlanItem[];

export type SessionClosure = { key: string; closedAt: Date };

export type SessionStatus = "LOCKED" | "ACTIVE" | "UPCOMING";

export type TimelineSession = ExamSessionPlanItem & {
  index: number;
  startsAt: Date;
  deadlineAt: Date;
  /** Gerçek kapanış (erken kapatma ya da süre); henüz kapanmadıysa null. */
  closedAt: Date | null;
  status: SessionStatus;
};

export type SessionTimeline = {
  phase: "SESSION" | "BREAK" | "FINISHED";
  sessions: TimelineSession[];
  /** Açık oturum (phase=SESSION) ya da aradan sonra açılacak oturum (phase=BREAK). */
  current: TimelineSession | null;
  breakEndsAt: Date | null;
  finalDeadline: Date;
  isLastSession: boolean;
};

const MINUTE = 60_000;

/** LGS tam deneme oturum planı (resmî düzen: Sözel 75 dk, ara, Sayısal 80 dk). */
export const LGS_FULL_SESSION_PLAN: ExamSessionPlan = [
  { key: "SOZEL", title: "Sözel", sectionCodes: ["TURKCE", "INKILAP", "DIN", "INGILIZCE"], durationMinutes: 75, breakAfterMinutes: 45 },
  { key: "SAYISAL", title: "Sayısal", sectionCodes: ["MAT", "FEN"], durationMinutes: 80, breakAfterMinutes: 0 },
];

/** Sürüm ayarlarından oturum planını okur; geçersiz ya da tek oturumluysa null. */
export function readSessionPlan(settings: unknown): ExamSessionPlan | null {
  if (!settings || typeof settings !== "object") return null;
  const raw = (settings as { sessions?: unknown }).sessions;
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const plan: ExamSessionPlan = [];
  const seenKeys = new Set<string>();
  const seenSections = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const value = item as Record<string, unknown>;
    const key = typeof value.key === "string" ? value.key : "";
    const title = typeof value.title === "string" ? value.title : key;
    const duration = Number(value.durationMinutes);
    const breakAfter = Number(value.breakAfterMinutes ?? 0);
    const sectionCodes = Array.isArray(value.sectionCodes) ? value.sectionCodes.filter((code): code is string => typeof code === "string") : [];
    if (!key || seenKeys.has(key) || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(breakAfter) || breakAfter < 0 || !sectionCodes.length) return null;
    if (sectionCodes.some((code) => seenSections.has(code))) return null;
    seenKeys.add(key);
    sectionCodes.forEach((code) => seenSections.add(code));
    plan.push({ key, title, sectionCodes, durationMinutes: Math.round(duration), breakAfterMinutes: Math.round(breakAfter) });
  }
  return plan;
}

/** Planın en uzun süren hâli: tüm oturumlar + aralar (dk). */
export function sessionPlanTotalMinutes(plan: ExamSessionPlan): number {
  return plan.reduce((sum, item, index) => sum + item.durationMinutes + (index < plan.length - 1 ? item.breakAfterMinutes : 0), 0);
}

const minDate = (a: Date, b: Date) => (a.getTime() <= b.getTime() ? a : b);

export function computeSessionTimeline(input: {
  plan: ExamSessionPlan;
  startedAt: Date;
  hardDeadline: Date;
  closures: SessionClosure[];
  now: Date;
}): SessionTimeline {
  const { plan, startedAt, hardDeadline, now } = input;
  const closureByKey = new Map(input.closures.map((closure) => [closure.key, closure.closedAt]));
  const sessions: TimelineSession[] = [];
  let cursor = startedAt;

  plan.forEach((item, index) => {
    const startsAt = minDate(cursor, hardDeadline);
    const deadlineAt = minDate(new Date(startsAt.getTime() + item.durationMinutes * MINUTE), hardDeadline);
    const manual = closureByKey.get(item.key);
    // Erken kapanış ancak oturum açıkken geçerlidir; sınırların dışına taşmaz.
    const manualClose = manual && manual >= startsAt && manual < deadlineAt ? manual : null;
    const end = manualClose ?? deadlineAt;
    const closedAt = manualClose ?? (now >= deadlineAt ? deadlineAt : null);
    sessions.push({ ...item, index, startsAt, deadlineAt, closedAt, status: "UPCOMING" });
    cursor = index < plan.length - 1 ? new Date(end.getTime() + item.breakAfterMinutes * MINUTE) : end;
  });

  const finalDeadline = sessions[sessions.length - 1].closedAt ?? sessions[sessions.length - 1].deadlineAt;
  let phase: SessionTimeline["phase"] = "FINISHED";
  let current: TimelineSession | null = null;
  let breakEndsAt: Date | null = null;

  for (const session of sessions) {
    if (session.closedAt) {
      session.status = "LOCKED";
      continue;
    }
    if (now >= session.startsAt && now < session.deadlineAt) {
      session.status = "ACTIVE";
      if (!current) {
        phase = "SESSION";
        current = session;
      }
    } else if (now < session.startsAt && !current) {
      phase = "BREAK";
      current = session;
      breakEndsAt = session.startsAt;
    }
  }
  if (now >= hardDeadline) {
    phase = "FINISHED";
    current = null;
    breakEndsAt = null;
  }

  return {
    phase,
    sessions,
    current,
    breakEndsAt,
    finalDeadline,
    isLastSession: Boolean(current && current.index === sessions.length - 1),
  };
}

/** Bu bölümün sorusu şu an yazılabilir mi? */
export function sectionWritable(timeline: SessionTimeline, sectionCode: string): boolean {
  return timeline.phase === "SESSION" && Boolean(timeline.current?.sectionCodes.includes(sectionCode));
}

/** Bölüm kodu hangi oturumda? Planda yoksa null (o bölüm hiçbir oturumda yazılamaz). */
export function sessionForSection(plan: ExamSessionPlan, sectionCode: string): ExamSessionPlanItem | null {
  return plan.find((item) => item.sectionCodes.includes(sectionCode)) ?? null;
}

/** Deneme teslim edilebilir mi: son oturum açıkken ya da her şey bittiyse. */
export function canSubmitSessionAttempt(timeline: SessionTimeline): boolean {
  return timeline.phase === "FINISHED" || (timeline.phase === "SESSION" && timeline.isLastSession);
}

/** Öğrenci açık oturumu erken kapatabilir mi (son oturum değil; son oturumu teslim kapatır). */
export function canCloseSession(timeline: SessionTimeline, key: string): "OK" | "ALREADY_CLOSED" | "NOT_ACTIVE" | "LAST_SESSION" {
  const session = timeline.sessions.find((item) => item.key === key);
  if (!session) return "NOT_ACTIVE";
  if (session.status === "LOCKED") return "ALREADY_CLOSED";
  if (timeline.phase !== "SESSION" || timeline.current?.key !== key) return "NOT_ACTIVE";
  if (timeline.isLastSession) return "LAST_SESSION";
  return "OK";
}

export type SessionPlanEdit = { key: string; durationMinutes: number; breakAfterMinutes: number };

/**
 * Personelin oturum planı düzenlemesi (çalışma alanı "Oturumlar" sekmesi).
 * Yalnız süre ve ara değişir; oturum anahtarları, sırası ve bölüm dağılımı
 * şablondan gelir ve korunur. Sonuç ya yeni plan ya da hata metnidir.
 */
export function applySessionPlanEdits(plan: ExamSessionPlan, edits: readonly SessionPlanEdit[]): { plan: ExamSessionPlan } | { error: string } {
  if (edits.length !== plan.length || plan.some((item) => !edits.some((edit) => edit.key === item.key))) {
    return { error: "Oturum listesi sürümdeki planla eşleşmiyor." };
  }
  const next = plan.map((item, index) => {
    const edit = edits.find((candidate) => candidate.key === item.key)!;
    return { ...item, durationMinutes: edit.durationMinutes, breakAfterMinutes: index < plan.length - 1 ? edit.breakAfterMinutes : 0 };
  });
  if (next.some((item) => !Number.isInteger(item.durationMinutes) || item.durationMinutes < 5 || item.durationMinutes > 240)) {
    return { error: "Oturum süresi 5–240 dakika arasında olmalıdır." };
  }
  if (next.some((item) => !Number.isInteger(item.breakAfterMinutes) || item.breakAfterMinutes < 0 || item.breakAfterMinutes > 120)) {
    return { error: "Ara süresi 0–120 dakika arasında olmalıdır." };
  }
  return { plan: next };
}

/** Sürüm süresi = oturum sürelerinin toplamı (aralar hariç). */
export function sessionPlanWorkingMinutes(plan: ExamSessionPlan): number {
  return plan.reduce((sum, item) => sum + item.durationMinutes, 0);
}
