import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { GraduationCap, Mail, Phone, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";

export const dynamic = "force-dynamic";

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

export default async function TeacherProfilePage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      payrolls: { orderBy: { createdAt: "desc" }, take: 12 },
    },
  });
  if (!teacher) return notFound();

  const totalPayroll = teacher.payrolls.reduce((acc, p: any) => acc + (p.amount ?? 0), 0);

  return (
    <div className="space-y-od-5">
      <PageHeader title="Profil & Maaş" description="Kişisel bilgiler ve ödeme geçmişi" />

      <div className="grid gap-od-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <GraduationCap className="h-4 w-4 text-pastel-mint-ink" /> {teacher.fullName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2 text-od-body">
            <div className="text-od-tiny text-od-mute">{teacher.subjects}</div>
            <div className="flex items-center gap-od-2 pt-od-2 text-od-mute">
              <Mail className="h-4 w-4" /> {teacher.email ?? "—"}
            </div>
            <div className="flex items-center gap-od-2 text-od-mute">
              <Phone className="h-4 w-4" /> {teacher.phone ?? "—"}
            </div>
            <div className="pt-od-2">
              <Badge tone={teacher.status === "ACTIVE" ? "mint" : "blush"}>{teacher.status}</Badge>
            </div>
            {teacher.bio && (
              <p className="pt-od-2 text-od-tiny text-od-mute whitespace-pre-line">{teacher.bio}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <Wallet className="h-4 w-4 text-pastel-peach-ink" /> Toplam Ödeme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-od-h2 font-bold text-pastel-mint-ink">{fmtTL(totalPayroll)}</div>
            <p className="text-od-tiny text-od-mute">Son 12 dönem</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ödeme Geçmişi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {teacher.payrolls.length === 0 ? (
            <p className="p-od-3 text-od-tiny text-od-mute">Henüz kayıt yok.</p>
          ) : (
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Tarih</th>
                  <th className="px-od-4 py-od-2">Tutar</th>
                  <th className="px-od-4 py-od-2">Not</th>
                </tr>
              </thead>
              <tbody>
                {teacher.payrolls.map((p: any) => (
                  <tr key={p.id} className="border-b border-od-border/60">
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                      {format(p.createdAt, "dd MMM yyyy", { locale: tr })}
                    </td>
                    <td className="px-od-4 py-od-2 font-medium">{fmtTL(p.amount ?? 0)}</td>
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">{p.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
