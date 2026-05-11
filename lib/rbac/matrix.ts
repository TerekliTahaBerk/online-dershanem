/**
 * Permission key matrix — single source of truth.
 *
 * Bu listeye yeni key eklendiğinde:
 *  1) `prisma/seeds/permissions.ts` upsert eder (Permission tablosu)
 *  2) `defaultRolePermissions` rol bazlı varsayılan map'e eklenir
 *  3) UI tarafı `usePermissions().can(key)` ile tüketir
 *
 * Konvansiyon: "<domain>.<action>[.<scope>]"
 *   scope: "own" | "classroom" — verilmezse "all" anlamına gelir
 */

export const PERMISSION_KEYS = [
  // Auth
  "auth.login",
  "auth.logout",
  "auth.refresh",

  // Users
  "users.read",
  "users.write",
  "users.delete",
  "users.impersonate",

  // Students
  "students.read",
  "students.read.own",
  "students.read.classroom",
  "students.write",
  "students.delete",
  "students.notes.read",
  "students.notes.write",
  "students.files.read",
  "students.files.write",
  "students.tags.write",

  // Teachers
  "teachers.read",
  "teachers.read.own",
  "teachers.write",
  "teachers.delete",

  // Parents
  "parents.read",
  "parents.read.own",
  "parents.write",
  "parents.delete",

  // Classrooms
  "classrooms.read",
  "classrooms.read.own",
  "classrooms.write",
  "classrooms.delete",
  "classrooms.attendance.write",
  "classrooms.assignment.write",

  // Lessons
  "lessons.read",
  "lessons.read.own",
  "lessons.write",
  "lessons.delete",
  "lessons.attendance.write",

  // Assignments
  "assignments.read",
  "assignments.read.own",
  "assignments.write",
  "assignments.grade",
  "assignments.submit",

  // Packages
  "packages.read",
  "packages.write",
  "packages.delete",
  "packages.price.read",

  // Payments
  "payments.read",
  "payments.read.own",
  "payments.write",
  "payments.refund",
  "payments.export",

  // Accounting
  "accounting.read",
  "accounting.write",
  "accounting.payroll.read",
  "accounting.payroll.read.own",
  "accounting.payroll.write",

  // Inbox
  "inbox.read.own",
  "inbox.write.broadcast",

  // Notifications
  "notifications.read.own",

  // Statistics
  "statistics.dashboard.read",
  "statistics.dashboard.read.own",
  "statistics.export",

  // Reports
  "reports.read",
  "reports.export",

  // Settings
  "settings.read",
  "settings.write",

  // Permissions admin
  "permissions.read",
  "permissions.write",

  // Audit
  "audit.read"
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/**
 * Permission category — UI'da gruplama için.
 */
export function permissionCategory(key: PermissionKey): string {
  const [first] = key.split(".");
  return first;
}

/**
 * Default role → permission set.
 * Production'da `RolePermission` tablosundan okunur; bu sabit
 * `prisma/seeds/role-permissions.ts` tarafından idempotent seed edilir.
 */
export const defaultRolePermissions: Record<"ADMIN" | "TEACHER" | "STUDENT" | "PARENT", PermissionKey[]> = {
  ADMIN: [...PERMISSION_KEYS],

  TEACHER: [
    "auth.logout",
    "users.read",
    "students.read.classroom",
    "students.notes.read",
    "students.notes.write",
    "students.tags.write",
    "teachers.read.own",
    "classrooms.read.own",
    "classrooms.attendance.write",
    "classrooms.assignment.write",
    "lessons.read.own",
    "lessons.write",
    "lessons.attendance.write",
    "assignments.read.own",
    "assignments.write",
    "assignments.grade",
    "inbox.read.own",
    "notifications.read.own",
    "statistics.dashboard.read.own",
    "accounting.payroll.read.own"
  ],

  STUDENT: [
    "auth.logout",
    "students.read.own",
    "lessons.read.own",
    "assignments.read.own",
    "assignments.submit",
    "inbox.read.own",
    "notifications.read.own",
    "statistics.dashboard.read.own"
    // packages.price.read YOK — öğrenci kendi paket fiyatını görmez
  ],

  PARENT: [
    "auth.logout",
    "students.read.own",          // bağlı çocukları
    "lessons.read.own",
    "assignments.read.own",
    "payments.read.own",
    "packages.price.read",        // veli fiyat görür
    "inbox.read.own",
    "notifications.read.own",
    "statistics.dashboard.read.own"
  ]
};
