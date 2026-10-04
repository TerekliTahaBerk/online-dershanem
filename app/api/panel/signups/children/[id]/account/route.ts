import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/logger";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/email";
import { hashPassword } from "@/lib/auth/password";
import {
  buildInviteMessage,
  buildInviteUrl,
  issueInvitePlaceholderSecret,
  issueUserInvite,
  resolveAppOrigin,
} from "@/lib/auth/invitation";
import { optionLabel, RELATIONSHIP_OPTIONS } from "@/lib/account/dictionaries";
import { OdProvisioningError, provisionOdOrder } from "@/lib/od/provisioning";
import { OdkProvisioningError, provisionOdkOrder } from "@/lib/odk/provisioning";

/**
 * YÖNETİM · VELİNİN BİLDİRDİĞİ ÇOCUK İÇİN ÖĞRENCİ HESABI AÇ.
 *
 * Akış (tek tık):
 *  1. Öğrenci hesabı davet bağlantısıyla açılır (ya da e-posta zaten bir
 *     ÖĞRENCİ hesabına aitse o hesap kullanılır).
 *  2. `StudentProfile` çocuk bilgileriyle doldurulur, veli bağı kurulur.
 *  3. `PendingChild` → ACCOUNT_CREATED.
 *  4. Bu çocuk için ödenmiş OD/ODK siparişleri yeniden provision edilir;
 *     öğrencinin ürün erişimi OTOMATİK açılır.
 * Ardından öğretmen/koç/grup ataması mevcut araçlarla yapılır.
 *
 * Yalnız ADMIN + taze step-up (hesap açmakla aynı hassasiyet).
 */
