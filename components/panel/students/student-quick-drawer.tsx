"use client";

/**
 * StudentQuickDrawer — right-side quick view for a student row.
 *
 * Mounted once on any students list page. Listens to `?drawer=student&id=...`
 * and self-fetches `/api/panel/students/:id/quick` on open.
 *
 * The drawer offers tabs: Overview / Education / Attendance / Homework.
 * "Profili aç →" footer takes the user to the full Student 360 page.
 *
 * Permission and data scoping are enforced by the backend; the UI does not
 * need to re-check.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DetailDrawer,
  DrawerSection,
  DrawerKv,
  DrawerLoading,
  DrawerError,
  useDrawer,
  type DrawerTab,
} from "@/components/panel/ui/detail-drawer";
import { Badge } from "@/components/panel/ui/badge";
import { PanelIcon } from "@/components/panel/ui/icon";

type Quick = {
  student: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    city: string | null;
    district: string | null;
    schoolName: string | null;
    classLevel: string | null;
    examType: string | null;
    status: string;
    targetGoal: string | null;
    targetSchool: string | null;
    currentNet: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    userId: string | null;
  };
  classrooms: Array<{ id: string; name: string; branch: string | null }>;
  parents: Array<{
    id: string; fullName: string; phone: string | null; email: string | null;
    relationship: string | null; isPrimary: boolean;
  }>;
  tags: Array<{ id: string; key: string; label: string; color: string }>;
  attendance: { last30d: Record<string, number>; rate: number | null };
  homework: Record<string, number>;
  upcomingLessons: Array<{
    id: string; scheduledAt: string; duration: number; status: string;
    title: string | null; subject: string | null;
    teacher: { fullName: string } | null;
    course: { title: string } | null;
    classroom: { name: string } | null;
  }>;
  lastLessons: Array<{
    id: string; scheduledAt: string; status: string;
    title: string | null; subject: string | null;
    teacher: { fullName: string } | null;
  }>;
};

const TABS: DrawerTab[] = [
  { id: "overview",   label: "Genel" },
  { id: "education",  label: "Eğitim" },
  { id: "attendance", label: "Devam" },
  { id: "homework",   label: "Ödev" },
];

const STATUS_TONE: Record<string, "ok" | "bad" | "neutral" | "teal"> = {
  ACTIVE: "ok", AT_RISK: "bad", NEW: "teal", FOLLOW_UP: "teal", COMPLETED: "neutral", INACTIVE: "neutral",
};

const fmtDate = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
const fmtDT = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function StudentQuickDrawer() {
  const { open, id, tab, close, setTab } = useDrawer("student");
  const [data, setData] = useState<Quick | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeTab = tab ?? "overview";

  useEffect(() => {
    if (!open || !id) { setData(null); setError(null); return; }
    const ac = new AbortController();
    setLoading(true); setError(null); setData(null);
    fetch(`/api/panel/students/${id}/quick`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 403) throw new Error("Bu öğrenciye erişiminiz yok.");
          if (res.status === 404) throw new Error("Öğrenci bulunamadı.");
          throw new Error("Yüklenemedi.");
        }
        return res.json() as Promise<Quick>;
      })
      .then(setData)
      .catch((e: Error) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [open, id]);

  return (
    <DetailDrawer
      open={open}
      onClose={close}
      kind="Öğrenci"
      title={data?.student.fullName ?? (loading ? "Yükleniyor…" : "—")}
      subtitle={data ? (
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {data.student.classLevel ? <span>{data.student.classLevel}</span> : null}
          {data.student.examType ? <span>· {data.student.examType}</span> : null}
          <Badge tone={STATUS_TONE[data.student.status] ?? "neutral"}>{data.student.status}</Badge>
        </span>
      ) : null}
      tabs={data ? TABS : undefined}
      activeTab={activeTab}
      onTabChange={setTab}
      headerActions={
        data ? (
          <Link
            href={`/panel/admin/ogrenciler/${data.student.id}`}
            className="od-btn od-btn-ghost od-btn-sm"
            title="Tam profil"
          >
            <PanelIcon name="arrow" size={12} />
            <span style={{ marginLeft: 4 }}>Profil</span>
          </Link>
        ) : null
      }
      footer={
        data ? (
          <>
            <Link
              href={`/panel/admin/ogrenciler/${data.student.id}`}
              className="od-btn od-btn-primary od-btn-sm"
            >
              Profili aç →
            </Link>
            <Link
              href={`/panel/admin/ders-programi?studentId=${data.student.id}`}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Programı gör
            </Link>
          </>
        ) : null
      }
    >
      {loading ? <DrawerLoading /> : null}
      {error ? <DrawerError message={error} /> : null}

      {data && activeTab === "overview" ? (
        <>
          <DrawerSection title="Kimlik" icon="user">
            <DrawerKv k="Telefon" v={<span className="od-mono">{data.student.phone}</span>} />
            <DrawerKv k="Email" v={data.student.email ?? null} />
            <DrawerKv k="Şehir" v={data.student.city ?? null} />
            <DrawerKv k="Okul" v={data.student.schoolName ?? null} />
          </DrawerSection>

          <DrawerSection title="Sınıflar" icon="classroom">
            {data.classrooms.length === 0 ? (
              <span className="od-muted">Atanmış sınıf yok.</span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {data.classrooms.map((c) => (
                  <Badge key={c.id} tone="teal">{c.name}{c.branch ? ` · ${c.branch}` : ""}</Badge>
                ))}
              </div>
            )}
          </DrawerSection>

          <DrawerSection title="Veliler" icon="parent" right={
            <Link
              href={`/panel/admin/ogrenciler/${data.student.id}/duzenle#parents`}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Yönet
            </Link>
          }>
            {data.parents.length === 0 ? (
              <div className="od-muted">Bağlı veli yok.</div>
            ) : (
              data.parents.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {p.fullName}
                      {p.isPrimary ? <span style={{ marginLeft: 6 }}><Badge tone="teal">Birincil</Badge></span> : null}
                    </div>
                    <div className="od-muted" style={{ fontSize: 11 }}>
                      {[p.relationship, p.phone, p.email].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <Link
                    href={`?drawer=parent&id=${p.id}`}
                    className="od-btn od-btn-ghost od-btn-sm"
                  >
                    Aç
                  </Link>
                </div>
              ))
            )}
          </DrawerSection>

          {data.tags.length > 0 ? (
            <DrawerSection title="Etiketler" icon="tag">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {data.tags.map((t) => <Badge key={t.id} tone="neutral">{t.label}</Badge>)}
              </div>
            </DrawerSection>
          ) : null}

          {data.student.notes ? (
            <DrawerSection title="Notlar" icon="report">
              <div style={{ whiteSpace: "pre-wrap", fontSize: 12.5 }}>{data.student.notes}</div>
            </DrawerSection>
          ) : null}
        </>
      ) : null}

      {data && activeTab === "education" ? (
        <>
          <DrawerSection title="Hedef" icon="target">
            <DrawerKv k="Hedef bölüm" v={data.student.targetGoal ?? null} />
            <DrawerKv k="Hedef okul" v={data.student.targetSchool ?? null} />
            <DrawerKv k="Mevcut net" v={data.student.currentNet ?? null} />
          </DrawerSection>

          <DrawerSection title="Yaklaşan dersler" icon="cal">
            {data.upcomingLessons.length === 0 ? (
              <div className="od-muted">Yaklaşan ders yok.</div>
            ) : (
              data.upcomingLessons.map((l) => (
                <div key={l.id} style={{ padding: "6px 0", borderTop: "1px solid var(--pd-line)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {l.course?.title ?? l.title ?? l.subject ?? "Ders"}
                  </div>
                  <div className="od-muted" style={{ fontSize: 11 }}>
                    {fmtDT.format(new Date(l.scheduledAt))} · {l.duration}dk · {l.teacher?.fullName ?? "—"}
                    {l.classroom?.name ? ` · ${l.classroom.name}` : ""}
                  </div>
                </div>
              ))
            )}
          </DrawerSection>

          <DrawerSection title="Son dersler" icon="clock">
            {data.lastLessons.length === 0 ? (
              <div className="od-muted">Henüz ders yok.</div>
            ) : (
              data.lastLessons.map((l) => (
                <div key={l.id} style={{ padding: "6px 0", borderTop: "1px solid var(--pd-line)", display: "flex", justifyContent: "space-between" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{l.title ?? l.subject ?? "Ders"}</div>
                    <div className="od-muted" style={{ fontSize: 11 }}>
                      {fmtDate.format(new Date(l.scheduledAt))} · {l.teacher?.fullName ?? "—"}
                    </div>
                  </div>
                  <Badge tone={l.status === "COMPLETED" ? "ok" : l.status === "CANCELLED" ? "bad" : "neutral"}>
                    {l.status}
                  </Badge>
                </div>
              ))
            )}
          </DrawerSection>
        </>
      ) : null}

      {data && activeTab === "attendance" ? (
        <DrawerSection title="Son 30 gün" icon="check">
          <DrawerKv k="Geldi"     v={<span className="od-mono">{data.attendance.last30d.PRESENT ?? 0}</span>} />
          <DrawerKv k="Geç"       v={<span className="od-mono">{data.attendance.last30d.LATE ?? 0}</span>} />
          <DrawerKv k="Gelmedi"   v={<span className="od-mono">{data.attendance.last30d.ABSENT ?? 0}</span>} />
          <DrawerKv k="Mazeretli" v={<span className="od-mono">{data.attendance.last30d.EXCUSED ?? 0}</span>} />
          <DrawerKv k="Devam oranı" v={data.attendance.rate == null ? null : <strong>%{data.attendance.rate}</strong>} />
        </DrawerSection>
      ) : null}

      {data && activeTab === "homework" ? (
        <DrawerSection title="Gönderim özeti" icon="assignment">
          <DrawerKv k="Bekliyor"     v={<span className="od-mono">{data.homework.PENDING ?? 0}</span>} />
          <DrawerKv k="Teslim edildi" v={<span className="od-mono">{data.homework.SUBMITTED ?? 0}</span>} />
          <DrawerKv k="Notlandı"      v={<span className="od-mono">{data.homework.GRADED ?? 0}</span>} />
          <DrawerKv k="Geç teslim"    v={<span className="od-mono">{data.homework.LATE ?? 0}</span>} />
          <DrawerKv k="Eksik"         v={<span className="od-mono">{data.homework.MISSED ?? 0}</span>} />
        </DrawerSection>
      ) : null}
    </DetailDrawer>
  );
}
