import "server-only";

import { prisma } from "@/lib/prisma";
import { ASSIGNMENT_DISPLAY_LABELS, deriveAssignmentDisplayStatus, type AssignmentDisplayStatus } from "@/lib/panel/assignment-display";
import type { ParentChild } from "@/lib/panel/parent-product-policy";

/**
 * VELİ · ÖDEVLER yükleyicisi (SALT OKUNUR) — web `app/panel/veli/odevler`
 * ve mobil `GET /api/panel/parent/assignments` aynı fonksiyonu kullanır.
 * Kapsam: çocuğun AKTİF kayıtlı olduğu gruplardaki aktif ödevler. Durum
 * `deriveAssignmentDisplayStatus` (kanonik). Öğretmen iç notu, teslim
 * içeriği / dosyası ve değerlendirme notu seçilmez.
 */
export type ParentAssignmentGroup = "active" | "late" | "done";
export type ParentAssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date;
  /** Ham ad (web mevcut davranışı: ad yoksa e-posta) — JSON projeksiyonu maskeler. */
  createdByName: string;
  status: AssignmentDisplayStatus;
  label: string;
  group: ParentAssignmentGroup;
};

const ACTIVE: ReadonlySet<AssignmentDisplayStatus> = new Set(["ATANDI", "GORULDU", "DEVAM_EDIYOR"]);

export function parentAssignmentGroup(status: AssignmentDisplayStatus): ParentAssignmentGroup {
  if (status === "GEC") return "late";
  return ACTIVE.has(status) ? "active" : "done";
}

export async function loadParentAssignments(child: ParentChild, now = new Date()): Promise<ParentAssignmentRow[]> {
  const enrollments = await prisma.enrollment.findMany({ where: { studentId: child.id, endedAt: null }, select: { groupId: true } });
  const groupIds = enrollments.map((row) => row.groupId);
  if (!groupIds.length) return [];
  const assignments = await prisma.assignment.findMany({
    where: { groupId: { in: groupIds }, isActive: true },
    orderBy: { dueAt: "asc" },
    take: 40,
    select: {
      id: true,
      title: true,
      description: true,
      dueAt: true,
      createdBy: { select: { fullName: true, email: true } },
      progress: { where: { studentId: child.id }, select: { status: true }, take: 1 },
      submissions: { where: { studentId: child.id }, orderBy: { attemptNumber: "desc" }, take: 1, select: { status: true } },
    },
  });
  return assignments.map((assignment) => {
    const status = deriveAssignmentDisplayStatus({
      progress: assignment.progress[0]?.status ?? null,
      dueAt: assignment.dueAt,
      now,
      submissionStatus: assignment.submissions[0]?.status ?? null,
    });
    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description?.trim() || null,
      dueAt: assignment.dueAt,
      createdByName: assignment.createdBy.fullName || assignment.createdBy.email,
      status,
      label: ASSIGNMENT_DISPLAY_LABELS[status],
      group: parentAssignmentGroup(status),
    };
  });
}