const bodySchema = z.object({
  email: z.string().trim().min(3).max(254),
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.signups.child_account",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:signups:child-account:${auth.session.userId}`,
    rateLimit: { max: 30, windowMs: 15 * 60_000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const { id } = await params;
  const childId = z.string().min(1).max(64).safeParse(id);
  if (!childId.success) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Öğrenci e-postası zorunlu." }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  if (!isPlausibleEmail(email)) return NextResponse.json({ error: "E-posta adresi geçerli görünmüyor." }, { status: 400 });

  const child = await prisma.pendingChild.findUnique({
    where: { id: childId.data },
    include: { parent: { select: { id: true, role: true, status: true } } },
  });
  if (!child) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  if (child.status !== "PENDING") return NextResponse.json({ error: "Bu çocuk için hesap zaten açılmış ya da kayıt iptal edilmiş." }, { status: 409 });
  if (child.parent.role !== "PARENT" || child.parent.status !== "ACTIVE") {
    return NextResponse.json({ error: "Velinin hesabı aktif değil." }, { status: 409 });
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, status: true } });
  if (existing && (existing.role !== "STUDENT" || existing.status !== "ACTIVE")) {
    return NextResponse.json({ error: `Bu e-posta başka bir hesaba (${existing.role}) bağlı. Farklı bir e-posta girin.` }, { status: 409 });
  }

  const invite = existing ? null : issueUserInvite();
  const placeholder = existing ? null : await hashPassword(issueInvitePlaceholderSecret());
  const fullName = parsed.data.fullName?.trim() || child.fullName;
  const relationship = optionLabel(RELATIONSHIP_OPTIONS, child.relationship) ?? "Veli";

  const result = await prisma.$transaction(async (tx) => {
    const student =
      existing ??
      (await tx.user.create({
        data: {
          email,
          fullName,
          phone: parsed.data.phone?.trim() || child.phone || null,
          role: "STUDENT",
          registrationSource: "ADMIN_INVITE",
          passwordHash: placeholder!,
          mustChangePassword: true,
          inviteTokenHash: invite!.tokenHash,
          inviteTokenExpiresAt: invite!.expiresAt,
          inviteSentAt: new Date(),
          createdById: auth.session.userId,
        },
        select: { id: true, role: true, status: true },
      }));
    const profileData = {
      classLevel: child.classLevel,
      schoolName: child.schoolName,
      examType: child.examType,
      fieldTrack: child.fieldTrack,
    };
    const profile = await tx.studentProfile.upsert({
      where: { userId: student.id },
      create: { userId: student.id, ...profileData },
      // Var olan öğrencinin dolu alanlarını ezmeyelim; yalnız boşları doldur.
      update: {},
      select: { id: true, classLevel: true, schoolName: true, examType: true },
    });
    if (existing) {
      await tx.studentProfile.update({
        where: { id: profile.id },
        data: {
          classLevel: profile.classLevel ?? profileData.classLevel,
          schoolName: profile.schoolName ?? profileData.schoolName,
          examType: profile.examType ?? profileData.examType,
        },
      });
    }
    await tx.parentStudent.upsert({
      where: { parentId_studentId: { parentId: child.parentUserId, studentId: profile.id } },
      create: { parentId: child.parentUserId, studentId: profile.id, relationship, primaryContact: true },
      update: { active: true, endedAt: null },
    });
    const resolved = await tx.pendingChild.updateMany({
      where: { id: child.id, status: "PENDING" },
      data: { status: "ACCOUNT_CREATED", studentProfileId: profile.id, resolvedById: auth.session.userId, resolvedAt: new Date() },
    });
    if (resolved.count !== 1) throw new Error("PENDING_CHILD_RACE");
    const [odOrders, odkOrders] = await Promise.all([
      tx.odOrder.findMany({ where: { pendingChildId: child.id, status: "PAID" }, select: { id: true } }),
      tx.odkOrder.findMany({ where: { pendingChildId: child.id, status: "PAID" }, select: { id: true } }),
    ]);
    return { studentId: student.id, profileId: profile.id, odOrders: odOrders.map((o) => o.id), odkOrders: odkOrders.map((o) => o.id) };
  });

  // Ödenmiş siparişler: öğrencinin ürün erişimini aç. Hata hesabı geri almaz;
  // sipariş ekranından "yeniden dene" ile tamamlanabilir.
  const provisioning: Array<{ orderId: string; product: "OD" | "ODK"; outcome: string }> = [];
  for (const orderId of result.odOrders) {
    try {
      const outcome = await provisionOdOrder(orderId, { studentUserId: result.studentId });
      provisioning.push({ orderId, product: "OD", outcome: outcome.status === "SUCCEEDED" ? "succeeded" : `manual_review:${outcome.reason ?? ""}` });
    } catch (error) {
      log.error("signups.child_account.od_provisioning_failed", error, { orderId });
      provisioning.push({ orderId, product: "OD", outcome: `error:${error instanceof OdProvisioningError ? error.code : "UNEXPECTED"}` });
    }
  }
  for (const orderId of result.odkOrders) {
    try {
      await provisionOdkOrder(orderId, { studentUserId: result.studentId });
      provisioning.push({ orderId, product: "ODK", outcome: "succeeded" });
    } catch (error) {
      log.error("signups.child_account.odk_provisioning_failed", error, { orderId });
      provisioning.push({ orderId, product: "ODK", outcome: `error:${error instanceof OdkProvisioningError ? error.code : "UNEXPECTED"}` });
    }
  }

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "PendingChild",
    entityId: child.id,
    action: "panel.signups.child_account_created",
    summary: `${fullName} için öğrenci hesabı ${existing ? "bağlandı" : "açıldı"} ve veliye bağlandı`,
    payload: { studentUserId: result.studentId, parentUserId: child.parentUserId, linkedExisting: Boolean(existing), provisioning },
  });

  const origin = resolveAppOrigin(new URL(request.url).origin);
  const inviteUrl = invite ? buildInviteUrl(origin, invite.token) : null;
  return NextResponse.json({
    student: { id: result.studentId, email, fullName, linkedExisting: Boolean(existing) },
    invite: invite && inviteUrl
      ? { url: inviteUrl, message: buildInviteMessage({ fullName, email, inviteUrl, expiresAt: invite.expiresAt }), expiresAt: invite.expiresAt.toISOString() }
      : null,
    provisioning,
  });
}
