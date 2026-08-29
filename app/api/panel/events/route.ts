import { NextResponse } from "next/server";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { isClientPanelEvent, panelEventSchema } from "@/lib/panel-events";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

export async function POST(request: Request) {
  const auth = await requireApiAccountRole("ADMIN", "TEACHER", "STUDENT", "PARENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().baselineMetrics) return new NextResponse(null, { status: 204 });

  const guard = await guardMutation({
    action: "panel.event.write",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:event:${auth.session.userId}`,
    rateLimit: { max: 180, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  const parsed = panelEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz event." }, { status: 400 });
  if (!isClientPanelEvent(parsed.data)) return NextResponse.json({ error: "Bu event yalnız sunucu tarafından üretilebilir." }, { status: 400 });
  if (parsed.data.name === "mock_exam_entry_started" && parsed.data.properties.actorRole !== auth.session.role) return NextResponse.json({ error: "Event rolü oturumla eşleşmiyor." }, { status: 400 });
  if (parsed.data.name === "review_queue_viewed" && parsed.data.properties.actorRole !== auth.session.role) return NextResponse.json({ error: "Event rolü oturumla eşleşmiyor." }, { status: 400 });
  if (parsed.data.name === "plan_review_completed" && auth.session.role !== "TEACHER") return NextResponse.json({ error: "Bu event yalnız öğretmen oturumundan gönderilebilir." }, { status: 400 });

  await recordPanelProductEvent(parsed.data, auth.session.role);
  return new NextResponse(null, { status: 204 });
}
