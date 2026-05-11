import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, Video, Plus } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { requirePagePermission } from "@/lib/rbac/define-action";

const STATUS_TONE: Record<string, "sky" | "mint" | "blush" | "yellow" | "neutral"> = {
  SCHEDULED: "sky",
  COMPLETED: "mint",
  CANCELLED: "blush",
  NO_SHOW: "blush",
  RESCHEDULED: "yellow",
};

export default async function LessonsPage() {
  await requirePagePermission("lessons.read");

  const lessons = await prisma.lesson.findMany({
    orderBy: { scheduledAt: "desc" },
    take: 100,
    include: {
      student: { select: { id: true, fullName: true } },
      teacher: { select: { id: true, fullName: true } },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Dersler"
        description={`Son ${lessons.length} ders`}
        actions={
          <Link href="/v2/admin/dersler/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Ders
            </Button>
          </Link>
        }
      />
      {lessons.length === 0 ? (
        <EmptyState tone="sky" icon={CalendarDays} title="Henüz ders yok" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Tarih</th>
                  <th className="px-od-4 py-od-2">Öğrenci</th>
                  <th className="px-od-4 py-od-2">Öğretmen</th>
                  <th className="px-od-4 py-od-2">Konu</th>
                  <th className="px-od-4 py-od-2">Süre</th>
                  <th className="px-od-4 py-od-2">Durum</th>
                  <th className="px-od-4 py-od-2">Meet</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => (
                  <tr key={l.id} className="border-b border-od-border/60 hover:bg-od-subtle">
                    <td className="px-od-4 py-od-2">
                      <div className="font-medium text-od-ink">
                        {format(new Date(l.scheduledAt), "dd MMM yyyy", { locale: tr })}
                      </div>
                      <div className="text-od-tiny text-od-mute">
                        {format(new Date(l.scheduledAt), "HH:mm", { locale: tr })}
                      </div>
                    </td>
                    <td className="px-od-4 py-od-2 text-od-ink-2">{l.student?.fullName ?? "—"}</td>
                    <td className="px-od-4 py-od-2 text-od-ink-2">{l.teacher?.fullName ?? "—"}</td>
                    <td className="px-od-4 py-od-2 text-od-mute">
                      {l.title ?? l.subject ?? "—"}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-mute">{l.duration} dk</td>
                    <td className="px-od-4 py-od-2">
                      <Badge tone={STATUS_TONE[l.status] ?? "neutral"}>{l.status}</Badge>
                    </td>
                    <td className="px-od-4 py-od-2">
                      {l.googleMeetLink ? (
                        <a
                          href={l.googleMeetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-od-accent hover:underline"
                        >
                          <Video className="h-3.5 w-3.5" /> Aç
                        </a>
                      ) : (
                        <span className="text-od-mute">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
