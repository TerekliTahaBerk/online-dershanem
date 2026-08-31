import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAccountRole } from "@/lib/auth/api-guards";

const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
});

export async function GET(request: Request) {
  const auth = await requireApiAccountRole("ADMIN");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }

  const q = parsed.data.q;
  const [users, groups, orders] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, fullName: true, email: true, role: true },
    }),
    prisma.group.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { subject: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      take: 5,
      select: { id: true, name: true, subject: true, isActive: true, teacher: { select: { fullName: true, email: true } } },
    }),
    prisma.odOrder.findMany({
      where: {
        OR: [
          { id: { contains: q } },
          { packageName: { contains: q, mode: "insensitive" } },
          { user: { is: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, packageName: true, status: true, provisioningStatus: true, user: { select: { fullName: true, email: true } } },
    }),
  ]);

  return NextResponse.json({
    results: [
      ...users.map((user) => ({
        kind: "USER",
        id: user.id,
        label: user.fullName || user.email,
        detail: `${user.email} · ${user.role}`,
        href: `/panel/yonetim/kullanicilar/${user.id}`,
      })),
      ...groups.map((group) => ({
        kind: "GROUP",
        id: group.id,
        label: group.name,
        detail: `${group.subject} · ${group.teacher.fullName || group.teacher.email}${group.isActive ? "" : " · kapalı"}`,
        href: `/panel/yonetim/gruplar/${group.id}`,
      })),
      ...orders.map((order) => ({
        kind: "ORDER",
        id: order.id,
        label: order.packageName,
        detail: `${order.user?.fullName || order.user?.email || "hesap bekleniyor"} · ${order.status}/${order.provisioningStatus}`,
        href: `/panel/yonetim/siparisler/${order.id}`,
      })),
    ],
  });
}

