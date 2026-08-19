import { notFound } from "next/navigation";
import { HandHeart } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherHelpRequests } from "@/components/panel/teacher-help-requests";

function countBand(value: number): "0" | "1-5" | "6-20" | "21+" { return value === 0 ? "0" : value <= 5 ? "1-5" : value <= 20 ? "6-20" : "21+"; }
export const dynamic = "force-dynamic";
export default async function TeacherHelpPage() {
  const session = await requireRole("TEACHER"); if (!getPanelFeatureFlags().studentCheckIn) notFound();
  const now = new Date();
  const requests = await prisma.studentHelpRequest.findMany({ where: { status: { in: ["OPEN", "RESPONDED"] }, group: { teacherId: session.userId, isActive: true }, checkIn: { shareWithTeacher: true }, student: { enrollments: { some: { endedAt: null, group: { teacherId: session.userId, isActive: true } } } } }, orderBy: [{ status: "asc" }, { dueAt: "asc" }], include: { group: { select: { name: true } }, student: { include: { user: { select: { fullName: true, email: true } } } }, checkIn: true, responses: { orderBy: { createdAt: "desc" }, take: 1, select: { action: true } } } });
  const visible = await Promise.all(requests.map(async (item) => ({ item, active: Boolean(await prisma.enrollment.findFirst({ where: { studentId: item.studentId, groupId: item.groupId, endedAt: null }, select: { id: true } })) })));
  const rows = visible.filter((entry) => entry.active).map(({ item }) => ({ id: item.id, studentName: item.student.user.fullName || item.student.user.email, groupName: item.group.name, energy: item.checkIn.energy, confidence: item.checkIn.confidence, barrier: item.checkIn.barrier, status: item.status as "OPEN" | "RESPONDED", dueAt: item.dueAt.toISOString(), version: item.version, helpful: item.helpful, responseAction: item.responses[0]?.action || null }));
  const open = rows.filter((item) => item.status === "OPEN");
  await recordPanelProductEvent({ name: "student_help_inbox_viewed", properties: { openCountBand: countBand(open.length), overdueCountBand: countBand(open.filter((item) => new Date(item.dueAt) < now).length) } }, session.role);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><HandHeart size={15} /> Öğrenci yardım kutusu</p><h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em]">Sorunu yorumlamadan, küçük destek adımını seçin.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--site-body)]">Yalnız öğrencinin açıkça paylaştığı kontrollü işaretler görünür. Tanı, serbest metin, veli bildirimi veya otomatik risk etiketi yoktur.</p></header><div className="mt-7"><TeacherHelpRequests rows={rows} /></div></PanelShell>;
}
