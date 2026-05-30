/**
 * Quick endpoint that powers the ParentQuickDrawer.
 *
 *   GET /api/panel/parents/:id/quick
 *
 * Permission policy: ADMIN only (parents are sensitive PII; teachers/students
 * see parent info inline through their own scopes).
 *
 * The drawer surfaces:
 * - parent identity + onboarding state
 * - linked children
 * - last 5 audit events on this parent
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanelSession } from "@/lib/panel-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePanelSession();
  if (ctx.actualRole !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const [parent, children, recentAudit] = await Promise.all([
    prisma.parent.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, phone: true, phoneKey: true, email: true,
        notes: true, createdAt: true, updatedAt: true,
        userId: true,
        user: { select: { id: true, role: true, createdAt: true } },
      },
    }),
    prisma.parentStudent.findMany({
      where: { parentId: id },
      select: {
        relationship: true, isPrimary: true,
        student: {
          select: {
            id: true, fullName: true, classLevel: true, status: true,
            phone: true, email: true,
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "Parent", entityId: id },
      orderBy: { createdAt: "desc" }, take: 5,
      select: { id: true, action: true, summary: true, createdAt: true,
                actor: { select: { name: true, email: true } } },
    }).catch(() => [] as Array<{ id: string; action: string; summary: string | null; createdAt: Date; actor: { name: string | null; email: string } | null }>),
  ]);

  if (!parent) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Compute an onboarding hint without requiring the new schema field yet.
  const hints: string[] = [];
  if (!parent.userId) hints.push("Davet gönderilmedi");
  if (!parent.phone) hints.push("Telefon eksik");
  if (!parent.email) hints.push("Email eksik");
  if (children.length === 0) hints.push("Çocuk bağlanmamış");

  return NextResponse.json({
    parent: {
      ...parent,
      hasAccount: !!parent.userId,
      onboardingHints: hints,
    },
    children: children.map((c) => ({
      id: c.student.id,
      fullName: c.student.fullName,
      classLevel: c.student.classLevel,
      status: c.student.status,
      phone: c.student.phone,
      email: c.student.email,
      relationship: c.relationship,
      isPrimary: c.isPrimary,
    })),
    audit: recentAudit,
  });
}
