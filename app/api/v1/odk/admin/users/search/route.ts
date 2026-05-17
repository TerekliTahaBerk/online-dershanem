import { NextResponse } from "next/server";
import { requirePanelRole } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";

/**
 * Admin kullanıcı arama (autocomplete için). ODK manuel grant akışında kullanılır.
 *
 * GET /api/v1/odk/admin/users/search?q=foo
 *
 * - Admin only.
 * - Ad / email / (bağlı Student üzerinden) telefon ile arama.
 * - İlk 20 kullanıcı. Her satır mevcut aktif ODK entitlement bilgisini içerir.
 */
export async function GET(req: Request) {
  try {
    await requirePanelRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, users: [] });
  }

  const now = new Date();
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { student: { fullName: { contains: q, mode: "insensitive" } } },
        { student: { phone: { contains: q } } },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      student: { select: { fullName: true, phone: true } },
      odkEntitlements: {
        where: { status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        take: 1,
        select: { id: true },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    users: users.map((u) => ({
      id: u.id,
      name: u.name ?? u.student?.fullName ?? null,
      email: u.email,
      phone: u.student?.phone ?? null,
      role: u.role,
      hasActiveOdkEntitlement: u.odkEntitlements.length > 0,
    })),
  });
}
