import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "sky" | "mint" | "blush" | "neutral"> = {
  SCHEDULED: "sky",
  COMPLETED: "mint",
  CANCELLED: "blush",
};

export default async function TeacherCalendarPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teacher) return notFound();

  const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const lessons = await prisma.lesson.findMany({
    where: { teacherId: teacher.id, scheduledAt: { gte: new Date(), lte: next30 } },
    orderBy: { scheduledAt: "asc" },
    include: {
      student: { select: { fullName: true } },
      classroom: { select: { name: true } },
    },
  });

  // Group by day
  const byDay = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const key = format(l.scheduledAt, "yyyy-MM-dd");
    const arr = byDay.get(key) ?? [];
    arr.push(l);
    byDay.set(key, arr);
  }

  return (
    <div className="space-y-od-5">
      <PageHeader title="Takvim" description="Önümüzdeki 30 gün" />
      {byDay.size === 0 ? (
        <EmptyState tone="sky" icon={CalendarCheck} title="Planlı ders yok" />
      ) : (
        <div className="space-y-od-4">
          {[...byDay.entries()].map(([day, items]) => (
            <Card key={day}>
              <CardContent className="space-y-od-2 p-od-3">
                <div className="text-od-tiny font-medium uppercase text-od-mute">
                  {format(new Date(day), "EEEE, dd MMMM yyyy", { locale: tr })}
                </div>
                <div className="divide-y divide-od-border">
                  {items.map((l) => (
                    <div key={l.id} className="flex items-center justify-between py-od-2">
                      <div>
                        <div className="font-medium text-od-body">{l.title ?? l.subject ?? "—"}</div>
                        <div className="text-od-tiny text-od-mute">
                          {l.student.fullName}
                          {l.classroom && ` · ${l.classroom.name}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-od-2">
                        <Badge tone={STATUS_TONE[l.status] ?? "neutral"} size="sm">{l.status}</Badge>
                        <span className="text-od-tiny text-od-mute">
                          {format(l.scheduledAt, "HH:mm", { locale: tr })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
