import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { subscribe, type RealtimeEvent } from "@/lib/realtime";
import { touch, clear } from "@/lib/presence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sse(event: RealtimeEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(_req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return new Response("unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (e: RealtimeEvent) => {
        try {
          controller.enqueue(encoder.encode(sse(e)));
        } catch {
          /* closed */
        }
      };

      // Initial hello — flushes headers immediately
      controller.enqueue(encoder.encode(`: connected ${Date.now()}\n\n`));
      touch(userId);

      const unsubscribe = subscribe(userId, send);

      // Keepalive every 25s (most proxies kill idle SSE around 30-60s)
      const ka = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ka ${Date.now()}\n\n`));
          touch(userId);
        } catch {
          clearInterval(ka);
        }
      }, 25_000);

      // Cleanup if client disconnects
      const onAbort = () => {
        clearInterval(ka);
        unsubscribe();
        clear(userId);
        try {
          controller.close();
        } catch {}
      };
      _req.signal?.addEventListener?.("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
