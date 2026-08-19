import { notFound } from "next/navigation";
import { HandHeart } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { studentCheckInWeekEnd, studentCheckInWeekStart, STUDENT_CHECK_IN_WEEKLY_LIMIT } from "@/lib/student-check-in";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentCheckInForm } from "@/components/panel/student-check-in-form";

export const dynamic = "force-dynamic";
export default async function StudentCheckInPage() {
  const session = await requireRole("STUDENT"); if (!getPanelFeatureFlags().studentCheckIn) notFound();
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, include: { enrollments: { where: { endedAt: null, group: { isActive: true } }, include: { group: { select: { id: true, name: true, subject: true } } } }, checkIns: { orderBy: { createdAt: "desc" }, take: 8, include: { group: { select: { name: true } }, helpRequest: { include: { responses: { orderBy: { createdAt: "desc" }, take: 1, select: { action: true } } } } } } } });
  if (!profile) notFound();
  const weeklyCount = await prisma.studentCheckIn.count({ where: { studentId: profile.id, createdAt: { gte: studentCheckInWeekStart(), lt: studentCheckInWeekEnd() } } });
  const history = profile.checkIns.map((item) => ({ id: item.id, groupName: item.group.name, energy: item.energy, confidence: item.confidence, barrier: item.barrier, shared: item.shareWithTeacher, createdAt: item.createdAt.toISOString(), request: item.helpRequest ? { id: item.helpRequest.id, status: item.helpRequest.status, version: item.helpRequest.version, helpful: item.helpRequest.helpful, action: item.helpRequest.responses[0]?.action || null } : null }));
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><HandHeart size={15} /> Sakin check-in</p><h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em]">Nasıl ilerlediğini fark et, gerekirse yardım iste.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--site-body)]">Puan, sıralama ve serbest metin yok. Paylaşma kararın sende; veli bu alanı göremez.</p></header><div className="mt-7"><StudentCheckInForm groups={profile.enrollments.map((item) => item.group)} history={history} remaining={Math.max(0, STUDENT_CHECK_IN_WEEKLY_LIMIT - weeklyCount)} /></div></PanelShell>;
}
