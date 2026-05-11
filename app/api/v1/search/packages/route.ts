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
      ? { name: { contains: q, mode: "insensitive" } }
      : { isActive: true };

  const items = await prisma.package.findMany({
    where,
    select: { id: true, name: true, type: true, price: true, lessonCount: true },
    orderBy: { name: "asc" },
    take,
  });
  return NextResponse.json({
    items: items.map((p) => ({
      value: p.id,
      label: p.name,
      hint: `${p.type} · ${p.lessonCount} ders · ${(p.price / 100).toLocaleString("tr-TR")} ₺`,
    })),
  });
}
