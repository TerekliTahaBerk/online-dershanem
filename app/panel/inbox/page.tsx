import Link from "next/link";
import type { Metadata } from "next";
import { requirePanelSession } from "@/lib/panel-access";
import { getInboxMessagesForUser, getUnreadInboxCount } from "@/lib/notifications";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  getInboxCategoryLabel,
  getInboxCategoryTone,
  getInboxPriorityLabel,
  getInboxPriorityTone,
  getInboxViewLabel,
  INBOX_VIEWS,
  type InboxView,
} from "@/lib/panel/inbox-display";
import {
  markAllInboxMessagesReadAction,
  markInboxMessageReadAction,
} from "./_actions";
import type { InboxCategory } from "@prisma/client";

export const metadata: Metadata = {
  title: "Inbox · Panel",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const CATEGORIES: InboxCategory[] = [
  "SYSTEM",
  "FINANCE",
  "EDUCATION",
  "ANNOUNCEMENT",
  "TEACHER_MESSAGE",
  "ATTENDANCE",
  "ASSIGNMENT",
];

function parseView(raw: string | undefined): InboxView {
  return INBOX_VIEWS.includes(raw as InboxView) ? (raw as InboxView) : "all";
}

function parseCategory(raw: string | undefined): InboxCategory | null {
  return raw && (CATEGORIES as string[]).includes(raw) ? (raw as InboxCategory) : null;
}

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function InboxPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePanelSession();
  const sp = (await searchParams) ?? {};
  const view = parseView(typeof sp.view === "string" ? sp.view : undefined);
  const category = parseCategory(typeof sp.category === "string" ? sp.category : undefined);

  const [messages, unreadTotal] = await Promise.all([
    getInboxMessagesForUser(ctx.userId, { view, category, take: 100 }),
    getUnreadInboxCount(ctx.userId),
  ]);

  const subtitleParts = [`${messages.length} mesaj`];
  if (unreadTotal > 0) subtitleParts.push(`${unreadTotal} okunmamış`);

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle={subtitleParts.join(" · ")}
        breadcrumbs={[{ label: "Panel", href: "/panel" }, { label: "Bildirimler" }]}
        right={
          unreadTotal > 0 ? (
            <form action={markAllInboxMessagesReadAction}>
              <button type="submit" className="od-btn ghost sm">
                Tümünü okundu işaretle
              </button>
            </form>
          ) : null
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <CardBody>
          <form
            method="GET"
            style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}
          >
            <div className="od-segment" role="tablist" aria-label="Görünüm">
              {INBOX_VIEWS.map((v) => {
                const active = v === view;
                return (
                  <button
                    key={v}
                    type="submit"
                    name="view"
                    value={v}
                    className={`od-segment-item${active ? " is-active" : ""}`}
                    aria-pressed={active}
                  >
                    {getInboxViewLabel(v)}
                  </button>
                );
              })}
            </div>
            <select
              name="category"
              defaultValue={category ?? ""}
              className="od-input"
              style={{ flex: "0 0 auto" }}
            >
              <option value="">Tüm kategoriler</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {getInboxCategoryLabel(c)}
                </option>
              ))}
            </select>
            <input type="hidden" name="view" value={view} />
            <button type="submit" className="od-btn ghost sm">
              Filtrele
            </button>
          </form>
        </CardBody>
      </Card>

      {messages.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="inbox"
              title={view === "unread" ? "Okunmamış mesaj yok" : "Mesaj yok"}
              description="Yeni bildirimler buraya düşecek."
            />
          </CardBody>
        </Card>
      ) : (
        <ul className="od-inbox-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {messages.map((m) => {
            const isUnread = !m.readAt;
            return (
              <li
                key={m.id}
                className={`od-inbox-item${isUnread ? " od-inbox-unread" : ""}`}
              >
                <span className="od-inbox-accent" aria-hidden />
                <div style={{ minWidth: 0 }}>
                  <div className="od-inbox-title">{m.title}</div>
                  {m.body ? <div className="od-inbox-body">{m.body}</div> : null}
                  <div className="od-inbox-meta">
                    <Badge tone={getInboxCategoryTone(m.category)}>
                      {getInboxCategoryLabel(m.category)}
                    </Badge>
                    <Badge tone={getInboxPriorityTone(m.priority)}>
                      {getInboxPriorityLabel(m.priority)}
                    </Badge>
                    <span>· {m.createdBy?.name ?? m.createdBy?.email ?? "Sistem"}</span>
                    <span className="od-mono">· {dateFmt.format(m.createdAt)}</span>
                  </div>
                </div>
                <div className="od-inbox-actions">
                  {m.href ? (
                    <Link href={m.href} className="od-btn ghost sm">
                      Aç →
                    </Link>
                  ) : null}
                  {isUnread ? (
                    <form action={markInboxMessageReadAction.bind(null, m.id)}>
                      <button type="submit" className="od-btn ghost sm">
                        Okundu
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
