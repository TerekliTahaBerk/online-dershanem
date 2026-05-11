import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ items: [] }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const ids = req.nextUrl.searchParams.get("ids");
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? 20), 50);

  const baseWhere: any = ids
    ? { id: { in: ids.split(",") } }
    : q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { branch: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

  let where = baseWhere;
  if (session.user.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!teacher) return NextResponse.json({ items: [] });
    where = { AND: [baseWhere, { teachers: { some: { teacherId: teacher.id } } }] };
  }

  const items = await prisma.classroom.findMany({
    where,
    select: { id: true, name: true, branch: true, level: true },
    orderBy: { name: "asc" },
    take,
  });
  return NextResponse.json({
    items: items.map((c) => ({
      value: c.id,
      label: c.name,
      hint: [c.branch, c.level].filter(Boolean).join(" · "),
    })),
  });
}
