/**
 * TanStack Query key factory — single source of truth.
 *
 * Konvansiyon: hierarchical, invalidation-friendly.
 *   queryKeys.students.all              // tüm öğrenci query'lerini invalidate
 *   queryKeys.students.list(filters)    // belirli filter ile liste
 *   queryKeys.students.detail(id)       // detay
 */

export const queryKeys = {
  students: {
    all: ["students"] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.students.all, "list", filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.students.all, "detail", id] as const,
    timeline: (id: string) => [...queryKeys.students.all, "timeline", id] as const
  },
  teachers: {
    all: ["teachers"] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.teachers.all, "list", filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.teachers.all, "detail", id] as const
  },
  parents: {
    all: ["parents"] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.parents.all, "list", filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.parents.all, "detail", id] as const
  },
  classrooms: {
    all: ["classrooms"] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.classrooms.all, "list", filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.classrooms.all, "detail", id] as const
  },
  lessons: {
    all: ["lessons"] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.lessons.all, "list", filters ?? {}] as const,
    calendar: (range: { from: string; to: string }) => [...queryKeys.lessons.all, "calendar", range] as const
  },
  assignments: {
    all: ["assignments"] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.assignments.all, "list", filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.assignments.all, "detail", id] as const
  },
  packages: {
    all: ["packages"] as const,
    list: () => [...queryKeys.packages.all, "list"] as const,
    detail: (id: string) => [...queryKeys.packages.all, "detail", id] as const
  },
  payments: {
    all: ["payments"] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.payments.all, "list", filters ?? {}] as const
  },
  accounting: {
    all: ["accounting"] as const,
    ledger: (filters?: Record<string, unknown>) => [...queryKeys.accounting.all, "ledger", filters ?? {}] as const,
    summary: (period: string) => [...queryKeys.accounting.all, "summary", period] as const
  },
  inbox: {
    all: ["inbox"] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.inbox.all, "list", filters ?? {}] as const,
    unreadCount: () => [...queryKeys.inbox.all, "unread-count"] as const
  },
  statistics: {
    all: ["statistics"] as const,
    dashboard: (panel: "admin" | "teacher" | "student" | "parent") => [...queryKeys.statistics.all, "dashboard", panel] as const
  },
  search: {
    global: (q: string) => ["search", "global", q] as const
  },
  me: {
    all: ["me"] as const,
    profile: () => [...queryKeys.me.all, "profile"] as const,
    permissions: () => [...queryKeys.me.all, "permissions"] as const
  }
} as const;
