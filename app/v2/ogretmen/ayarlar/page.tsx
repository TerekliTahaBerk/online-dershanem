import { redirect } from "next/navigation";
import { Bell, User } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { SettingsCard } from "@/components/od/settings/settings-card";

export const dynamic = "force-dynamic";

export default async function TeacherSettingsPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Ayarlar"
        description="Hesap ve bildirim tercihleri"
      />
      <div className="grid gap-od-3 sm:grid-cols-2 lg:grid-cols-3">
        <SettingsCard
          href="/v2/bildirim-tercihleri"
          icon={Bell}
          title="Bildirim Tercihleri"
          description="Tip bazında inbox/toast/e-posta kanallarını yönet"
          badge="Kişisel"
        />
        <SettingsCard
          href="/v2/ogretmen/profil"
          icon={User}
          title="Profil & Maaş"
          description="Kişisel bilgiler ve ödeme geçmişi"
          badge="Hesap"
        />
      </div>
    </div>
  );
}
