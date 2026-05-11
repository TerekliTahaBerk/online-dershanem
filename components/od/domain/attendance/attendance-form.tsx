"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/od/ui/button";
import { Card, CardContent } from "@/components/od/ui/card";
import { recordLessonAttendanceAction } from "@/lib/services/attendance/actions";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

type Student = { id: string; fullName: string };
type Existing = { studentId: string; status: Status; minutesLate?: number | null; notes?: string | null };

const STATUS_OPTIONS: { value: Status; label: string; tone: string }[] = [
  { value: "PRESENT", label: "Var", tone: "bg-pastel-mint text-pastel-mint-ink" },
  { value: "LATE", label: "Geç", tone: "bg-pastel-yellow text-pastel-yellow-ink" },
  { value: "ABSENT", label: "Yok", tone: "bg-pastel-blush text-pastel-blush-ink" },
  { value: "EXCUSED", label: "İzinli", tone: "bg-od-subtle text-od-mute" },
];

export function AttendanceForm({
  lessonId,
  students,
  existing,
}: {
  lessonId: string;
  students: Student[];
  existing: Existing[];
}) {
  const seed = new Map<string, Existing>(existing.map((e) => [e.studentId, e]));
  const [rows, setRows] = useState<Map<string, Existing>>(
    new Map(students.map((s) => [s.id, seed.get(s.id) ?? { studentId: s.id, status: "PRESENT" as Status }])),
  );
  const [pending, start] = useTransition();

  function setRow(id: string, patch: Partial<Existing>) {
    setRows((prev) => {
      const next = new Map(prev);
      const cur = next.get(id) ?? { studentId: id, status: "PRESENT" as Status };
      next.set(id, { ...cur, ...patch });
      return next;
    });
  }

  function bulkSet(status: Status) {
    setRows((prev) => {
      const next = new Map(prev);
      for (const s of students) {
        const cur = next.get(s.id) ?? { studentId: s.id, status: "PRESENT" as Status };
        next.set(s.id, { ...cur, status });
      }
      return next;
    });
  }

  function submit() {
    start(async () => {
      const entries = students.map((s) => rows.get(s.id) ?? { studentId: s.id, status: "PRESENT" as Status });
      const r = await recordLessonAttendanceAction({ lessonId, entries });
      if (r.ok) {
        toast.success(`${(r.data as any).count} kayıt güncellendi`);
      } else if ("fields" in r.error) {
        toast.error("Form geçersiz");
      } else {
        toast.error((r.error as any).message ?? "Hata");
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-od-3 p-od-3">
        <div className="flex flex-wrap items-center gap-od-2 border-b border-od-border pb-od-2">
          <span className="text-od-tiny text-od-mute">Toplu işaretle:</span>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => bulkSet(s.value)}
              className={`rounded-od px-od-2 py-1 text-od-tiny font-medium ${s.tone} hover:opacity-80`}
            >
              Tümü {s.label}
            </button>
          ))}
        </div>

        <div className="space-y-od-2">
          {students.map((s) => {
            const r = rows.get(s.id) ?? { studentId: s.id, status: "PRESENT" as Status };
            return (
              <div key={s.id} className="grid grid-cols-12 items-center gap-od-2 rounded-od border border-od-border p-od-2">
                <div className="col-span-3 font-medium text-od-body">{s.fullName}</div>
                <div className="col-span-5 flex flex-wrap gap-1">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = r.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRow(s.id, { status: opt.value })}
                        className={`rounded-od px-od-2 py-1 text-od-tiny font-medium ${
                          active ? opt.tone : "bg-od-subtle text-od-mute hover:bg-od-border"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="number"
                  min={0}
                  placeholder="dk"
                  value={r.minutesLate ?? ""}
                  disabled={r.status !== "LATE"}
                  onChange={(e) => setRow(s.id, { minutesLate: e.target.value ? Number(e.target.value) : null })}
                  className="col-span-1 h-8 w-full rounded-od border border-od-border bg-od-surface px-1 text-od-tiny disabled:opacity-40"
                />
                <input
                  type="text"
                  placeholder="Not (ops.)"
                  value={r.notes ?? ""}
                  onChange={(e) => setRow(s.id, { notes: e.target.value || null })}
                  className="col-span-3 h-8 w-full rounded-od border border-od-border bg-od-surface px-od-2 text-od-tiny"
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-od-2">
          <Button variant="primary" onClick={submit} disabled={pending}>
            <Save className="mr-1 h-4 w-4" /> {pending ? "Kaydediliyor…" : "Yoklamayı Kaydet"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
