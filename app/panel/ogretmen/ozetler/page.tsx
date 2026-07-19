import { notFound } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { digestWeekStart } from "@/lib/calm-weekly-digest";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { TeacherDigestReview } from "@/components/panel/teacher-digest-review";

export const dynamic = "force-dynamic";
export default async function TeacherDigestsPage() { const session = await requireRole("TEACHER"); if (!getPanelFeatureFlags().parentWeeklyDigest) notFound(); const students = await prisma.studentProfile.findMany({ where: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: session.userId } } } }, orderBy: { user: { fullName: "asc" } }, include: { user: { select: { fullName: true, email: true } }, weeklyDigests: { where: { weekStart: digestWeekStart() }, take: 1 } } }); return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><HeartHandshake size={15} /> Sakin aile iletişimi</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Taslağı görün, aynı anda paylaşın.</h1><p className="mt-2 text-sm leading-6 text-[var(--site-body)]">Özel öğrenci notu, görev listesi ve tekil kötü günler özete alınmaz. Öğrenci ve veli aynı yayınlanmış metni görür.</p></header><div className="mt-7"><TeacherDigestReview initialRows={students.map((student) => { const digest = student.weeklyDigests[0]; return { studentId: student.id, name: student.user.fullName || student.user.email, digest: digest ? { id: digest.id, status: digest.status, version: digest.version, goodThingOne: digest.goodThingOne, goodThingTwo: digest.goodThingTwo, supportArea: digest.supportArea, homeQuestion: digest.homeQuestion, dataThrough: digest.dataThrough.toISOString() } : null }; })} /></div></PanelShell>; }
