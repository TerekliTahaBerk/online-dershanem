import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { countUnread } from "@/lib/notifications";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }
  const count = await countUnread(session.user.id);
  return NextResponse.json({ count });
}
