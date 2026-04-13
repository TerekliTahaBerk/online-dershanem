import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";

export async function POST(req: Request) {
  const session = await getServerAuthSession();
  const access = getPanelAccess(session?.user);
  if (!session || !access.hasAdminPanel) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-posta gerekli" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, name: true, email: true },
  });

  if (!user) return NextResponse.json({ error: "Bu e-posta ile kayıtlı kullanıcı bulunamadı." }, { status: 404 });

  return NextResponse.json({ userId: user.id, name: user.name, email: user.email });
}
