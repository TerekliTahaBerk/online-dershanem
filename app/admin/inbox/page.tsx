import { redirect } from "next/navigation";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { listInboxMessages } from "@/lib/inbox";
import { InboxList } from "@/components/inbox/inbox-list";
import {
  adminMarkRead, adminArchive, adminUnarchive, adminMarkAllRead,
} from "@/components/inbox/inbox-actions";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session || !getPanelAccess(session.user).hasAdminPanel) redirect("/giris");
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
            Sistem mesajları, finansal hareketler, lead aktiviteleri ve duyurular.
          </p>
        </div>
        <Link href="/admin/inbox/yeni-duyuru" className="pd-btn-accent" style={{ textDecoration: "none" }}>
          <Megaphone size={14} /> Yeni Duyuru
        </Link>
      </div>
      <InboxList
        items={items as any}
        total={total}
        unread={unread}
        archived={archived}
        basePath="/admin/inbox"
        onMarkRead={adminMarkRead}
        onArchive={adminArchive}
        onUnarchive={adminUnarchive}
        onMarkAllRead={adminMarkAllRead}
      />
    </div>
  );
}
