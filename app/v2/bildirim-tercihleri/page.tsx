import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { NotificationPrefsForm } from "@/components/od/settings/notification-prefs-form";
import { loadNotificationPrefs } from "@/lib/services/notification-prefs/loader";

export const dynamic = "force-dynamic";

export default async function NotificationPreferencesPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const prefs = await loadNotificationPrefs(session.user.id);

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Bildirim Tercihleri"
        description="Hangi tip bildirimlerin nereden iletilmesini istediğini yönet"
      />
      <NotificationPrefsForm initialPrefs={prefs} />
    </div>
  );
}
