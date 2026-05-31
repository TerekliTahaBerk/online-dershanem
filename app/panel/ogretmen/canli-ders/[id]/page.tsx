import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { LessonLifecycleButtons } from "@/components/panel/lessons/lifecycle-buttons";
import {
  setLessonMeetingLinkAction,
  attachLessonMaterialsAction,
  detachLessonMaterialAction,
} from "@/app/panel/ogretmen/_actions";
import { lessonStatusLabel, lessonStatusTone } from "@/lib/lessons/lifecycle";
import { resolveMeetingLink } from "@/lib/lessons/meeting-provider";
import {
  getMaterialsForLesson,
  getAttachableMaterialsForTeacher,
} from "@/lib/panel/material-attachments";
import { LessonMaterialsSection } from "@/components/panel/materials/lesson-materials-section";

export const dynamic = "force-dynamic";

export default async function TeacherLiveLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { teacher } = await requireTeacher();
  if (!teacher) return notFound();
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      student: { select: { fullName: true } },
      classroom: { select: { name: true } },
      course: { select: { title: true } },
    },
  });
  if (!lesson || lesson.teacherId !== teacher.id) return notFound();

  // Aynı seans (sessionGroupId) tüm öğrencileri
  const cohort = lesson.sessionGroupId
    ? await prisma.lesson.findMany({
        where: { sessionGroupId: lesson.sessionGroupId },
        select: {
          id: true, status: true,
          student: { select: { id: true, fullName: true } },
          attendances: { select: { id: true, status: true, source: true, firstJoinedAt: true } },
        },
        orderBy: { createdAt: "asc" },
      })
    : [{
        id: lesson.id,
        status: lesson.status,
        student: { id: lesson.studentId, fullName: lesson.student.fullName },
        attendances: await prisma.attendance.findMany({
          where: { lessonId: lesson.id },
          select: { id: true, status: true, source: true, firstJoinedAt: true },
        }),
      }];

  // Son join event'leri (son 1 saat)
  const since = new Date(Date.now() - 60 * 60_000);
  const joinEvents = lesson.sessionGroupId
    ? await prisma.lessonJoinEvent.findMany({
        where: { sessionGroupId: lesson.sessionGroupId, ts: { gte: since } },
        orderBy: { ts: "desc" },
        take: 50,
        select: { id: true, kind: true, ts: true, userId: true, studentId: true },
      })
    : await prisma.lessonJoinEvent.findMany({
        where: { lessonId: lesson.id, ts: { gte: since } },
        orderBy: { ts: "desc" },
        take: 50,
        select: { id: true, kind: true, ts: true, userId: true, studentId: true },
      });

  const meeting = resolveMeetingLink(lesson);
  const subtitle = [
    new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(lesson.scheduledAt),
    `${lesson.duration} dk`,
    lesson.classroom?.name ?? lesson.student.fullName,
  ].filter(Boolean).join(" • ");

  // ── Phase 2 / Session 9 — Lesson material attachments ───────────────
  const attachedLessonMaterials = await getMaterialsForLesson(lesson.id);
  const pickableLessonMaterials = await getAttachableMaterialsForTeacher(teacher.id, {
    take: 60,
    excludeMaterialIds: attachedLessonMaterials.map((m) => m.id),
  });

  return (
    <>
      <PageHeader
        title={`Canlı ders: ${lesson.course?.title ?? lesson.title ?? lesson.subject ?? "Ders"}`}
        subtitle={subtitle}
      />

      <Card>
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <Badge tone={lessonStatusTone(lesson.status)}>{lessonStatusLabel(lesson.status)}</Badge>
            {lesson.startedAt && (
              <span className="od-muted" style={{ marginLeft: 8, fontSize: 12 }}>
                Başlangıç: {new Intl.DateTimeFormat("tr-TR", { timeStyle: "short" }).format(lesson.startedAt)}
              </span>
            )}
            {lesson.endedAt && (
              <span className="od-muted" style={{ marginLeft: 8, fontSize: 12 }}>
                Bitiş: {new Intl.DateTimeFormat("tr-TR", { timeStyle: "short" }).format(lesson.endedAt)}
              </span>
            )}
          </div>
          <LessonLifecycleButtons
            lessonId={lesson.id}
            status={lesson.status}
            joinUrl={meeting.joinUrl}
            hostUrl={meeting.hostUrl}
          />
        </div>
      </Card>

      <Card>
        <h3 className="od-h3">Ders bağlantısı</h3>
        {meeting.joinUrl ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a className="od-mono" href={meeting.joinUrl} target="_blank" rel="noreferrer">{meeting.joinUrl}</a>
            <Badge tone="neutral">{meeting.provider}</Badge>
          </div>
        ) : (
          <p className="od-muted">Bağlantı tanımlı değil. Aşağıdan ekleyin.</p>
        )}
        {(lesson.status === "SCHEDULED" || lesson.status === "LIVE") && (
          <form action={setLessonMeetingLinkAction.bind(null, lesson.id)} style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              name="joinUrl"
              type="url"
              placeholder="https://meet.google.com/…"
              defaultValue={meeting.joinUrl ?? ""}
              className="od-input"
              style={{ flex: 1, minWidth: 280 }}
              required
            />
            <button type="submit" className="od-btn">Kaydet</button>
          </form>
        )}
      </Card>

      <Card>
        <h3 className="od-h3">Öğrenciler ({cohort.length})</h3>
        <table className="od-table">
          <thead><tr><th>Öğrenci</th><th>Durum</th><th>Yoklama</th><th>Kaynak</th><th>İlk katılım</th></tr></thead>
          <tbody>
            {cohort.map((c) => {
              const att = c.attendances[0];
              return (
                <tr key={c.id}>
                  <td>{c.student.fullName}</td>
                  <td><Badge tone={lessonStatusTone(c.status)}>{lessonStatusLabel(c.status)}</Badge></td>
                  <td>{att ? <Badge tone={att.status === "PRESENT" ? "ok" : att.status === "LATE" ? "warn" : "bad"}>{att.status}</Badge> : <span className="od-muted">—</span>}</td>
                  <td className="od-mono" style={{ fontSize: 12 }}>{att?.source ?? "—"}</td>
                  <td className="od-mono" style={{ fontSize: 12 }}>
                    {att?.firstJoinedAt
                      ? new Intl.DateTimeFormat("tr-TR", { timeStyle: "short" }).format(att.firstJoinedAt)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <LessonMaterialsSection
        lessonId={lesson.id}
        attached={attachedLessonMaterials}
        edit={{
          pickable: pickableLessonMaterials,
          attachAction: attachLessonMaterialsAction.bind(null, lesson.id),
          detachAction: detachLessonMaterialAction,
        }}
      />

      <Card>
        <h3 className="od-h3">Son katılım olayları (son 1 saat)</h3>
        {joinEvents.length === 0 ? (
          <p className="od-muted">Henüz olay yok.</p>
        ) : (
          <table className="od-table">
            <thead><tr><th>Zaman</th><th>Tip</th><th>Kullanıcı</th></tr></thead>
            <tbody>
              {joinEvents.map((e) => (
                <tr key={e.id}>
                  <td className="od-mono" style={{ fontSize: 12 }}>
                    {new Intl.DateTimeFormat("tr-TR", { timeStyle: "medium" }).format(e.ts)}
                  </td>
                  <td><Badge tone={e.kind === "JOIN" ? "ok" : e.kind === "LEAVE" ? "warn" : "neutral"}>{e.kind}</Badge></td>
                  <td className="od-mono" style={{ fontSize: 11 }}>{e.userId.slice(0, 12)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
