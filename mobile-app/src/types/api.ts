import type { UserRole } from "./user";

/** Standart API zarfı — tüm /api/v1/mobile uçları bu şemayı döner. */
export type ApiResponse<T> = {
  data: T;
  meta?: { nextCursor?: string | null; total?: number };
};

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category:
    | "SYSTEM"
    | "FINANCE"
    | "EDUCATION"
    | "ANNOUNCEMENT"
    | "TEACHER_MESSAGE"
    | "ATTENDANCE"
    | "ASSIGNMENT";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface DailyTask {
  id: string;
  title: string;
  description?: string | null;
  /** Polymorphic kaynak — frontend tıklandığında route'lar. */
  sourceType:
    | "ASSIGNMENT"
    | "LESSON"
    | "EXAM"
    | "MANUAL"
    | "GOAL";
  sourceId?: string | null;
  dueAt?: string | null;
  isDone: boolean;
  doneAt?: string | null;
}

export interface LessonCard {
  id: string;
  title: string;
  subject: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetLink: string | null;
  teacher: { id: string; fullName: string };
  classroom: { id: string; name: string } | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
}

export interface AssignmentCard {
  id: string;
  title: string;
  subject: string | null;
  dueAt: string | null;
  status: "PENDING" | "SUBMITTED" | "GRADED" | "LATE" | "MISSED";
  teacher: { id: string; fullName: string };
  score?: number | null;
  maxScore?: number | null;
}

export interface ExamResultCard {
  id: string;
  title: string;
  examType: string | null;
  takenAt: string;
  net: number | null;
  correct: number;
  wrong: number;
  blank: number;
  ranking: number | null;
}

export interface PerformanceSummary {
  weeklyNetAvg: number | null;
  attendancePercent: number | null;
  completedAssignments: number;
  pendingAssignments: number;
  streakDays: number;
  weeklyGoal: { target: number; current: number; unit: string } | null;
}

export interface StudentDashboard {
  user: { id: string; name: string; role: UserRole };
  todayTasks: DailyTask[];
  todayLessons: LessonCard[];
  performance: PerformanceSummary;
  notifications: NotificationItem[];
  motivation: { quote: string; author: string | null } | null;
}
