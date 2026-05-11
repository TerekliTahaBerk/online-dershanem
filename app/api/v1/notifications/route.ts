import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { listForUser, markRead } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }
  const onlyUnread = req.nextUrl.searchParams.get("unread") === "1";
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? 20), 100);
  const items = await listForUser(session.user.id, { onlyUnread, take });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;
  const result = await markRead(session.user.id, ids);
  return NextResponse.json({ ok: true, updated: result.count });
}
