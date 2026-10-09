/**
 * Mobil OD Bugün okuma modeli — SAF fonksiyonlar (sunucu sorgusu yok).
 *
 * Öncelik kuralı YAZILMAZ: "Şimdi" eylemi ve sıradaki adımlar web ana
 * sayfasıyla aynı `buildStudentHomeActionPlan` çıktısından gelir; Bugün
 * akışı aynı `buildSerializedUnifiedToday` çıktısıdır. Burada yalnız:
 *  - OD dışı öğeler elenir (Yön planı / Deneme Ligi asla OD satırı olmaz),
 *  - aynı varlık (ders, ödev, telafi, tekrar) iki satır olmaz,
 *  - liste kronolojik sıralanır,
 *  - web `href`'i yerine native hedef (`MobileOdTarget`) eklenir.
 */

import type {
  MobileOdAction,
  MobileOdHome,
  MobileOdTarget,
  MobileOdTodayItem,
  MobileOdWeek,
} from "@/lib/mobile-contracts/student";
import { MOBILE_STUDENT_CONTRACT_VERSION } from "@/lib/mobile-contracts/student";
import { lessonJoinWindow } from "@/lib/panel/lesson-join";
import type { StudentHomeAction } from "@/lib/panel/student-home-actions";
import type { SerializedUnifiedTodayItem } from "@/lib/student-success/unified-today-serializer";

/** Bugün listesinin üst sınırı (web: 8; mobilde kronolojik tam gün). */
export const OD_TODAY_LIMIT = 20;

function entityId(entityKey: string, prefix: string): string | null {
  return entityKey.startsWith(`${prefix}:`) ? entityKey.slice(prefix.length + 1) || null : null;
}

function recoveryLessonId(href: string): string | null {
  const query = href.split("?")[1];
  if (!query) return null;
  return new URLSearchParams(query).get("lessonId") || null;
}

export function actionTarget(action: StudentHomeAction): MobileOdTarget {
  if (action.actionKind === "OPEN_LESSON") {
    const lessonId = entityId(action.entityKey, "lesson");
    return lessonId ? { type: "lesson", lessonId } : { type: "lessons" };
  }
  if (action.actionKind === "OPEN_RECOVERY") return { type: "recovery", lessonId: recoveryLessonId(action.href) };
  if (action.actionKind === "OPEN_REVIEW") return { type: "review" };
  return { type: "none" };
}

type OdActionKind = MobileOdAction["kind"];
const OD_ACTION_KINDS: ReadonlySet<string> = new Set<OdActionKind>(["OPEN_LESSON", "OPEN_RECOVERY", "OPEN_REVIEW"]);

/** OD çalışma alanında gösterilebilir eylem mi? (Yön planı / Deneme Ligi değil.) */
export function isOdAction(action: StudentHomeAction): boolean {
  return (action.product === "OD" || action.product === "SHARED") && OD_ACTION_KINDS.has(action.actionKind);
}

export function toOdAction(action: StudentHomeAction, now: Date): MobileOdAction {
  return {
    id: action.id,
    kind: action.actionKind as OdActionKind,
    reasonCode: action.reasonCode,
    title: action.title,
    description: action.description ? action.description : null,
    reason: action.reason,
    ctaLabel: action.ctaLabel,
    joinable: action.actionKind === "OPEN_LESSON" && lessonJoinWindow(new Date(action.sortTime), now).joinsNow,
    target: actionTarget(action),
    webPath: action.href,
  };
}

/** Birleşik akış öğesinin varlık anahtarı — eylem `entityKey` biçimiyle aynı (`lesson:<id>`). */
function feedEntityKey(item: SerializedUnifiedTodayItem): string {
  return item.id;
}

function feedTarget(item: SerializedUnifiedTodayItem): MobileOdTarget {
  const lessonId = item.kind === "LESSON" ? entityId(item.id, "lesson") : null;
  if (lessonId) return { type: "lesson", lessonId };
  const assignmentId = item.kind === "ASSIGNMENT_DUE" ? entityId(item.id, "assignment") : null;
  if (assignmentId) return { type: "assignment", assignmentId };
  return { type: "none" };
}

