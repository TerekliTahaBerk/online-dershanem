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
}) {
  const { access, tab, flags } = input;
  const needsOverview = tab === "genel";
  const needsAcademic = tab === "gelisim";
  const needsLessons = tab === "dersler" || tab === "takvim";
  const needsAssignmentsTab = tab === "odevler";
  const needsTeachersTab = tab === "ogretmenler" && access.role === "ADMIN";
  const needsCoaching = tab === "kocluk" && flags.adaptivePlan;
  const needsExams = tab === "denemeler" && flags.mockExamAnalysis;
  const needsRisk = tab === "risk";
  const needsParent = tab === "veli";
  const needsCommerce = tab === "paket" && access.canViewCommerce;
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
