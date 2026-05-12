import { apiClient } from "./client";
import { endpoints } from "./endpoints";
import type {
  ApiResponse,
  AssignmentCard,
  DailyTask,
  ExamResultCard,
  LessonCard,
  PerformanceSummary,
  StudentDashboard,
} from "@/types/api";

export const studentApi = {
  dashboard: () =>
    apiClient
      .get<ApiResponse<StudentDashboard>>(endpoints.studentDashboard)
      .then((r) => r.data),

  lessons: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiClient
      .get<ApiResponse<LessonCard[]>>(
        `${endpoints.studentLessons}${qs ? `?${qs}` : ""}`,
      )
      .then((r) => r.data);
  },

  assignments: (status?: AssignmentCard["status"]) =>
    apiClient
      .get<ApiResponse<AssignmentCard[]>>(
        `${endpoints.studentAssignments}${status ? `?status=${status}` : ""}`,
      )
      .then((r) => r.data),

  examResults: () =>
    apiClient
      .get<ApiResponse<ExamResultCard[]>>(endpoints.studentExamResults)
      .then((r) => r.data),

  dailyTasks: () =>
    apiClient
      .get<ApiResponse<DailyTask[]>>(endpoints.studentDailyTasks)
      .then((r) => r.data),

  toggleTask: (id: string) =>
    apiClient.post<ApiResponse<DailyTask>>(endpoints.studentToggleTask(id)).then((r) => r.data),

  performance: () =>
    apiClient
      .get<ApiResponse<PerformanceSummary>>(endpoints.studentPerformance)
      .then((r) => r.data),
};