function feedKind(item: SerializedUnifiedTodayItem): MobileOdTodayItem["kind"] {
  return item.kind === "LESSON" || item.kind === "ASSIGNMENT_DUE" ? item.kind : "OTHER";
}

function actionAsTodayItem(action: StudentHomeAction): MobileOdTodayItem {
  const time = Number.isFinite(action.sortTime) && action.sortTime > 0 && action.sortTime < Number.MAX_SAFE_INTEGER ? new Date(action.sortTime).toISOString() : null;
  const kind: MobileOdTodayItem["kind"] = action.actionKind === "OPEN_LESSON" ? "LESSON" : action.actionKind === "OPEN_RECOVERY" ? "RECOVERY" : "REVIEW";
  return {
    id: action.entityKey,
    kind,
    title: action.title,
    subtitle: action.reason || null,
    startsAt: kind === "LESSON" ? time : null,
    dueAt: kind === "LESSON" ? null : time,
    isFlexible: false,
    target: actionTarget(action),
    webPath: action.href,
  };
}

function timeOf(item: MobileOdTodayItem): number {
  const value = item.isFlexible ? null : (item.startsAt ?? item.dueAt);
  return value ? Date.parse(value) : Number.POSITIVE_INFINITY;
}

/**
 * Bugün listesi: birleşik akış (OD) + akışta olmayan OD eylemleri, "Şimdi"
 * eyleminin varlığı hariç, varlık başına tek satır, saate göre sıralı.
 */
export function buildOdToday(input: {
  nowAction: StudentHomeAction | null;
  actions: StudentHomeAction[];
  feed: SerializedUnifiedTodayItem[];
}): MobileOdTodayItem[] {
  const used = new Set<string>(input.nowAction ? [input.nowAction.entityKey] : []);
  const rows: MobileOdTodayItem[] = [];
  for (const item of input.feed) {
    if (item.product !== "OD") continue;
    const key = feedEntityKey(item);
    if (used.has(key)) continue;
    used.add(key);
    rows.push({
      id: key,
      kind: feedKind(item),
      title: item.title,
      subtitle: item.subtitle,
      startsAt: item.startsAt,
      dueAt: item.dueAt,
      isFlexible: item.isFlexible,
      target: feedTarget(item),
      webPath: item.href,
    });
  }
  for (const action of input.actions) {
    if (!isOdAction(action) || used.has(action.entityKey)) continue;
    used.add(action.entityKey);
    rows.push(actionAsTodayItem(action));
  }
  return rows
    .sort((left, right) => {
      const a = timeOf(left);
      const b = timeOf(right);
      if (a !== b) return a < b ? -1 : 1;
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    })
    .slice(0, OD_TODAY_LIMIT);
}

export function firstNameOf(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

export function buildOdHome(input: {
  now: Date;
  fullName: string | null;
  hasProfile: boolean;
  nowAction: StudentHomeAction | null;
  actions: StudentHomeAction[];
  feed: SerializedUnifiedTodayItem[];
  week: MobileOdWeek | null;
  insight: { sentence: string; isEmpty: boolean } | null;
}): MobileOdHome {
  const base = {
    contractVersion: MOBILE_STUDENT_CONTRACT_VERSION,
    scope: "OD" as const,
    generatedAt: input.now.toISOString(),
    firstName: firstNameOf(input.fullName),
  };
  if (!input.hasProfile) {
    return { ...base, state: "NO_PROFILE", now: null, today: [], week: null, insight: null };
  }
  const nowAction = input.nowAction && isOdAction(input.nowAction) ? input.nowAction : null;
  return {
    ...base,
    state: "READY",
    now: nowAction ? toOdAction(nowAction, input.now) : null,
    today: buildOdToday({ nowAction, actions: input.actions, feed: input.feed }),
    week: input.week,
    insight: input.insight,
  };
}
