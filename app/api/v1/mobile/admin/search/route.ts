import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") return jsonError(403, "FORBIDDEN", "Yetkisiz.");

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return jsonError(400, "BAD_REQUEST", "En az 2 karakter.");

  const [students, teachers, parents] = await Promise.all([
    prisma.student.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      select: { id: true, fullName: true, email: true, phone: true, status: true },
      take: 20,
    }),
    prisma.teacher.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      select: { id: true, fullName: true, email: true, phone: true, status: true },
      take: 20,
    }),
    prisma.parent.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      select: { id: true, fullName: true, email: true, phone: true },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    data: { students, teachers, parents },
  });
}
