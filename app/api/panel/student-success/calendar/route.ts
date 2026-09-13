import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { buildTodayItems, whatNextItem } from "@/lib/student-success/calendar";
import { getStudentToday } from "@/lib/student-success/server/calendar-server";
import { presentForStudent } from "@/lib/student-success/presenters";
import { getStudentProgressSummary } from "@/lib/student-success/server/progress-server";
import { resolveStudentScopeForViewer } from "@/lib/student-success/server/viewer-scope";

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  include: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",") : undefined)),
});

export async function GET(request: Request) {
  const auth = await requireApiOdRole("STUDENT", "TEACHER", "ADMIN", "PARENT");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz parametreler." }, { status: 400 });

  const requestedStudentId = url.searchParams.get("studentId");
  let studentId: string;
  let studentUserId: string;

  if (auth.session.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true } });
    if (!profile) return NextResponse.json({ events: [] });
    // Yabancı kimlik SESSİZCE kendi takvimine düşmemeli. `parent-scope` ile aynı
    // karar: yanlış kimlik açıkça reddedilir, yoksa kullanıcı başkasının verisine
    // baktığını sanabilir.
    if (requestedStudentId && requestedStudentId !== profile.id) {
      return NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
    }
    studentId = profile.id;
    studentUserId = auth.session.userId;
  } else if (requestedStudentId) {
    // İstekten gelen kimlik DOĞRUDAN kullanılamaz. Bu satırın yokluğunda veli ve
    // öğretmen rolündeki herkes query string'i değiştirip yabancı bir öğrencinin
    // takvimini okuyabiliyordu.
    const scoped = await resolveStudentScopeForViewer(
      requestedStudentId,
      auth.session.role,
      auth.session.userId,
    );
    if (!scoped) return NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
    studentId = scoped.id;
    studentUserId = scoped.userId;
  } else {
    return NextResponse.json({ error: "studentId gerekli." }, { status: 400 });
  }

  const now = new Date();
  const from = parsed.data.from ? new Date(parsed.data.from) : new Date(now.getTime() - 7 * 86400000);
  const to = parsed.data.to ? new Date(parsed.data.to) : new Date(now.getTime() + 14 * 86400000);
  const include = parsed.data.include as
    | Array<"lessons" | "assignments" | "coachingTasks" | "mockExams" | "coachingSessions">
    | undefined;

  const { getStudentCalendar } = await import("@/lib/student-success/server/calendar-server");
  const events = await getStudentCalendar({
    studentId,
    studentUserId,
    from,
    to,
    include,
  });

  return NextResponse.json({ events, from: from.toISOString(), to: to.toISOString() });
}

/** Unified Today — öğrenci bugün ekranı. */
export async function POST() {
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;

  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ items: [], whatNext: null });

  const now = new Date();
  const { events, dayStart, dayEnd } = await getStudentToday({
    studentId: profile.id,
    studentUserId: auth.session.userId,
    now,
  });

  const items = buildTodayItems(events, now, dayStart, dayEnd);
  const next = whatNextItem(items);
  const summary = await getStudentProgressSummary({
    studentId: profile.id,
    studentUserId: auth.session.userId,
    now,
  });

  return NextResponse.json({
    items,
    whatNext: next,
    summary: presentForStudent(summary, items.length, next?.title ?? null),
    computedAt: now.toISOString(),
  });
}
