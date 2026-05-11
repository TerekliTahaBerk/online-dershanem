import Link from "next/link";
import { FileText, Users, GraduationCap, Receipt, BarChart3, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { requirePagePermission } from "@/lib/rbac/define-action";

const REPORTS = [
  {
    href: "/v2/admin/istatistikler",
    icon: BarChart3,
    title: "Genel İstatistikler",
    description: "Öğrenci, öğretmen, ders ve gelir KPI'ları",
    tone: "lavender" as const,
  },
  {
    href: "/v2/admin/odemeler",
    icon: Receipt,
    title: "Ödeme Raporu",
    description: "Son 30 gün gelir analizi ve işlem listesi",
    tone: "mint" as const,
  },
  {
    href: "/v2/admin/muhasebe",
    icon: BarChart3,
    title: "Muhasebe Raporu",
    description: "Gelir/gider net analizi (30g + tüm zaman)",
    tone: "yellow" as const,
  },
  {
    href: "/v2/admin/ogrenciler",
    icon: Users,
    title: "Öğrenci Listesi",
    description: "Tüm öğrenciler ve durum dağılımı",
    tone: "sky" as const,
  },
  {
    href: "/v2/admin/ogretmenler",
    icon: GraduationCap,
    title: "Öğretmen Listesi",
    description: "Aktif/pasif öğretmenler ve ders sayıları",
    tone: "blush" as const,
  },
  {
    href: "/v2/admin/audit",
    icon: ScrollText,
    title: "Audit Raporu",
    description: "Sistem üzerinde yapılan tüm yazma işlemleri",
    tone: "lavender" as const,
  },
];

export default async function ReportsPage() {
  await requirePagePermission("reports.read");
  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Raporlar"
        description="Sistem genelinde mevcut detaylı raporlara erişim"
      />
      <div className="grid gap-od-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href}>
              <Card className="h-full transition-all hover:shadow-od-md hover:-translate-y-0.5">
                <CardContent className="space-y-od-2 py-od-4">
                  <div className="flex items-start justify-between">
                    <div className="rounded-od bg-pastel-lavender-soft p-od-2">
                      <Icon className="h-5 w-5 text-pastel-lavender-ink" />
                    </div>
                    <Badge tone={r.tone}>Rapor</Badge>
                  </div>
                  <h3 className="text-od-h3 font-semibold text-od-ink">{r.title}</h3>
                  <p className="text-od-small text-od-mute">{r.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
