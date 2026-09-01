import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/email";
import {
  buildInviteMessage,
  buildInviteUrl,
  issueInvitePlaceholderSecret,
  issueUserInvite,
  resolveAppOrigin,
} from "@/lib/auth/invitation";
import { hashPassword } from "@/lib/auth/password";

/**
 * Hesap açma — YALNIZCA admin.
 *
 * Public self-register yoktur. Admin hesabı açar ve tek kullanımlık davet linki
 * üretir. Kullanıcı ilk girişte parolasını bu linkle belirler.
 */

const createUserSchema = z.object({
  email: z.string().min(3).max(254),
  fullName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT", "PARENT"]),
  products: z.array(z.enum(["OD", "OK", "ODK"])).max(3).optional(),
  classLevel: z.string().trim().max(40).optional().or(z.literal("")),
  examType: z.enum(["LGS", "TYT", "AYT", "TYT_AYT", "OTHER", ""]).optional(),
  schoolName: z.string().trim().max(120).optional().or(z.literal("")),
  subjects: z.array(z.string().trim().min(2).max(80)).max(12).optional(),
  maxStudentCapacity: z.number().int().min(1).max(200).optional().nullable(),
  internalNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.users.create",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: `panel:users:create:${auth.session.userId}`,
    rateLimit: { max: 30, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Formu kontrol edin: e-posta ve rol zorunlu." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: "E-posta adresi geçerli görünmüyor." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: `Bu e-posta zaten kayıtlı (${existing.role}). Davet yenilemek için mevcut hesabı seçin.` },
      { status: 409 },
    );
  }

  const invite = issueUserInvite();
  const requestedProducts = parsed.data.products ? [...new Set(parsed.data.products)] : [];
  const products = parsed.data.role === "ADMIN" || parsed.data.role === "TEACHER"
    ? (["OD", "OK", "ODK"] as const)
    : requestedProducts.length
      ? requestedProducts
      : (["OD"] as const);
  const user = await prisma.user.create({
    data: {
      email,
      fullName: parsed.data.fullName?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      role: parsed.data.role,
      // Davet tamamlanmadan giriş yapılamasın diye bilinmeyen bir parola hash'i.
      passwordHash: await hashPassword(issueInvitePlaceholderSecret()),
      mustChangePassword: true,
      inviteTokenHash: invite.tokenHash,
      inviteTokenExpiresAt: invite.expiresAt,
      inviteSentAt: new Date(),
      inviteAcceptedAt: null,
      createdById: auth.session.userId,
      ...(parsed.data.role === "STUDENT"
        ? {
            studentProfile: {
              create: {
                classLevel: parsed.data.classLevel?.trim() || null,
                examType: parsed.data.examType || null,
                schoolName: parsed.data.schoolName?.trim() || null,
              },
            },
          }
        : {}),
      ...(parsed.data.role === "TEACHER" || parsed.data.role === "ADMIN"
        ? {
            teacherProfile: {
              create: {
                subjects: parsed.data.subjects?.map((s) => s.trim()).filter(Boolean) ?? [],
                maxStudentCapacity: parsed.data.maxStudentCapacity ?? null,
                internalNotes: parsed.data.internalNotes?.trim() || null,
              },
            },
          }
        : {}),
      productMemberships: { create: products.map((product) => ({ product, source: parsed.data.role === "ADMIN" || parsed.data.role === "TEACHER" ? "STAFF" as const : "MANUAL" as const, grantedById: auth.session.userId })) },
    },
    include: { studentProfile: { select: { id: true } } },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: user.id,
    action: "panel.user_created",
    summary: `${user.email} (${user.role}) hesabı açıldı ve davet oluşturuldu`,
    payload: { products, inviteExpiresAt: invite.expiresAt.toISOString() },
  });

  const origin = resolveAppOrigin(new URL(request.url).origin);
  const inviteUrl = buildInviteUrl(origin, invite.token);
  const inviteMessage = buildInviteMessage({
    fullName: user.fullName,
    email: user.email,
    inviteUrl,
    expiresAt: invite.expiresAt,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      studentProfileId: user.studentProfile?.id || null,
    },
    invite: {
      url: inviteUrl,
      message: inviteMessage,
      expiresAt: invite.expiresAt.toISOString(),
    },
  });
}
