import { Suspense } from "react";
import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listInboxMessages } from "@/lib/services/inbox/queries";
import { PageHeader } from "@/components/od/page-header";
import { InboxClient } from "@/components/od/domain/inbox/inbox-client";

type SearchParams = {
  unread?: string;
  archived?: string;
  category?: string;
  q?: string;
  page?: string;
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/v2/admin/inbox");

  const isAdmin = session.user.role === "ADMIN";
  const skip = (Number(sp.page ?? 1) - 1) * 50;

  const { items, total, unread } = await listInboxMessages(
    {
      take: 50,
      skip: Math.max(0, skip),
      unreadOnly: sp.unread === "1",
      archived: sp.archived === "1",
      category: (sp.category as any) || undefined,
      search: sp.q,
    },
    session.user.id,
    isAdmin,
  );

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Gelen Kutusu"
        description="Sistem bildirimleri, duyurular ve mesajlar"
      />
      <Suspense>
        <InboxClient
          items={items as any}
          unreadCount={unread}
          total={total}
          filter={{
            unreadOnly: sp.unread === "1",
            archived: sp.archived === "1",
            category: sp.category,
            q: sp.q,
          }}
        />
      </Suspense>
    </div>
  );
}
