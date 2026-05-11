import Link from "next/link";
import { Settings, ShieldCheck, ScrollText, User, Database } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function SettingsPage() {
  await requirePagePermission("settings.read");

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Ayarlar"
        description="Sistem yapılandırması ve yönetim araçları"
      />

      <div className="grid gap-od-3 sm:grid-cols-2 lg:grid-cols-3">
        <SettingsCard
          href="/v2/admin/izinler"
          icon={ShieldCheck}
          title="İzin Matrisi"
          description="Rol bazlı erişim haritası ve kullanıcı override'ları"
          badge="RBAC"
        />
        <SettingsCard
          href="/v2/admin/audit"
          icon={ScrollText}
          title="Audit Log"
          description="Tüm yazma işlemlerinin denetim kaydı"
          badge="Güvenlik"
        />
        <SettingsCard
          href="/v2/admin/inbox"
          icon={User}
          title="Inbox & Bildirimler"
          description="Toplu duyuru gönderimi ve mesaj yönetimi"
          badge="İletişim"
        />
        <SettingsCard
          href="/api/v1/me/permissions"
          icon={Database}
          title="API: Permissions Endpoint"
          description="Kullanıcının canlı izinlerini JSON olarak döndürür"
          external
          badge="API"
        />
      </div>

      <Card>
        <CardContent className="space-y-od-2 py-od-4">
          <div className="flex items-center gap-od-2">
            <Settings className="h-5 w-5 text-od-mute" />
            <h3 className="text-od-h3 font-semibold text-od-ink">Sistem Bilgisi</h3>
          </div>
          <dl className="grid gap-od-2 text-od-small sm:grid-cols-2">
            <Info label="Uygulama" value="OnlineDershanem v2 (Faz 1)" />
            <Info label="Tema" value="Pastel pastel sky/yellow/mint/blush/lavender" />
            <Info label="RBAC" value="Permission + RolePermission + UserPermissionOverride" />
            <Info label="Veritabanı" value="PostgreSQL + Prisma 6.15" />
            <Info label="Auth" value="NextAuth (JWT)" />
            <Info label="Realtime" value="Pusher (Faz 4'te aktif)" />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
  external,
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
  badge?: string;
  external?: boolean;
}) {
  const Component: any = external ? "a" : Link;
  const props = external ? { href, target: "_blank", rel: "noopener noreferrer" } : { href };
  return (
    <Component {...props}>
      <Card className="h-full transition-all hover:shadow-od-md hover:-translate-y-0.5">
        <CardContent className="space-y-od-2 py-od-4">
          <div className="flex items-start justify-between">
            <div className="rounded-od bg-pastel-sky-soft p-od-2">
              <Icon className="h-5 w-5 text-pastel-sky-ink" />
            </div>
            {badge && <Badge tone="lavender">{badge}</Badge>}
          </div>
          <h3 className="text-od-h3 font-semibold text-od-ink">{title}</h3>
          <p className="text-od-small text-od-mute">{description}</p>
        </CardContent>
      </Card>
    </Component>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-od-tiny uppercase tracking-wider text-od-mute">{label}</dt>
      <dd className="text-od-body text-od-ink">{value}</dd>
    </div>
  );
}
