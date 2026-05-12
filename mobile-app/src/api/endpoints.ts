/**
 * Mobil API endpoint sözlüğü — yeniden adlandırma ve typo'lara karşı tek nokta.
 * Backend tarafında `app/api/v1/mobile/...` altında karşılığı olacak.
 */
export const endpoints = {
  // Auth
  login: "/auth/login",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  // Bunlar /api/v1/mobile altında DEĞİL, mevcut public /api/auth/* endpoint'lerini kullanır.
  // client.ts içinde absolute URL ile çağrılır.
  sendCode: "/api/auth/send-code",
  completeRegistration: "/api/auth/complete-registration",
  resetPassword: "/api/auth/reset-password",

  // Identity
  me: "/me",
  updateProfile: "/me",
  notificationPreferences: "/me/notification-preferences",

  // Devices (push token registry)
  devices: "/devices",
  device: (id: string) => `/devices/${id}`,

  // Notifications / Inbox
  notifications: "/notifications",
  notification: (id: string) => `/notifications/${id}`,
  notificationsReadAll: "/notifications/read-all",

  // Student
  studentDashboard: "/student/dashboard",
  studentLessons: "/student/lessons",
  studentLesson: (id: string) => `/student/lessons/${id}`,
  studentAssignments: "/student/assignments",
  studentAssignment: (id: string) => `/student/assignments/${id}`,
  studentSubmitAssignment: (id: string) => `/student/assignments/${id}/submit`,
  studentExamResults: "/student/exam-results",
  studentExamResult: (id: string) => `/student/exam-results/${id}`,
  studentDailyTasks: "/student/daily-tasks",
  studentDailyTask: (id: string) => `/student/daily-tasks/${id}`,
  studentToggleTask: (id: string) => `/student/daily-tasks/${id}/toggle`,
  studentSchedule: "/student/schedule",
  studentPerformance: "/student/performance",

  // Teacher
  teacherDashboard: "/teacher/dashboard",
  teacherLessons: "/teacher/lessons",
  teacherClassrooms: "/teacher/classrooms",
  teacherClassroom: (id: string) => `/teacher/classrooms/${id}`,
  teacherStudents: "/teacher/students",
  teacherAttendance: "/teacher/attendance",
  teacherAssignments: "/teacher/assignments",
  teacherGradeSubmission: (id: string) => `/teacher/submissions/${id}/grade`,

  // Parent
  parentDashboard: "/parent/dashboard",
  parentChildren: "/parent/children",
  parentChild: (id: string) => `/parent/children/${id}`,
  parentBills: "/parent/bills",

  // Admin
  adminDashboard: "/admin/dashboard",
  adminSearch: "/admin/search",
  adminAnnouncement: "/admin/announcements",

  // Dev / QA
  devTestPush: "/dev/test-push",
} as const;
