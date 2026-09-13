/** Student 360 sunum sözleşmelerini ve dışarı açılan veri şekillerini tanımlar. */
import type { ProductCode } from "@prisma/client";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";
import type {
  Student360Action,
  Student360PackageStatus,
  Student360RiskSummary,
  Student360Tab,
  Student360ViewerRole,
} from "@/lib/panel/student-360";

export type Student360AccessMode = "admin" | "teacher_group" | "teacher_direct" | "coach";

export type Student360Access = {
  role: Student360ViewerRole;
  mode: Student360AccessMode;
  studentProfileId: string;
  studentUserId: string;
  canViewCommerce: boolean;
  hasCoachAccess: boolean;
  groupIds: string[];
  subjects: string[] | null;
  viewerUserId: string;
};

export type Student360Summary = {
  fullName: string;
  email: string;
  classLevel: string | null;
  targetGoal: string | null;
  products: ProductCode[];
  productLabels: string[];
  groups: { id: string; name: string; subject: string; teacherName: string }[];
  coachName: string | null;
  packageStatus: Student360PackageStatus;
  lastActivityAt: Date | null;
  risk: Student360RiskSummary;
};

export type Student360OverviewTab = {
  weekAttendancePresent: number;
  weekAttendanceTotal: number;
  completedAssignments: number;
  assignmentTotal: number;
  planCompletionPercent: number | null;
  recentExams: { id: string; title: string; takenAt: Date; totalNet: number }[];
  activeRiskReasons: string[];
  upcomingLessons: { id: string; title: string; startsAt: Date }[];
  openInterventions: { id: string; reason: string; status: string; dueAt: Date }[];
  openHelpRequests: number;
  nearestOdkExamTitle: string | null;
};

export type Student360AcademicTab = {
  subjectPerformance: { subject: string; avgNet: number | null; sampleSize: number }[];
  outcomeHints: { title: string; subject: string; type: string }[];
  assignmentHistory: {
    id: string;
    title: string;
    status: string;
    dueAt: Date | null;
    groupName: string;
  }[];
  reviewDueCount: number;
  evidenceCount: number;
  unifiedOutcomes: {
    outcomeId: string;
    code: string;
    title: string;
    subjectName: string;
    unitName: string;
    status: string;
    statusLabel: string;
    evidence: {
      lesson: string | null;
      assignment: string | null;
      mockExam: string | null;
      coaching: string | null;
    };
    explanation: { source: string; detail: string }[];
  }[];
};

export type Student360LessonsTab = {
  past: {
    id: string;
    title: string;
    startsAt: Date;
    attendance: string | null;
    note: string | null;
  }[];
  upcoming: { id: string; title: string; startsAt: Date; groupName: string }[];
  recoveryOpenCount: number;
};

export type Student360CoachingTab = {
  coachName: string | null;
  cadenceDays: number | null;
  overdue: boolean;
  sharedNote: string | null;
  focus: string | null;
  goals: { id: string; label: string; target: number; current: number | null }[];
  checkIns: { id: string; createdAt: Date; energy: string; barrier: string; shared: boolean }[];
  plan: {
    weekStart: Date;
    status: string;
    completionPercent: number | null;
    tasks: { id: string; title: string; status: string; scheduledFor: Date }[];
  } | null;
  feedbackCategory: string | null;
  timeline: { id: string; occurredAt: Date; title: string; summary: string | null; kind: string }[];
};

export type Student360ExamsTab = {
  recent: {
    id: string;
    exam: string;
    takenAt: Date;
    totalNet: number;
    sections: { subject: string; net: number }[];
  }[];
  netDelta: number | null;
  subjectDeltas: { subject: string; delta: number | null }[];
  recurringGaps: string[];
};

export type Student360RiskTab = {
  summary: Student360RiskSummary;
  cases: {
    id: string;
    reasonCode: string;
    explanation: string;
    suggestedAction: string;
    status: string;
    dueAt: Date;
    ownerName: string | null;
    createdAt: Date;
  }[];
};

export type Student360ParentTab = {
  parents: {
    linkId: string;
    id: string;
    fullName: string;
    email: string;
    relationship: string | null;
  }[];
  digests: {
    id: string;
    weekStart: Date;
    status: string;
    publishedAt: Date | null;
    trendBand: string;
    supportArea: string;
  }[];
};

export type Student360CommerceTab = {
  memberships: { product: ProductCode; label: string; expiresAt: Date | null }[];
  orders: {
    id: string;
    packageName: string;
    status: string;
    provisioningStatus: string;
    provisioningError: string | null;
    createdAt: Date;
    totalCents: number;
  }[];
  packageStatus: Student360PackageStatus;
};

export type Student360TeachersTab = {
  links: {
    id: string;
    subject: string;
    teacherId: string;
    teacherName: string;
    startedAt: Date;
  }[];
};

export type Student360AssignmentsTab = {
  items: {
    id: string;
    title: string;
    status: string;
    dueAt: Date | null;
    groupName: string;
  }[];
};

export type Student360Bundle = {
  access: Student360Access;
  flags: PanelFeatureFlags;
  basePath: string;
  tab: Student360Tab;
  tabs: Student360Tab[];
  actions: Student360Action[];
  summary: Student360Summary;
  overview: Student360OverviewTab | null;
  academic: Student360AcademicTab | null;
  lessons: Student360LessonsTab | null;
  assignmentsTab: Student360AssignmentsTab | null;
  teachersTab: Student360TeachersTab | null;
  coaching: Student360CoachingTab | null;
  exams: Student360ExamsTab | null;
  riskTab: Student360RiskTab | null;
  parent: Student360ParentTab | null;
  commerce: Student360CommerceTab | null;
  coachOptions: { id: string; label: string }[];
  parentOptions: { id: string; label: string }[];
  teacherOptions: { id: string; label: string }[];
  currentCoachId: string | null;
  currentCadenceDays: number | null;
};
