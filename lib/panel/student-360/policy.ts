/** Student 360 erişim ve sekme yükleme kararlarını saf politika olarak tutar. */
import type { UserRole } from "@prisma/client";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";
import {
  isStudent360ViewerRole,
  type Student360Tab,
  type Student360ViewerRole,
} from "@/lib/panel/student-360";
import type { Student360Access } from "./dto";

export function asViewerRole(role: UserRole): Student360ViewerRole | null {
  return isStudent360ViewerRole(role) ? role : null;
}

export function deriveStudent360QueryRequirements(input: {
  access: Student360Access;
  tab: Student360Tab;
  flags: PanelFeatureFlags;
  /** Üst sekme birden çok bölümü birlikte gösterir (ör. Genel = genel + öğretmenler + veli). */
  sections?: readonly Student360Tab[];
}) {
  const { access, tab, flags } = input;
  const shown = new Set<Student360Tab>(input.sections ?? [tab]);
  const has = (section: Student360Tab) => shown.has(section);
  const needsOverview = has("genel");
  const needsAcademic = has("gelisim");
  const needsLessons = has("dersler") || has("takvim");
  const needsAssignmentsTab = has("odevler");
  const needsTeachersTab = has("ogretmenler") && access.role === "ADMIN";
  const needsCoaching = has("kocluk") && flags.adaptivePlan;
  const needsExams = has("denemeler") && flags.mockExamAnalysis;
  const needsRisk = has("risk");
  const needsParent = has("veli");
  const needsCommerce = has("paket") && access.canViewCommerce;
  const needsAdminForms = access.role === "ADMIN";
  const needsExamSignals = needsExams || needsOverview || needsAcademic;
  const needsAssignmentList = needsAcademic || needsOverview || needsAssignmentsTab;

  return {
    needsOverview,
    needsAcademic,
    needsLessons,
    needsAssignmentsTab,
    needsTeachersTab,
    needsCoaching,
    needsExams,
    needsRisk,
    needsParent,
    needsCommerce,
    needsAdminForms,
    needsExamSignals,
    needsAssignmentList,
  };
}
