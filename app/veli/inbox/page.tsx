import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { listInboxMessages } from "@/lib/inbox";
import { InboxList } from "@/components/inbox/inbox-list";
import {
  parentMarkRead, parentArchive, parentUnarchive, parentMarkAllRead,
} from "@/components/inbox/inbox-actions";

export const dynamic = "force-dynamic";

export default async function ParentInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session || !getPanelAccess(session.user).hasParentPanel) redirect("/giris");
  const params = await searchParams;
  const archived = params?.archived === "1";

  const { items, total, unread } = await listInboxMessages(
    session.user!.id,
    { archived },
    { take: 100 },
  );

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title">Bildirimler</h1>
          <p className="pd-page-subtitle">
            Çocuğunuzun ödev, yoklama, ödeme ve ders gelişmeleri.
          </p>
        </div>
      </div>
      <InboxList
        items={items as any}
        total={total}
        unread={unread}
        archived={archived}
        basePath="/veli/inbox"
        onMarkRead={parentMarkRead}
        onArchive={parentArchive}
        onUnarchive={parentUnarchive}
        onMarkAllRead={parentMarkAllRead}
      />
    </div>
  );
}
