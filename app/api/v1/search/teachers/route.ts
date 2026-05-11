import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ items: [] }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const ids = req.nextUrl.searchParams.get("ids");
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? 20), 50);

  const where: any = ids
    ? { id: { in: ids.split(",") } }
    : q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { subjects: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

  const items = await prisma.teacher.findMany({
    where,
    select: { id: true, fullName: true, subjects: true, status: true },
    orderBy: { fullName: "asc" },
    take,
  });
  return NextResponse.json({
    items: items.map((t) => ({ value: t.id, label: t.fullName, hint: t.subjects })),
  });
}
