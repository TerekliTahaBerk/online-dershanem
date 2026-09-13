import { normalizeEmail } from "../auth/email";

export type PanelE2EAccount = {
  email: string;
  password: string;
};

const defaultPassword = process.env.E2E_PASSWORD ?? "testpass123";

function fromEnv(email: string | undefined, fallbackEmail: string, password: string | undefined): PanelE2EAccount {
  return {
    email: normalizeEmail(email ?? fallbackEmail),
    password: password ?? defaultPassword,
  };
}

export const panelE2EAccounts = {
  admin: fromEnv(
    process.env.PANEL_E2E_ADMIN_EMAIL,
    "admin.e2e@example.com",
    process.env.PANEL_E2E_ADMIN_PASSWORD,
  ),
  teacher: fromEnv(
    process.env.PANEL_E2E_TEACHER_EMAIL,
    "teacher.e2e@example.com",
    process.env.PANEL_E2E_TEACHER_PASSWORD,
  ),
  student: fromEnv(
    process.env.PANEL_E2E_STUDENT_EMAIL,
    "student.e2e@example.com",
    process.env.PANEL_E2E_STUDENT_PASSWORD,
  ),
  parent: fromEnv(
    process.env.PANEL_E2E_PARENT_EMAIL,
    "parent.e2e@example.com",
    process.env.PANEL_E2E_PARENT_PASSWORD,
  ),
  odkStudent: fromEnv(
    process.env.PANEL_E2E_ODK_STUDENT_EMAIL,
    "odk.student.e2e@example.com",
    process.env.PANEL_E2E_ODK_STUDENT_PASSWORD ?? process.env.PANEL_E2E_STUDENT_PASSWORD,
  ),
} as const;
