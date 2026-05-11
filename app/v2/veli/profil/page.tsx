import { redirect, notFound } from "next/navigation";
import { User, Mail, Phone } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { getParentWithChildren } from "@/lib/parent-context";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";

export const dynamic = "force-dynamic";

export default async function ParentProfilePage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");
  const ctx = await getParentWithChildren(session.user.id);
  if (!ctx) return notFound();

  const { parent } = ctx;

  return (
    <div className="space-y-od-5">
      <PageHeader title="Profilim" description="Veli iletişim bilgileri" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <User className="h-4 w-4 text-pastel-sky-ink" /> {parent.fullName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-od-2 text-od-body">
          {parent.phone && (
            <div className="flex items-center gap-od-2 text-od-mute">
              <Phone className="h-4 w-4" /> {parent.phone}
            </div>
          )}
          {parent.email && (
            <div className="flex items-center gap-od-2 text-od-mute">
              <Mail className="h-4 w-4" /> {parent.email}
            </div>
          )}
          {parent.notes && (
            <p className="rounded-od border border-od-border bg-od-subtle p-od-2 text-od-tiny text-od-mute whitespace-pre-line">
              {parent.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bağlı Çocuklar</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-od-border p-0">
          {parent.students.map((ps) => (
            <div key={ps.studentId} className="flex items-center justify-between p-od-3">
              <div>
                <div className="font-medium text-od-body">{ps.student.fullName}</div>
                <div className="text-od-tiny text-od-mute">
                  {ps.student.classLevel ?? "—"} {ps.student.examType && `· ${ps.student.examType}`}
                </div>
              </div>
              <div className="flex items-center gap-od-2">
                {ps.relationship && <Badge tone="sky" size="sm">{ps.relationship}</Badge>}
                {ps.isPrimary && <Badge tone="mint" size="sm">Birincil</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
