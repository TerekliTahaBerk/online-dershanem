import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }
  const count = await prisma.inboxMessage.count({
    where: {
      recipientUserId: session.user.id,
      readAt: null,
      archivedAt: null,
    },
  });
  return NextResponse.json({ count });
}
