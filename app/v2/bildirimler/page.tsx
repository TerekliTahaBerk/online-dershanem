import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowLeft, Bell, Inbox } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { listForUser, markRead } from "@/lib/notifications";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  SYSTEM: "Sistem",
  LESSON: "Ders",
  CONTENT: "İçerik",
  PAYMENT: "Ödeme",
  PERFORMANCE: "Performans",
  ANNOUNCEMENT: "Duyuru",
};

const PRIORITY_TONE: Record<string, "neutral" | "sky" | "yellow" | "blush"> = {
  LOW: "neutral",
  NORMAL: "sky",
  HIGH: "yellow",
  URGENT: "blush",
};

const PANEL_HOME: Record<string, string> = {
  ADMIN: "/v2/admin",
  TEACHER: "/v2/ogretmen",
  STUDENT: "/v2/panel",
  PARENT: "/v2/veli",
};

async function markAllAction() {
  "use server";
  const s = await getServerAuthSession();
  if (!s?.user?.id) return;
  await markRead(s.user.id);
}

export default async function NotificationsPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/v2/bildirimler");

  const items = await listForUser(session.user.id, { take: 100 });
  const unreadCount = items.filter((i) => !i.readAt).length;
  const homeHref = PANEL_HOME[session.user.role] ?? "/panel-secimi";

  return (
    <div className="mx-auto max-w-3xl space-y-od-5 px-4 py-6">
      <Link
        href={homeHref}
        className="inline-flex items-center gap-1 text-od-tiny text-od-mute hover:text-od-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Panele dön
      </Link>

      <PageHeader
        title="Bildirimler"
        description={
          <span className="inline-flex items-center gap-2">
            <Bell className="h-4 w-4 text-od-mute" />
            Toplam {items.length} kayıt · {unreadCount} okunmamış
          </span>
        }
        actions={
          <form action={markAllAction}>
            <Button type="submit" variant="outline" size="sm" disabled={unreadCount === 0}>
              Tümünü okundu işaretle
            </Button>
          </form>
        }
      />

      {items.length === 0 ? (
        <EmptyState tone="lavender" icon={Inbox} title="Henüz bildirim yok" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-od-border/60">
              {items.map((n) => {
                const unread = !n.readAt;
                const inner = (
                  <div
                    className={[
                      "flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-od-subtle/60",
                      unread ? "bg-pastel-sky-soft/30" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={PRIORITY_TONE[n.priority] ?? "neutral"} size="sm">
                          {TYPE_LABEL[n.type] ?? n.type}
                        </Badge>
                        <h3 className="text-od-small font-semibold text-od-ink">
                          {n.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {unread && (
                          <span className="h-2 w-2 rounded-full bg-pastel-blush-ink" />
                        )}
                        <span className="text-[11px] text-od-mute">
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                            locale: tr,
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="text-od-small text-od-ink-2">{n.body}</p>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.href ? <Link href={n.href}>{inner}</Link> : inner}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
