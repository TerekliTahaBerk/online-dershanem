import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/api/student";

export const studentKeys = {
  dashboard: ["student", "dashboard"] as const,
  lessons: (range?: { from?: string; to?: string }) =>
    ["student", "lessons", range] as const,
  assignments: (status?: string) => ["student", "assignments", status] as const,
  exams: () => ["student", "exams"] as const,
  tasks: () => ["student", "tasks"] as const,
  performance: () => ["student", "performance"] as const,
};

export function useStudentDashboard() {
  return useQuery({
    queryKey: studentKeys.dashboard,
    queryFn: studentApi.dashboard,
  });
}

export function useStudentLessons(range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: studentKeys.lessons(range),
    queryFn: () => studentApi.lessons(range),
  });
}

export function useStudentAssignments(status?: Parameters<typeof studentApi.assignments>[0]) {
  return useQuery({
    queryKey: studentKeys.assignments(status),
    queryFn: () => studentApi.assignments(status),
  });
}

export function useStudentExams() {
  return useQuery({ queryKey: studentKeys.exams(), queryFn: studentApi.examResults });
}

export function useStudentDailyTasks() {
  return useQuery({ queryKey: studentKeys.tasks(), queryFn: studentApi.dailyTasks });
}
