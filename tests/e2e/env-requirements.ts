/**
 * E2E testlerinin ihtiyaç duyduğu ortam değişkenlerinin tek listesi.
 *
 * Yerelde bu değişkenler yoksa ilgili `describe` blokları `test.skip` ile
 * atlanır (geliştiricinin test hesabı olmayabilir). CI'da ise
 * `scripts/check-e2e-env.ts` Playwright'tan önce aynı listeyi doğrular;
 * eksik değişken build'i kırar, böylece "yeşil ama hiç koşmadı" durumu
 * gizlenemez.
 */
export const e2eEnvRequirements = {
  adminAccount: ["PANEL_E2E_ADMIN_EMAIL", "PANEL_E2E_ADMIN_PASSWORD"],
  teacherAccount: ["PANEL_E2E_TEACHER_EMAIL", "PANEL_E2E_TEACHER_PASSWORD"],
  studentAccount: ["PANEL_E2E_STUDENT_EMAIL", "PANEL_E2E_STUDENT_PASSWORD"],
  parentAccount: ["PANEL_E2E_PARENT_EMAIL", "PANEL_E2E_PARENT_PASSWORD"],
  odkStudentAccount: ["PANEL_E2E_ODK_STUDENT_EMAIL", "PANEL_E2E_ODK_STUDENT_PASSWORD"],
  foreignStudent: ["PANEL_E2E_FOREIGN_STUDENT_ID"],
  foreignLesson: ["PANEL_E2E_FOREIGN_LESSON_ID"],
} as const satisfies Record<string, readonly string[]>;

export type E2EEnvGroup = keyof typeof e2eEnvRequirements;

export const panelAccountGroups = [
  "adminAccount",
  "teacherAccount",
  "studentAccount",
  "parentAccount",
] as const satisfies readonly E2EEnvGroup[];

export function missingE2EEnv(groups: readonly E2EEnvGroup[], env: NodeJS.ProcessEnv = process.env): string[] {
  const names = new Set(groups.flatMap((group) => e2eEnvRequirements[group]));
  return [...names].filter((name) => !env[name]);
}

export function hasE2EEnv(...groups: E2EEnvGroup[]): boolean {
  return missingE2EEnv(groups).length === 0;
}
