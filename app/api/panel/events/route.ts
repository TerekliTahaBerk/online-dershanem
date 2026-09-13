import { NextResponse } from "next/server";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { getSession } from "@/lib/auth/session";
import { getResolvedAdminPreview } from "@/lib/auth/admin-preview";
import { isClientPanelEvent, panelEventSchema } from "@/lib/panel-events";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

export async function POST(request: Request) {
  const auth = await requireApiAccountRole("ADMIN", "TEACHER", "STUDENT", "PARENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().baselineMetrics) return new NextResponse(null, { status: 204 });

  // Admin preview gerçek ürün metriklerini kirletmemeli.
  const actor = await getSession();
  if (actor?.role === "ADMIN") {
    const preview = await getResolvedAdminPreview(actor);
    if (preview) {
      await recordPanelProductEvent(
        {
          name: "admin_preview_page_viewed",
          properties: {
            previewRole: preview.context.previewRole,
            pathBand: "CLIENT_EVENT",
          },
        },
        "ADMIN",
      );
      return new NextResponse(null, { status: 204 });
    }
  }

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
  if (parsed.data.name === "plan_review_completed" && auth.session.role !== "TEACHER") return NextResponse.json({ error: "Bu event yalnız öğretmen oturumundan gönderilebilir." }, { status: 403 });
  if (parsed.data.name === "student_next_action_clicked" && (auth.session.role !== "STUDENT" || parsed.data.properties.role !== auth.session.role)) return NextResponse.json({ error: "Bu event yalnız öğrenci oturumundan gönderilebilir." }, { status: 400 });
  if (parsed.data.name === "plan_task_started" && (auth.session.role !== "STUDENT" || parsed.data.properties.role !== auth.session.role)) return NextResponse.json({ error: "Bu event yalnız öğrenci oturumundan gönderilebilir." }, { status: 400 });
  if (parsed.data.name === "odk_recovery_action_started" && (auth.session.role !== "STUDENT" || parsed.data.properties.role !== auth.session.role)) return NextResponse.json({ error: "Bu event yalnız öğrenci oturumundan gönderilebilir." }, { status: 400 });
  if (parsed.data.name === "parent_action_clicked" && (auth.session.role !== "PARENT" || parsed.data.properties.role !== auth.session.role)) return NextResponse.json({ error: "Bu event yalnız veli oturumundan gönderilebilir." }, { status: 400 });

  await recordPanelProductEvent(parsed.data, auth.session.role);
  return new NextResponse(null, { status: 204 });
}
