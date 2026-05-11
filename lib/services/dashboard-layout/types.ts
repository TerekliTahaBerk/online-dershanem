import type { DashboardPanelKey } from "@prisma/client";

export type DashboardWidgetItem = {
  key: string;
  visible: boolean;
};

export type DashboardLayoutData = {
  items: DashboardWidgetItem[];
};

/** Admin dashboard için sabit widget kataloğu (key, label) */
export const ADMIN_WIDGETS = [
  { key: "kpi.activeStudents", label: "KPI · Aktif Öğrenci" },
  { key: "kpi.newStudents30d", label: "KPI · 30g Yeni Kayıt" },
  { key: "kpi.income30d", label: "KPI · 30g Gelir" },
  { key: "kpi.pendingPayments", label: "KPI · Bekleyen Ödeme" },
  { key: "kpi.todayLessons", label: "KPI · Bugünkü Ders" },
  { key: "kpi.activeTeachers", label: "KPI · Aktif Öğretmen" },
  { key: "chart.revenue14d", label: "Grafik · Gelir/Gider 14g" },
  { key: "chart.userDistribution", label: "Grafik · Kullanıcı Dağılımı" },
  { key: "chart.enrollment30d", label: "Grafik · Yeni Kayıt 30g" },
  { key: "list.teacherWorkload", label: "Liste · Öğretmen Yoğunluğu" },
  { key: "list.riskStudents", label: "Liste · Riskli Öğrenciler" },
  { key: "list.recentAudit", label: "Liste · Son Aktivite" },
] as const;

export const TEACHER_WIDGETS = [
  { key: "kpi.todayLessons", label: "KPI · Bugünkü Ders" },
  { key: "kpi.totalStudents", label: "KPI · Toplam Öğrenci" },
  { key: "kpi.openAssignments", label: "KPI · Açık Ödev" },
  { key: "list.upcomingLessons", label: "Liste · Yaklaşan Dersler" },
  { key: "list.pendingSubmissions", label: "Liste · Bekleyen Teslim" },
] as const;

export const STUDENT_WIDGETS = [
  { key: "kpi.todayLessons", label: "KPI · Bugünkü Ders" },
  { key: "kpi.openAssignments", label: "KPI · Açık Ödev" },
  { key: "list.upcomingLessons", label: "Liste · Yaklaşan Dersler" },
  { key: "list.pendingAssignments", label: "Liste · Bekleyen Ödevler" },
] as const;

export const PARENT_WIDGETS = [
  { key: "kpi.children", label: "KPI · Çocuk Sayısı" },
  { key: "kpi.upcomingLessons", label: "KPI · Yaklaşan Ders" },
  { key: "kpi.pendingPayments", label: "KPI · Bekleyen Ödeme" },
  { key: "list.upcomingLessons", label: "Liste · Yaklaşan Dersler" },
  { key: "list.recentPayments", label: "Liste · Son Ödemeler" },
] as const;

const PANEL_CATALOG: Record<DashboardPanelKey, readonly { key: string; label: string }[]> = {
  ADMIN: ADMIN_WIDGETS,
  TEACHER: TEACHER_WIDGETS,
  STUDENT: STUDENT_WIDGETS,
  PARENT: PARENT_WIDGETS,
};

export function getCatalog(panel: DashboardPanelKey) {
  return PANEL_CATALOG[panel];
}

/** Belirli panel için varsayılan layout: tüm widget'lar sıralı ve visible */
export function defaultLayout(panel: DashboardPanelKey): DashboardLayoutData {
  return {
    items: PANEL_CATALOG[panel].map((w) => ({ key: w.key, visible: true })),
  };
}

/**
 * Kayıtlı layout + katalog karışımı:
 * - kayıtlı sırayı korur
 * - kayıtlı olmayan yeni widget'ları sona ekler (visible: true)
 * - katalogda olmayan eski key'leri filtreler
 */
export function reconcileLayout(
  panel: DashboardPanelKey,
  saved: DashboardLayoutData | null,
): DashboardLayoutData {
  const catalog = PANEL_CATALOG[panel];
  const knownKeys = new Set(catalog.map((w) => w.key));
  const savedItems = saved?.items ?? [];
  const seen = new Set<string>();
  const out: DashboardWidgetItem[] = [];
  for (const it of savedItems) {
    if (knownKeys.has(it.key) && !seen.has(it.key)) {
      out.push({ key: it.key, visible: it.visible !== false });
      seen.add(it.key);
    }
  }
  for (const w of catalog) {
    if (!seen.has(w.key)) out.push({ key: w.key, visible: true });
  }
  return { items: out };
}
