import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { productLabel } from "@/lib/auth/roles";

/**
 * Öğrenci Profil ve hesap verisi — JSON karşılığı.
 *
 * `app/panel/ogrenci/profil/page.tsx` ile AYNI iki sorgu. ÜRÜNDEN BAĞIMSIZ
 * (web'in kendi yorumu: `requireRole` OD şartı koşar, burada YANLIŞ olurdu)
 * — bu yüzden `requireApiOdRole` DEĞİL, rol-yalnız `requireApiAccountRole`
 * kullanılır; öğrenci hangi ürünü almış olursa olsun kendi profilini
 * görebilmeli.
 */
export async function GET() {
  const auth = await requireApiAccountRole("STUDENT");
  if (!auth.ok) return auth.response;

  const [profile, memberships] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: auth.session.userId },
      select: {
        classLevel: true,
        targetGoal: true,
        parents: { select: { relationship: true, parent: { select: { fullName: true, email: true } } } },
      },
    }),
    prisma.productMembership.findMany({
      where: { userId: auth.session.userId, revokedAt: null },
      select: { product: true, expiresAt: true, startsAt: true },
      orderBy: { product: "asc" },
    }),
  ]);

  const now = new Date();
  const active = memberships.filter((m) => !m.expiresAt || m.expiresAt > now);

  return NextResponse.json({
    fullName: auth.session.fullName,
    email: auth.session.email,
    targetGoal: profile?.targetGoal ?? null,
    classLevel: profile?.classLevel ?? null,
    parents: (profile?.parents ?? []).map((p) => p.parent.fullName || p.parent.email),
    activeProducts: active.map((m) => ({ label: productLabel(m.product), expiresAt: m.expiresAt })),
  });
}
