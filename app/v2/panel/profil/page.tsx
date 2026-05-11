import { redirect, notFound } from "next/navigation";
import { User, Mail, Phone, Target, School, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      parents: { include: { parent: true } },
    },
  });
  if (!student) return notFound();

  return (
    <div className="space-y-od-5">
      <PageHeader title="Profilim" description="Kişisel bilgiler ve hedefler" />

      <div className="grid gap-od-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <User className="h-4 w-4 text-pastel-sky-ink" /> Bilgilerim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2 text-od-body">
            <div className="text-od-h3 font-semibold">{student.fullName}</div>
            <div className="flex items-center gap-od-2 text-od-mute">
              <Phone className="h-4 w-4" /> {student.phone}
            </div>
            {student.email && (
              <div className="flex items-center gap-od-2 text-od-mute">
                <Mail className="h-4 w-4" /> {student.email}
              </div>
            )}
            {(student.city || student.district) && (
              <div className="flex items-center gap-od-2 text-od-mute">
                <MapPin className="h-4 w-4" /> {[student.district, student.city].filter(Boolean).join(", ")}
              </div>
            )}
            {student.schoolName && (
              <div className="flex items-center gap-od-2 text-od-mute">
                <School className="h-4 w-4" /> {student.schoolName}
              </div>
            )}
            <div className="flex flex-wrap gap-od-2 pt-od-2">
              {student.classLevel && <Badge tone="sky" size="sm">{student.classLevel}</Badge>}
              {student.examType && <Badge tone="lavender" size="sm">{student.examType}</Badge>}
              {student.department && <Badge tone="mint" size="sm">{student.department}</Badge>}
              <Badge tone={student.status === "ACTIVE" ? "mint" : "neutral"}>{student.status}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <Target className="h-4 w-4 text-pastel-lavender-ink" /> Hedeflerim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2 text-od-body">
            <Field label="Hedef" value={student.targetGoal} />
            <Field label="Hedef Üniversite/Bölüm" value={student.targetSchool} />
            <Field label="Hedef Sıralama" value={student.targetRanking} />
            <Field label="Mevcut Net" value={student.currentNet} />
            <Field label="Mevcut Seviye" value={student.currentLevel} />
            <Field label="Güçlü Dersler" value={student.strongLessons} />
            <Field label="Zayıf Dersler" value={student.weakLessons} />
            <Field label="Haftalık Çalışma" value={student.weeklyStudyHours} />
          </CardContent>
        </Card>
      </div>

      {student.parents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Velilerim</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-od-border p-0">
            {student.parents.map((ps) => (
              <div key={ps.parentId} className="flex items-center justify-between p-od-3">
                <div>
                  <div className="font-medium text-od-body">{ps.parent.fullName}</div>
                  <div className="text-od-tiny text-od-mute">
                    {ps.parent.phone ?? "—"} {ps.parent.email && `· ${ps.parent.email}`}
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
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-od-2 text-od-small">
      <span className="text-od-mute">{label}</span>
      <span className="text-right font-medium text-od-ink">{value || "—"}</span>
    </div>
  );
}
