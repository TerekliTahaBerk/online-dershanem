import { NextResponse } from "next/server";
import { z } from "zod";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { loadTeacherLessons } from "@/lib/panel/teacher-lesson-server";
import { PRIVATE_NO_STORE, requireStaffApi, staffJson } from "@/lib/panel/staff-api";

const query = z.object({ aralik: z.enum(["yaklasan", "gecmis"]).default("yaklasan") }).strict();

/** Öğretmenin KENDİ dersleri (`teacherId`). `aralik=yaklasan|gecmis`. */
export async function GET(request: Request) {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  const parsed = query.safeParse({ aralik: new URL(request.url).searchParams.get("aralik") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz aralık." }, { status: 400, headers: PRIVATE_NO_STORE });
  const raw = parsed.data.aralik;
  const lessons = await loadTeacherLessons(auth.session.userId, raw);
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    range: raw,
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      startsAt: lesson.startsAt.toISOString(),
      endsAt: lesson.endsAt.toISOString(),
      title: lesson.title,
      groupName: lesson.group.name,
      subject: lesson.group.subject,
      status: lesson.status,
      studentCount: lesson.group.enrollments.length,
      attendanceRecorded: lesson.attendances.length,
      hasSharedNote: lesson.notes.length > 0,
    })),
  });
}
