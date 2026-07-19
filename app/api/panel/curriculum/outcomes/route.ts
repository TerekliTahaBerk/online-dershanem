import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const code = z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9._-]+$/);
const schema = z.object({
  versionId: z.string().min(1),
  subjectCode: code,
  subjectName: z.string().trim().min(2).max(80),
  unitCode: code,
  unitName: z.string().trim().min(2).max(120),
  outcomeCode: code,
  title: z.string().trim().min(5).max(300),
  description: z.string().trim().max(1000).optional(),
  skills: z.array(z.string().trim().min(2).max(80)).max(5).default([]),
});

function normalizedCode(value: string) { return value.toUpperCase(); }
function skillCode(value: string) { return value.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "beceri"; }

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.curriculum.outcome.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:curriculum:${auth.session.userId}`, rateLimit: { max: 160, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kazanım alanlarını kontrol edin." }, { status: 400 });
  const version = await prisma.curriculumVersion.findFirst({ where: { id: parsed.data.versionId, status: { not: "ARCHIVED" } }, select: { id: true } });
  if (!version) return NextResponse.json({ error: "Düzenlenebilir müfredat sürümü bulunamadı." }, { status: 404 });
  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const subject = await tx.curriculumSubject.upsert({ where: { versionId_code: { versionId: version.id, code: normalizedCode(parsed.data.subjectCode) } }, create: { versionId: version.id, code: normalizedCode(parsed.data.subjectCode), name: parsed.data.subjectName }, update: { name: parsed.data.subjectName } });
      const unit = await tx.curriculumUnit.upsert({ where: { subjectId_code: { subjectId: subject.id, code: normalizedCode(parsed.data.unitCode) } }, create: { subjectId: subject.id, code: normalizedCode(parsed.data.unitCode), name: parsed.data.unitName }, update: { name: parsed.data.unitName } });
      const created = await tx.learningOutcome.create({ data: { unitId: unit.id, code: normalizedCode(parsed.data.outcomeCode), title: parsed.data.title, description: parsed.data.description || null } });
      for (const skillName of [...new Set(parsed.data.skills)]) {
        const skill = await tx.curriculumSkill.upsert({ where: { versionId_code: { versionId: version.id, code: skillCode(skillName) } }, create: { versionId: version.id, code: skillCode(skillName), name: skillName }, update: { name: skillName } });
        await tx.outcomeSkill.create({ data: { outcomeId: created.id, skillId: skill.id } });
      }
      await tx.auditLog.create({ data: { actorUserId: auth.session.userId, actorType: "USER", entityType: "LearningOutcome", entityId: created.id, action: "curriculum.outcome_created", summary: `${created.code} kazanımı oluşturuldu`, payload: { versionId: version.id, subjectCode: subject.code, unitCode: unit.code, skillCount: parsed.data.skills.length } } });
      return created;
    });
    return NextResponse.json({ id: outcome.id });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Bu ünitede aynı kazanım kodu zaten var." }, { status: 409 });
    throw error;
  }
}
