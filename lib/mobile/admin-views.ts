import { MOBILE_ADMIN_CONTRACT_VERSION, type MobileInterventionInbox, type MobileOperationsCenter, type MobileOpsGroupFilter } from "@/lib/mobile-contracts/admin";
import {
  INTERVENTION_ACTIVITY_LABELS,
  INTERVENTION_FALSE_POSITIVE_LABELS,
  INTERVENTION_MANUAL_REASON_OPTIONS,
  INTERVENTION_OUTCOME_LABELS,
  INTERVENTION_REASON_LABELS,
  INTERVENTION_SNOOZE_DAYS,
  INTERVENTION_STATUS_LABELS,
} from "@/lib/panel/intervention-vocabulary";
import { OPS_GROUP_FILTERS, type AdminOperationsCenterSnapshot } from "@/lib/panel/admin-operations-center";

/**
 * YÖNETİM MOBİL PROJEKSİYONLARI (Faz 1). İş kuralı yeniden hesaplanmaz:
 * web Operasyon Merkezi'nin ürettiği anlık görüntüden alan seçilir, tarihler
 * ISO olur, web yolları sorgusuz `/panel/...` yoluna indirgenir.
 */

/** Sorgu / parça atılır; `/panel` dışı veya bozuk yol null (mobil hedef üretmez). */
export function toPanelPath(href: string | null | undefined): string | null {
  if (!href) return null;
  const path = href.trim().split(/[?#]/)[0].replace(/\/+$/, "");
  if (!/^\/panel(\/[\w\-./]*)?$/.test(path) || path.includes("..")) return null;
  return path;
}

export function toMobileOperationsCenter(snapshot: AdminOperationsCenterSnapshot, group: MobileOpsGroupFilter): MobileOperationsCenter {
  const counts = new Map<string, number>();
  for (const action of snapshot.actions) counts.set(action.group, (counts.get(action.group) ?? 0) + 1);
  return {
    contractVersion: MOBILE_ADMIN_CONTRACT_VERSION,
    generatedAt: snapshot.generatedAt.toISOString(),
    partialData: snapshot.partialData,
    group,
    groups: OPS_GROUP_FILTERS.map((filter) => ({ id: filter.id, label: filter.label, count: filter.id === "tumu" ? snapshot.actions.length : (counts.get(filter.id) ?? 0) })),
    openActionCount: snapshot.openActionCount,
    blockingCount: snapshot.blockingCount,
    actions: snapshot.actions
      .filter((action) => group === "tumu" || action.group === group)
      .map((action) => ({
        id: action.id,
        code: action.code,
        group: action.group,
        severity: action.severity,
        title: action.title,
        subject: action.subject,
        ageLabel: action.ageLabel,
        owner: action.owner,
        ctaLabel: action.ctaLabel,
        createdAt: action.createdAt ? action.createdAt.toISOString() : null,
        webPath: toPanelPath(action.href),
      })),
    summary: snapshot.summary.map((tile) => ({
      id: tile.id,
      label: tile.label,
      value: tile.value === null ? null : Math.max(0, Math.trunc(tile.value)),
      hint: tile.hint,
      tone: tile.tone,
      available: tile.available,
      webPath: toPanelPath(tile.href),
    })),
    risk: { critical: snapshot.risk.critical, watch: snapshot.risk.watch, normal: snapshot.risk.normal, total: snapshot.risk.total },
    health: snapshot.health.map((check) => ({ id: check.id, label: check.label, status: check.status, detail: check.detail })),
    activities: snapshot.activities.map((activity) => ({
      id: activity.id,
      text: activity.text,
      actorLabel: activity.actorLabel,
      occurredAt: activity.occurredAt.toISOString(),
      webPath: toPanelPath(activity.href),
    })),
  };
}

const asOptions = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

/** Müdahale kutusu: satırlar `getInterventionInbox` çıktısıdır (zaten ISO); etiketler tek sözlükten. */
export function toMobileInterventionInbox(rows: MobileInterventionInbox["rows"], students: { id: string; name: string }[]): MobileInterventionInbox {
  return {
    contractVersion: MOBILE_ADMIN_CONTRACT_VERSION,
    rows,
    students,
    vocabulary: {
      reasons: asOptions(INTERVENTION_REASON_LABELS),
      statuses: asOptions(INTERVENTION_STATUS_LABELS),
      outcomes: asOptions(INTERVENTION_OUTCOME_LABELS),
      falsePositiveReasons: asOptions(INTERVENTION_FALSE_POSITIVE_LABELS),
      activities: asOptions(INTERVENTION_ACTIVITY_LABELS),
      manualReasons: INTERVENTION_MANUAL_REASON_OPTIONS.map((entry) => ({ value: entry.value, label: entry.label })),
      snoozeDays: [...INTERVENTION_SNOOZE_DAYS],
    },
  };
}
