import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const columnPresencePromises = new Map<string, Promise<boolean>>();

async function hasColumn(tableName: string, columnName: string) {
  const key = `${tableName}.${columnName}`;

  if (!columnPresencePromises.has(key)) {
    columnPresencePromises.set(key, prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = ${tableName}
          AND column_name = ${columnName}
      ) AS "exists"
    `)
      .then((rows) => Boolean(rows[0]?.exists))
      .catch(() => false));
  }

  return columnPresencePromises.get(key)!;
}

async function requireColumn(tableName: string, columnName: string) {
  const hasRequiredColumn = await hasColumn(tableName, columnName);
  if (!hasRequiredColumn) {
    throw new Error(
      `Veritabani semasi guncel degil. \`${tableName}.${columnName}\` kolonu eksik. Once \`prisma db push\` veya migrasyon calistirin.`,
    );
  }
}

export function hasOdkExamResultsReleasedAtColumn() {
  return hasColumn("odk_exams", "results_released_at");
}

export function hasOdkExamAnswerKeyReleasedAtColumn() {
  return hasColumn("odk_exams", "answer_key_released_at");
}

export function hasOdkExamGoogleMeetLinkColumn() {
  return hasColumn("odk_exams", "google_meet_link");
}

export function hasOdkExamAttemptSectionScoresColumn() {
  return hasColumn("odk_exam_attempts", "section_scores");
}

export function hasOdkExamAttemptTabSwitchCountColumn() {
  return hasColumn("odk_exam_attempts", "tab_switch_count");
}

export function requireOdkExamResultsReleasedAtColumn() {
  return requireColumn("odk_exams", "results_released_at");
}

export function requireOdkExamAnswerKeyReleasedAtColumn() {
  return requireColumn("odk_exams", "answer_key_released_at");
}

export function requireOdkExamGoogleMeetLinkColumn() {
  return requireColumn("odk_exams", "google_meet_link");
}
