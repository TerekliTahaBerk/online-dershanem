import { notFound } from "next/navigation";
import { Bot } from "lucide-react";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { aiDraftContentSchema } from "@/lib/teacher-ai";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherAiDrafts } from "@/components/panel/teacher-ai-drafts";

export const dynamic = "force-dynamic";

export default async function TeacherAiAssistantPage() {
  const session = await requireRole("TEACHER"); if (!getPanelFeatureFlags().teacherAiDrafts) notFound();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [lessons, drafts] = await Promise.all([
    prisma.lesson.findMany({ where: { teacherId: session.userId, status: { not: "CANCELLED" }, startsAt: { gte: since }, group: { isActive: true } }, orderBy: { startsAt: "desc" }, take: 40, select: { id: true, title: true, startsAt: true, group: { select: { name: true } } } }),
    prisma.teacherAiDraft.findMany({ where: { teacherId: session.userId }, orderBy: { createdAt: "desc" }, take: 20, include: { lesson: { select: { title: true } } } }),
  ]);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-dc-brand-strong"><Bot size={15} /> İnsan denetimli yardımcı</p><h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em]">Kaynağı görün, taslağı siz onaylayın.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--site-body)]">Açık sohbet değil: yalnız ödev ve mini kontrol taslağı. Model yanlış olabilir; hiçbir çıktı kendiliğinden öğrenciye veya veliye gitmez.</p></header><div className="mt-7"><TeacherAiDrafts lessons={lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, groupName: lesson.group.name, startsAt: lesson.startsAt.toISOString() }))} drafts={drafts.map((draft) => ({ id: draft.id, taskType: draft.taskType, status: draft.status, provider: draft.provider, promptVersion: draft.promptVersion, modelName: draft.modelName, fallbackReason: draft.fallbackReason, version: draft.version, createdAt: draft.createdAt.toISOString(), lessonTitle: draft.lesson.title, sourceRefs: Array.isArray(draft.sourceRefs) ? draft.sourceRefs as Array<{ id: string; label: string }> : [], originalContent: aiDraftContentSchema.parse(draft.originalContent), reviewedContent: draft.reviewedContent ? aiDraftContentSchema.parse(draft.reviewedContent as Prisma.JsonValue) : null }))} /></div></PanelShell>;
}
