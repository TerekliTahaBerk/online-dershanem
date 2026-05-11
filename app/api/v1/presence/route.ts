import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getOnlineMap, onlineCount } from "@/lib/presence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/v1/presence
 *   ?userIds=id1,id2,id3 → { online: { id1: true, id2: false, ... }, count }
 *   (parametre yoksa) → { count }
 */
export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return new Response("unauthorized", { status: 401 });
  }
  const url = new URL(req.url);
  const ids = url.searchParams.get("userIds");
  if (!ids) {
    return Response.json({ count: onlineCount() });
  }
  const list = ids.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200);
  return Response.json({
    online: getOnlineMap(list),
    count: onlineCount(),
  });
}
