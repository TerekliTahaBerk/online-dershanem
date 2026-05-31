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
        right={
          unreadTotal > 0 ? (
            <form action={markAllInboxMessagesReadAction}>
              <button type="submit" className="od-btn od-btn-ghost">
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
            style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
          >
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {INBOX_VIEWS.map((v) => {
                const active = v === view;
                return (
                  <button
                    key={v}
                    type="submit"
                    name="view"
                    value={v}
                    className={active ? "od-btn od-btn-primary" : "od-btn od-btn-ghost"}
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
            <button type="submit" className="od-btn od-btn-ghost">
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
        <Card>
          <table className="od-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Başlık</th>
                <th>Kategori</th>
                <th>Öncelik</th>
                <th>Gönderen</th>
                <th>Tarih</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => {
                const isUnread = !m.readAt;
                return (
                  <tr key={m.id} style={{ opacity: isUnread ? 1 : 0.6 }}>
                    <td>
                      {isUnread ? (
                        <span
                          aria-label="Okunmamış"
                          title="Okunmamış"
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "var(--pd-accent, #2563eb)",
                          }}
                        />
                      ) : null}
                    </td>
                    <td>
                      <div style={{ fontWeight: isUnread ? 600 : 400 }}>{m.title}</div>
                      <div className="od-muted" style={{ fontSize: 12, lineHeight: 1.3 }}>
                        {m.body}
                      </div>
                    </td>
                    <td>
                      <Badge tone={getInboxCategoryTone(m.category)}>
                        {getInboxCategoryLabel(m.category)}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={getInboxPriorityTone(m.priority)}>
                        {getInboxPriorityLabel(m.priority)}
                      </Badge>
                    </td>
                    <td className="od-muted" style={{ fontSize: 12 }}>
                      {m.createdBy?.name ?? m.createdBy?.email ?? "Sistem"}
                    </td>
                    <td className="od-mono od-muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      {dateFmt.format(m.createdAt)}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {m.href ? (
                        <Link href={m.href} className="od-btn od-btn-ghost od-btn-sm">
                          Aç
                        </Link>
                      ) : null}
                      {isUnread ? (
                        <form
                          action={markInboxMessageReadAction.bind(null, m.id)}
                          style={{ display: "inline-block", marginLeft: 4 }}
                        >
                          <button type="submit" className="od-btn od-btn-ghost od-btn-sm">
                            Okundu
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
