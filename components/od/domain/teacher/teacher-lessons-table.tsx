"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Filter, Video } from "lucide-react";
import { DataTable } from "@/components/od/data/data-table";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { Input } from "@/components/od/ui/input";
import { ExportButton } from "@/components/od/data/export-button";
import { SavedViewsMenu, type SavedViewItem } from "@/components/od/data/saved-views-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/od/ui/popover";

export type TeacherLessonRow = {
  id: string;
  scheduledAt: string; // ISO
  title: string | null;
  subject: string | null;
  studentName: string;
  classroomName: string | null;
  duration: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  googleMeetLink: string | null;
};

const STATUS_TONE: Record<TeacherLessonRow["status"], "sky" | "mint" | "blush"> = {
  SCHEDULED: "sky",
  COMPLETED: "mint",
  CANCELLED: "blush",
};
const STATUS_LABEL: Record<TeacherLessonRow["status"], string> = {
  SCHEDULED: "Planlı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};
const STATUSES: TeacherLessonRow["status"][] = ["SCHEDULED", "COMPLETED", "CANCELLED"];

export function TeacherLessonsTable({
  data,
  savedViews = [],
  currentUserId,
}: {
  data: TeacherLessonRow[];
  savedViews?: SavedViewItem[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const current = React.useMemo(
    () => ({
      status: sp.getAll("status"),
      from: sp.get("from") ?? "",
      to: sp.get("to") ?? "",
    }),
    [sp]
  );

  const totalActive =
    current.status.length + (current.from ? 1 : 0) + (current.to ? 1 : 0);

  const writeParams = (mut: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(sp.toString());
    mut(params);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const toggleStatus = (value: string) => {
    writeParams((p) => {
      const cur = p.getAll("status");
      p.delete("status");
      const next = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
      next.forEach((v) => p.append("status", v));
    });
  };

  const setDate = (key: "from" | "to", value: string) => {
    writeParams((p) => {
      if (value) p.set(key, value);
      else p.delete(key);
    });
  };

  const clearAll = () =>
    writeParams((p) => {
      p.delete("status");
      p.delete("from");
      p.delete("to");
    });

  const columns = React.useMemo<ColumnDef<TeacherLessonRow>[]>(
    () => [
      {
        accessorKey: "scheduledAt",
        header: "Tarih",
        cell: ({ row }) => (
          <span className="text-od-tiny text-od-mute">
            {format(new Date(row.original.scheduledAt), "dd MMM yyyy HH:mm", { locale: tr })}
          </span>
        ),
      },
      {
        id: "title",
        accessorFn: (r) => r.title ?? r.subject ?? "—",
        header: "Başlık",
        cell: ({ row }) => (
          <span className="font-medium text-od-ink">
            {row.original.title ?? row.original.subject ?? "—"}
          </span>
        ),
      },
      {
        id: "student",
        accessorFn: (r) => r.studentName + " " + (r.classroomName ?? ""),
        header: "Öğrenci / Sınıf",
        cell: ({ row }) => (
          <span className="text-od-mute">
            {row.original.studentName}
            {row.original.classroomName && ` · ${row.original.classroomName}`}
          </span>
        ),
      },
      {
        accessorKey: "duration",
        header: "Süre",
        cell: ({ row }) => <span className="text-od-mute">{row.original.duration} dk</span>,
      },
      {
        accessorKey: "status",
        header: "Durum",
        cell: ({ row }) => (
          <Badge tone={STATUS_TONE[row.original.status]} size="sm">
            {STATUS_LABEL[row.original.status]}
          </Badge>
        ),
      },
      {
        id: "meet",
        header: "",
        cell: ({ row }) =>
          row.original.googleMeetLink ? (
            <a
              href={row.original.googleMeetLink}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink"
            >
              <Video className="h-3.5 w-3.5" /> Meet
            </a>
          ) : null,
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Başlık, öğrenci ara…"
      pageSize={25}
      emptyState="Filtreye uyan ders yok."
      toolbar={
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-3.5 w-3.5" />
                Filtrele
                {totalActive > 0 && (
                  <Badge tone="lavender" size="sm" className="ml-1">{totalActive}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[320px] space-y-3 p-3">
              <div>
                <div className="mb-1.5 text-od-tiny font-semibold uppercase tracking-wide text-od-mute">
                  Durum
                </div>
                <div className="flex flex-wrap gap-1">
                  {STATUSES.map((s) => {
                    const active = current.status.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleStatus(s)}
                        className={[
                          "rounded-od-sm border px-2 py-1 text-od-tiny transition-colors",
                          active
                            ? "border-od-accent bg-od-accent/10 text-od-accent"
                            : "border-od-border bg-od-surface text-od-ink-2 hover:border-od-ink/30",
                        ].join(" ")}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-od-tiny font-semibold uppercase tracking-wide text-od-mute">
                  Tarih aralığı
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={current.from}
                    onChange={(e) => setDate("from", e.target.value)}
                  />
                  <Input
                    type="date"
                    value={current.to}
                    onChange={(e) => setDate("to", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end border-t border-od-border pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  disabled={totalActive === 0}
                >
                  Temizle
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {currentUserId && (
            <SavedViewsMenu scope="teacher.lessons" views={savedViews} currentUserId={currentUserId} />
          )}
          <ExportButton endpoint="/api/v1/export/teacher/my-lessons" />
        </>
      }
    />
  );
}
