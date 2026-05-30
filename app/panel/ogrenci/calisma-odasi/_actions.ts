"use server";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/panel-student";
import { revalidatePath } from "next/cache";

const MAX_NOTE = 500;
const MAX_SUBJECT = 60;
/** 12 saat — güvenlik valfi: çok uzun açık kalan oturumu otomatik kes. */
const MAX_SESSION_SECONDS = 12 * 60 * 60;

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Aktif (endedAt IS NULL) oturum varsa onu döner; yoksa yeni oturum açar.
 * Aynı öğrenci için aynı anda birden fazla aktif oturum **kabul edilmez** —
 * çakışma durumunda mevcut açık oturum bitirilir, sonra yenisi açılır.
 */
export async function startStudySessionAction(fd: FormData): Promise<void> {
  const { student } = await requireStudent();
  if (!student) throw new Error("Öğrenci profili yok");

  const courseIdRaw = readStr(fd, "courseId");
  const subject = readStr(fd, "subject").slice(0, MAX_SUBJECT) || null;
  const note = readStr(fd, "note").slice(0, MAX_NOTE) || null;

  // Sahiplik: courseId verilmişse, öğrencinin gerçekten erişebildiği bir
  // ders olduğundan emin ol (sınıfı veya direkt dersi üstünden).
  let courseId: string | null = null;
  if (courseIdRaw) {
    const owned = await prisma.lesson.findFirst({
      where: {
        courseId: courseIdRaw,
        OR: [
          { studentId: student.id },
          { classroom: { students: { some: { studentId: student.id, leftAt: null } } } },
        ],
      },
      select: { courseId: true },
    });
    if (owned?.courseId) courseId = owned.courseId;
  }

  // Önceki açık oturumu kapat (idempotent).
  const open = await prisma.studySession.findFirst({
    where: { studentId: student.id, endedAt: null },
    select: { id: true, startedAt: true },
  });
  if (open) {
    const seconds = Math.min(
      MAX_SESSION_SECONDS,
      Math.max(0, Math.floor((Date.now() - open.startedAt.getTime()) / 1000)),
    );
    await prisma.studySession.update({
      where: { id: open.id },
      data: { endedAt: new Date(), durationSeconds: seconds },
    });
  }

  await prisma.studySession.create({
    data: {
      studentId: student.id,
      courseId,
      subject,
      note,
      startedAt: new Date(),
    },
  });

  revalidatePath("/panel/ogrenci/calisma-odasi");
  revalidatePath("/panel/ogrenci");
}

/**
 * Aktif oturumu durdur. `sessionId` form alanı opsiyonel — verilmezse
 * öğrencinin mevcut açık oturumu bulunur. Verilmişse, oturumun
 * `studentId` eşleşmesi mutlaka doğrulanır (cross-student write koruması).
 */
export async function stopStudySessionAction(fd: FormData): Promise<void> {
  const { student } = await requireStudent();
  if (!student) throw new Error("Öğrenci profili yok");

  const sessionId = readStr(fd, "sessionId");
  const note = readStr(fd, "note").slice(0, MAX_NOTE);

  let target: { id: string; startedAt: Date; endedAt: Date | null } | null;
  if (sessionId) {
    target = await prisma.studySession.findUnique({
      where: { id: sessionId },
      select: { id: true, startedAt: true, endedAt: true, studentId: true },
    }).then((s) => {
      if (!s) return null;
      if (s.studentId !== student.id) {
        throw new Error("Yetkisiz işlem");
      }
      return { id: s.id, startedAt: s.startedAt, endedAt: s.endedAt };
    });
  } else {
    target = await prisma.studySession.findFirst({
      where: { studentId: student.id, endedAt: null },
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true, endedAt: true },
    });
  }

  if (!target || target.endedAt) {
    revalidatePath("/panel/ogrenci/calisma-odasi");
    return;
  }

  const seconds = Math.min(
    MAX_SESSION_SECONDS,
    Math.max(0, Math.floor((Date.now() - target.startedAt.getTime()) / 1000)),
  );

  await prisma.studySession.update({
    where: { id: target.id },
    data: {
      endedAt: new Date(),
      durationSeconds: seconds,
      ...(note ? { note } : {}),
    },
  });

  revalidatePath("/panel/ogrenci/calisma-odasi");
  revalidatePath("/panel/ogrenci");
}

/**
 * Aktif oturumun notunu güncelle. Sadece kendi açık oturumu yazılabilir.
 */
export async function updateStudySessionNoteAction(fd: FormData): Promise<void> {
  const { student } = await requireStudent();
  if (!student) throw new Error("Öğrenci profili yok");

  const sessionId = readStr(fd, "sessionId");
  const note = readStr(fd, "note").slice(0, MAX_NOTE);
  if (!sessionId) return;

  const target = await prisma.studySession.findUnique({
    where: { id: sessionId },
    select: { id: true, studentId: true, endedAt: true },
  });
  if (!target || target.studentId !== student.id) {
    throw new Error("Yetkisiz işlem");
  }
  if (target.endedAt) return; // sadece açık oturumun notu güncellenir

  await prisma.studySession.update({
    where: { id: target.id },
    data: { note: note || null },
  });
  revalidatePath("/panel/ogrenci/calisma-odasi");
}
