import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiAccountRole, requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import {
  GROUP_MUTATION_ISOLATION,
  GroupLifecycleError,
  ensureActiveGroup,
  ensureActiveStudent,
  previewStudentTransfer,
  removeStudentFromGroup,
  transferStudentsBetweenGroups,
} from "@/lib/panel/group-lifecycle";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("TRANSFER"),
    mode: z.enum(["PREVIEW", "EXECUTE"]),
    studentIds: z.array(z.string().min(1)).min(1).max(20),
    targetGroupId: z.string().min(1),
  }),
  z.object({
    action: z.literal("REMOVE"),
    mode: z.enum(["PREVIEW", "EXECUTE"]),
    studentIds: z.array(z.string().min(1)).min(1).max(20),
  }),
  z.object({
    action: z.literal("NOTIFY"),
    mode: z.enum(["PREVIEW", "EXECUTE"]),
    studentIds: z.array(z.string().min(1)).min(1).max(20),
    title: z.string().trim().min(2).max(120).optional(),
    body: z.string().trim().min(2).max(500).optional(),
  }),
]);

function lifecycleError(error: unknown) {
  if (!(error instanceof GroupLifecycleError)) return null;
  if (error.code === "GROUP_NOT_FOUND") {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
  }
  if (error.code === "STUDENT_NOT_FOUND") {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
}

async function notifyRows(
  rows: Array<{ userId: string; title: string; body: string; href?: string }>,
) {
  if (!rows.length) return;
  const raw = rows.map((row) => ({ ...row, type: "SYSTEM" as const }));
  const filtered = await filterNotificationRows(raw);
  if (filtered.length) await prisma.notification.createMany({ data: filtered });
  await queuePanelNotificationEmails(raw);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = bodySchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Üye işlemi isteğini kontrol edin." }, { status: 400 });
  }

  const auth =
    payload.data.mode === "PREVIEW"
      ? await requireApiAccountRole("ADMIN")
      : await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action:
      payload.data.mode === "PREVIEW"
        ? "panel.groups.members.preview"
        : "panel.groups.members.execute",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:groups:members:${payload.data.mode.toLowerCase()}:${auth.session.userId}`,
    rateLimit: { max: payload.data.mode === "PREVIEW" ? 80 : 30, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      {
        error:
          guard.code === "RATE_LIMIT"
            ? "Çok fazla işlem. Biraz sonra tekrar deneyin."
            : guard.message,
      },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  const { id: sourceGroupId } = await context.params;
  const source = await prisma.group.findUnique({
    where: { id: sourceGroupId },
    select: { id: true, name: true, teacherId: true, isActive: true },
  });
  if (!source) return NextResponse.json({ error: "Grup bulunamadı." }, { status: 404 });

  try {
    if (payload.data.action === "TRANSFER") {
      const transfer = payload.data;
      if (transfer.mode === "PREVIEW") {
        const preview = await prisma.$transaction((tx) =>
          previewStudentTransfer(tx, {
            sourceGroupId,
            targetGroupId: transfer.targetGroupId,
            studentIds: transfer.studentIds,
          }),
        );
        return NextResponse.json({ mode: "PREVIEW", action: "TRANSFER", preview });
      }

      const preview = await prisma.$transaction(
        async (tx) =>
          transferStudentsBetweenGroups(
            tx,
            sourceGroupId,
            transfer.targetGroupId,
            transfer.studentIds,
          ),
        { isolationLevel: GROUP_MUTATION_ISOLATION },
      );

      const target = await prisma.group.findUnique({
        where: { id: transfer.targetGroupId },
        select: { id: true, name: true, teacherId: true },
      });
      const students = await prisma.studentProfile.findMany({
        where: { id: { in: transfer.studentIds } },
        select: {
          id: true,
          userId: true,
          user: { select: { fullName: true, email: true } },
          parents: { select: { parentId: true } },
        },
      });

      const notify: Array<{ userId: string; title: string; body: string; href?: string }> = [];
      for (const student of students) {
        const name = student.user.fullName || student.user.email;
        notify.push({
          userId: student.userId,
          title: "Grup kaydın güncellendi",
          body: `${source.name} grubundan ${target?.name || "yeni grup"} grubuna taşındın.`,
          href: "/panel/ogrenci/takvim",
        });
        for (const parent of student.parents) {
          notify.push({
            userId: parent.parentId,
            title: "Öğrenci grup kaydı güncellendi",
            body: `${name} öğrencisi ${source.name} grubundan ${target?.name || "yeni grup"} grubuna taşındı.`,
            href: `/panel/veli/takvim?studentId=${student.id}`,
          });
        }
      }
      notify.push({
        userId: source.teacherId,
        title: "Öğrenci transferi",
        body: `${transfer.studentIds.length} öğrenci ${source.name} grubundan alındı.`,
        href: "/panel/ogretmen/ogrenci",
      });
      if (target) {
        notify.push({
          userId: target.teacherId,
          title: "Öğrenci transferi",
          body: `${transfer.studentIds.length} öğrenci ${target.name} grubuna taşındı.`,
          href: "/panel/ogretmen/ogrenci",
        });
      }
      await notifyRows(notify);
      await logAudit({
        actorUserId: auth.session.userId,
        entityType: "Group",
        entityId: sourceGroupId,
        action: "group.membership_transferred",
        summary: `${transfer.studentIds.length} öğrenci başka gruba taşındı`,
        payload: {
          studentIds: transfer.studentIds,
          sourceGroupId,
          targetGroupId: transfer.targetGroupId,
          previewCanExecute: preview.canExecute,
        },
      });
      return NextResponse.json({
        mode: "EXECUTE",
        action: "TRANSFER",
        succeeded: transfer.studentIds.length,
        preview,
      });
    }

    if (payload.data.action === "REMOVE") {
      if (payload.data.mode === "PREVIEW") {
        const members = await prisma.enrollment.findMany({
          where: {
            groupId: sourceGroupId,
            endedAt: null,
            studentId: { in: payload.data.studentIds },
          },
          select: {
            studentId: true,
            student: { select: { user: { select: { fullName: true, email: true, status: true } } } },
          },
        });
        const found = new Set(members.map((row) => row.studentId));
        return NextResponse.json({
          mode: "PREVIEW",
          action: "REMOVE",
          canExecute: members.length === payload.data.studentIds.length && source.isActive,
          items: payload.data.studentIds.map((studentId) => {
            const row = members.find((item) => item.studentId === studentId);
            const blockers: string[] = [];
            if (!source.isActive) blockers.push("Kaynak grup kapalı.");
            if (!row) blockers.push("Öğrenci bu grupta aktif değil.");
            else if (row.student.user.status !== "ACTIVE") {
              blockers.push("Öğrenci arşivlenmiş veya pasif.");
            }
            return {
              studentId,
              studentName: row?.student.user.fullName || row?.student.user.email || studentId,
              blockers,
            };
          }),
          matched: found.size,
        });
      }

      await prisma.$transaction(
        async (tx) => {
          await ensureActiveGroup(tx, sourceGroupId);
          for (const studentId of payload.data.studentIds) {
            await ensureActiveStudent(tx, studentId);
            await removeStudentFromGroup(tx, sourceGroupId, studentId);
          }
        },
        { isolationLevel: GROUP_MUTATION_ISOLATION },
      );

      const students = await prisma.studentProfile.findMany({
        where: { id: { in: payload.data.studentIds } },
        select: {
          id: true,
          userId: true,
          user: { select: { fullName: true, email: true } },
          parents: { select: { parentId: true } },
        },
      });
      await notifyRows(
        students.flatMap((student) => [
          {
            userId: student.userId,
            title: "Grup kaydın güncellendi",
            body: `${source.name} grubundan çıkarıldın.`,
            href: "/panel/ogrenci/takvim",
          },
          ...student.parents.map((parent) => ({
            userId: parent.parentId,
            title: "Öğrenci grup kaydı güncellendi",
            body: `${student.user.fullName || student.user.email} öğrencisi ${source.name} grubundan çıkarıldı.`,
            href: `/panel/veli/takvim?studentId=${student.id}`,
          })),
        ]),
      );
      await logAudit({
        actorUserId: auth.session.userId,
        entityType: "Group",
        entityId: sourceGroupId,
        action: "group.membership_removed_bulk",
        summary: `${payload.data.studentIds.length} öğrenci gruptan çıkarıldı`,
        payload: { studentIds: payload.data.studentIds },
      });
      return NextResponse.json({
        mode: "EXECUTE",
        action: "REMOVE",
        succeeded: payload.data.studentIds.length,
      });
    }

    // NOTIFY
    const title = payload.data.title || `${source.name} grubu bilgilendirmesi`;
    const body =
      payload.data.body || "Grup yöneticisinden yeni bir bilgilendirme mesajı var.";

    if (payload.data.mode === "PREVIEW") {
      const members = await prisma.enrollment.findMany({
        where: {
          groupId: sourceGroupId,
          endedAt: null,
          studentId: { in: payload.data.studentIds },
        },
        select: {
          studentId: true,
          student: {
            select: {
              userId: true,
              user: { select: { fullName: true, email: true } },
              parents: { select: { parentId: true } },
            },
          },
        },
      });
      const recipientCount = members.reduce(
        (sum, row) => sum + 1 + row.student.parents.length,
        0,
      );
      return NextResponse.json({
        mode: "PREVIEW",
        action: "NOTIFY",
        canExecute: members.length === payload.data.studentIds.length,
        matchedStudents: members.length,
        recipientCount,
        title,
        body,
        sample: members.slice(0, 5).map((row) => ({
          studentId: row.studentId,
          name: row.student.user.fullName || row.student.user.email,
        })),
      });
    }

    const members = await prisma.enrollment.findMany({
      where: {
        groupId: sourceGroupId,
        endedAt: null,
        studentId: { in: payload.data.studentIds },
      },
      select: {
        studentId: true,
        student: {
          select: {
            userId: true,
            parents: { select: { parentId: true } },
          },
        },
      },
    });
    if (members.length !== payload.data.studentIds.length) {
      return NextResponse.json(
        { error: "Seçili öğrencilerin bir kısmı bu grupta aktif değil." },
        { status: 409 },
      );
    }

    await notifyRows(
      members.flatMap((row) => [
        {
          userId: row.student.userId,
          title,
          body,
          href: "/panel/ogrenci",
        },
        ...row.student.parents.map((parent) => ({
          userId: parent.parentId,
          title,
          body,
          href: `/panel/veli?studentId=${row.studentId}`,
        })),
      ]),
    );
    await logAudit({
      actorUserId: auth.session.userId,
      entityType: "Group",
      entityId: sourceGroupId,
      action: "group.members_notified",
      summary: `${members.length} öğrenciye grup bildirimi gönderildi`,
      payload: { studentIds: payload.data.studentIds, title },
    });
    return NextResponse.json({
      mode: "EXECUTE",
      action: "NOTIFY",
      succeeded: members.length,
    });
  } catch (error) {
    const mapped = lifecycleError(error);
    if (mapped) return mapped;
    throw error;
  }
}
