/**
 * Sprint 6 — Canlı ders API endpoint'leri için ortak helper'lar.
 * Kullanıcı + ders bağlamını çözer, yetki kontrolü yapar.
 */
import "server-only";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LessonApiContext = {
  userId: string;
  role: UserRole;
  studentId: string | null;
  teacherId: string | null;
  lesson: {
    id: string;
    studentId: string;
    teacherId: string;
    sessionGroupId: string | null;
    classroomId: string | null;
    status: string;
    scheduledAt: Date;
    duration: number;
    meetingProvider: string | null;
    meetingRoomId: string | null;
    meetingJoinUrl: string | null;
    meetingHostUrl: string | null;
    googleMeetLink: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
  };
  /**
   * Bu kullanıcı bu dersin öğretmeni mi (kendi teacher'ı + lesson.teacherId eşitse).
   */
  isOwnerTeacher: boolean;
  /**
   * Bu kullanıcı bu dersin öğrencisi mi (kendi student'ı + lesson.studentId eşitse).
   * Sınıf seanslarında sessionGroupId paylaşan tüm Lesson satırlarında "katılma hakkı"
   * doğal olarak çözülmüş olur — `findLessonForUser` mevcut user'ın kendi satırını seçer.
   */
  isOwnStudent: boolean;
};

export function jsonErr(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Bir kullanıcıyı + ders id'sini çözer. Eğer userId STUDENT ise, aynı
 * sessionGroupId paylaşan satırlardan kendi studentId'sine ait olanı seçer
 * (lessonId path param verilse de, aslında "seans" üzerinden çalışıyoruz).
 */
export async function resolveLessonContext(
  lessonId: string,
): Promise<LessonApiContext | NextResponse> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return jsonErr(401, "UNAUTHORIZED", "Oturum yok.");
  const userId = session.user.id;
  const role = (session.user.role ?? "STUDENT") as UserRole;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      studentId: true,
      teacherId: true,
      sessionGroupId: true,
      classroomId: true,
      status: true,
      scheduledAt: true,
      duration: true,
      meetingProvider: true,
      meetingRoomId: true,
      meetingJoinUrl: true,
      meetingHostUrl: true,
      googleMeetLink: true,
      startedAt: true,
      endedAt: true,
    },
  });
  if (!lesson) return jsonErr(404, "LESSON_NOT_FOUND", "Ders bulunamadı.");

  let studentId: string | null = null;
  let teacherId: string | null = null;
  if (role === "STUDENT") {
    const s = await prisma.student.findFirst({ where: { userId }, select: { id: true } });
    studentId = s?.id ?? null;
  } else if (role === "TEACHER") {
    const t = await prisma.teacher.findFirst({ where: { userId }, select: { id: true } });
    teacherId = t?.id ?? null;
  }

  // Eğer öğrenci ise kendi seans satırını seç (sessionGroupId paylaşıyorsa).
  let activeLesson = lesson;
  if (role === "STUDENT" && studentId && lesson.studentId !== studentId && lesson.sessionGroupId) {
    const own = await prisma.lesson.findFirst({
      where: { sessionGroupId: lesson.sessionGroupId, studentId },
      select: {
        id: true,
        studentId: true,
        teacherId: true,
        sessionGroupId: true,
        classroomId: true,
        status: true,
        scheduledAt: true,
        duration: true,
        meetingProvider: true,
        meetingRoomId: true,
        meetingJoinUrl: true,
        meetingHostUrl: true,
        googleMeetLink: true,
        startedAt: true,
        endedAt: true,
      },
    });
    if (own) activeLesson = own;
  }

  const isOwnerTeacher = role === "TEACHER" && !!teacherId && activeLesson.teacherId === teacherId;
  const isOwnStudent = role === "STUDENT" && !!studentId && activeLesson.studentId === studentId;
  const isAdmin = role === "ADMIN";

  if (!isOwnerTeacher && !isOwnStudent && !isAdmin && role !== "PARENT") {
    return jsonErr(403, "FORBIDDEN", "Bu derse erişim yok.");
  }
  // PARENT için ek doğrulama: çocuğun studentId'si lesson.studentId mı?
  if (role === "PARENT") {
    const parent = await prisma.parent.findFirst({
      where: { userId },
      select: { students: { select: { studentId: true } } },
    });
    const childIds = new Set(parent?.students.map((s) => s.studentId) ?? []);
    if (!childIds.has(activeLesson.studentId)) {
      return jsonErr(403, "FORBIDDEN", "Bu derse erişim yok.");
    }
  }

  return {
    userId,
    role,
    studentId,
    teacherId,
    lesson: activeLesson as LessonApiContext["lesson"],
    isOwnerTeacher,
    isOwnStudent,
  };
}

export function extractClientMetadata(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ua = req.headers.get("user-agent") || null;
  return { ip, ua };
}
