import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/email";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { collectDeleteBlockers, formatDeleteBlockers, userProfileUpdateSchema, USER_DELETE_COUNT_SELECT } from "@/lib/panel/user-deletion";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.users.delete.preview", requireSameOrigin: true, headers: { get: (name: string) => request.headers.get(name) }, rateLimitKey: `panel:users:delete-preview:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });

  const routeParams = idParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { id } = routeParams.data;
  if (id === auth.session.userId) {
    return NextResponse.json({ canDelete: false, blockers: [{ code: "self_account", label: "kendi hesabınızı silemezsiniz", count: 1 }], suggestedAction: "SUSPEND" as const });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      status: true,
      _count: { select: USER_DELETE_COUNT_SELECT },
    },
  });
  if (!target) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });

  const blockers = collectDeleteBlockers(target._count);
  if (target.status !== "ARCHIVED") {
    blockers.unshift({ code: "not_archived", label: "hesap önce arşivlenmeli", count: 1 });
  }
  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) blockers.unshift({ code: "last_admin", label: "son yönetici hesabı", count: 1 });
  }

  return NextResponse.json({
    canDelete: blockers.length === 0,
    blockers,
    suggestedAction: blockers.length === 0 ? "DELETE" : target.status !== "ARCHIVED" ? "ARCHIVE" : "SUSPEND",
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.users.update", requireSameOrigin: true, headers: { get: (name: string) => request.headers.get(name) }, rateLimitKey: `panel:users:update:${auth.session.userId}`, rateLimit: { max: 90, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = userProfileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Profil alanlarını kontrol edin." }, { status: 400 });
  const routeParams = idParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { id } = routeParams.data;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
  if (!target) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  const email = normalizeEmail(parsed.data.email);
  if (!isPlausibleEmail(email)) return NextResponse.json({ error: "E-posta adresi geçerli görünmüyor." }, { status: 400 });
  if (await prisma.user.findFirst({ where: { email, id: { not: id } }, select: { id: true } })) return NextResponse.json({ error: "Bu e-posta başka bir hesapta kullanılıyor." }, { status: 409 });
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { email, fullName: parsed.data.fullName || null, phone: parsed.data.phone || null } });
    if (target.role === "STUDENT") await tx.studentProfile.upsert({ where: { userId: id }, create: { userId: id, classLevel: parsed.data.classLevel || null, schoolName: parsed.data.schoolName || null, targetGoal: parsed.data.targetGoal || null }, update: { classLevel: parsed.data.classLevel || null, schoolName: parsed.data.schoolName || null, targetGoal: parsed.data.targetGoal || null } });
    if (target.role === "TEACHER") await tx.teacherProfile.upsert({ where: { userId: id }, create: { userId: id, subjects: parsed.data.subjects || [], bio: parsed.data.bio || null }, update: { subjects: parsed.data.subjects || [], bio: parsed.data.bio || null } });
  });
  const emailChanged = target.email !== email;
  if (emailChanged) await revokeAllUserSessions(id);
  await logAudit({ actorUserId: auth.session.userId, entityType: "User", entityId: id, action: "panel.user_updated", summary: `${email} profili güncellendi${emailChanged ? "; açık oturumları kapatıldı" : ""}` });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.users.delete",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: `panel:users:delete:${auth.session.userId}`,
    rateLimit: { max: 20, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  const routeParams = idParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { id } = routeParams.data;

  if (id === auth.session.userId) {
    return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      _count: { select: USER_DELETE_COUNT_SELECT },
    },
  });
  if (!target) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Son yönetici hesabı silinemez. Önce başka bir yönetici hesabı açın." },
        { status: 400 },
      );
    }

    if (target.status !== "ARCHIVED") {
      return NextResponse.json(
        { error: "Kalıcı silmeden önce hesabı arşivleyin." },
        { status: 409 },
      );
    }
  }

  const blockers = collectDeleteBlockers(target._count);

  if (blockers.length > 0) {
    return NextResponse.json(
      { error: `Bu hesapta korunması gereken geçmiş var (${formatDeleteBlockers(blockers.map((item) => item.label))}). Silmek yerine arşivde tutun.` },
      { status: 409 },
    );
  }

  try {
    await prisma.user.delete({ where: { id: target.id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "Bu hesap başka kayıtlar tarafından kullanılıyor. Silmek yerine askıya alın." },
        { status: 409 },
      );
    }
    throw error;
  }

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: target.id,
    action: "panel.user_deleted",
    summary: `${target.email} hesabı silindi`,
    payload: { role: target.role },
  });

  return NextResponse.json({ ok: true });
}
