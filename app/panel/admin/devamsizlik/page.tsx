import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { SearchInput } from "@/components/panel/ui/search-input";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Search = Promise<{
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string;
  classroomId?: string;
}>;

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function statusLabel(s: string): { label: string; tone: string } {
  switch (s) {
    case "PRESENT": return { label: "Geldi", tone: "var(--pd-good)" };
    case "ABSENT": return { label: "Gelmedi", tone: "var(--pd-bad)" };
    case "LATE": return { label: "Geç", tone: "var(--pd-warn)" };
    case "EXCUSED": return { label: "Mazeretli", tone: "var(--pd-text-muted)" };
    default: return { label: s, tone: "var(--pd-text-muted)" };
  }
}

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const where: Prisma.AttendanceWhereInput = {};
  if (sp.status && ["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(sp.status)) {
    where.status = sp.status as Prisma.AttendanceWhereInput["status"];
  }
  if (sp.from || sp.to) {
    where.sessionDate = {};
    if (sp.from) (where.sessionDate as { gte?: Date }).gte = new Date(sp.from);
    if (sp.to) (where.sessionDate as { lte?: Date }).lte = new Date(sp.to + "T23:59:59");
  }
  if (sp.classroomId) {
    where.classroomId = sp.classroomId;
  }
  if (sp.q) {
    where.student = {
      OR: [
        { fullName: { contains: sp.q, mode: "insensitive" } },
        { phone: { contains: sp.q, mode: "insensitive" } },
      ],
    };
  }

  // Tarih filtresi yoksa son 30 gün default
  if (!sp.from && !sp.to) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    where.sessionDate = { gte: since };
  }

  const [records, total, classrooms, kpiAgg] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: { sessionDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        student: { select: { id: true, fullName: true } },
        classroom: { select: { id: true, name: true } },
        lesson: { select: { id: true, title: true } },
        recordedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.attendance.count({ where }),
    prisma.classroom.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.attendance.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
  ]);

  const kpi = {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    EXCUSED: 0,
  } as Record<string, number>;
  for (const row of kpiAgg) kpi[row.status] = row._count._all;
  const sum = Object.values(kpi).reduce((a, b) => a + b, 0) || 1;
  const attendanceRate = ((kpi.PRESENT + kpi.LATE) / sum) * 100;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...sp, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, String(v));
    }
    const s = params.toString();
    return `/panel/admin/devamsizlik${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Devamsızlık"
        subtitle={`${total} kayıt${sp.status ? ` · ${statusLabel(sp.status).label}` : ""}`}
        right={<SearchInput placeholder="Öğrenci adı, telefon…" />}
      />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <KpiCard label="Geldi" value={String(kpi.PRESENT)} meta={`%${((kpi.PRESENT/sum)*100).toFixed(1)}`} />
        <KpiCard label="Geç" value={String(kpi.LATE)} meta={`%${((kpi.LATE/sum)*100).toFixed(1)}`} />
        <KpiCard label="Gelmedi" value={String(kpi.ABSENT)} meta={`%${((kpi.ABSENT/sum)*100).toFixed(1)}`} />
        <KpiCard label="Devam oranı" value={`%${attendanceRate.toFixed(1)}`} meta={`${sum} toplam`} />
      </div>

      <Card>
        <div style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", borderBottom: "1px solid var(--pd-border)" }}>
          <span style={{ fontSize: 12, color: "var(--pd-text-muted)" }}>Filtre:</span>
          <Link href={buildHref({ status: undefined })} className={`od-btn od-btn-sm ${!sp.status ? "od-btn-primary" : "od-btn-ghost"}`}>Tümü</Link>
          <Link href={buildHref({ status: "PRESENT" })} className={`od-btn od-btn-sm ${sp.status === "PRESENT" ? "od-btn-primary" : "od-btn-ghost"}`}>Geldi</Link>
          <Link href={buildHref({ status: "LATE" })} className={`od-btn od-btn-sm ${sp.status === "LATE" ? "od-btn-primary" : "od-btn-ghost"}`}>Geç</Link>
          <Link href={buildHref({ status: "ABSENT" })} className={`od-btn od-btn-sm ${sp.status === "ABSENT" ? "od-btn-primary" : "od-btn-ghost"}`}>Gelmedi</Link>
          <Link href={buildHref({ status: "EXCUSED" })} className={`od-btn od-btn-sm ${sp.status === "EXCUSED" ? "od-btn-primary" : "od-btn-ghost"}`}>Mazeretli</Link>

          <span style={{ marginLeft: 12, fontSize: 12, color: "var(--pd-text-muted)" }}>Sınıf:</span>
          <form method="GET" style={{ display: "inline-flex", gap: 6 }}>
            {sp.status && <input type="hidden" name="status" value={sp.status} />}
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            {sp.from && <input type="hidden" name="from" value={sp.from} />}
            {sp.to && <input type="hidden" name="to" value={sp.to} />}
            <select name="classroomId" defaultValue={sp.classroomId || ""} className="od-input od-input-sm">
              <option value="">Tüm sınıflar</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit" className="od-btn od-btn-sm od-btn-ghost">Uygula</button>
          </form>

          <form method="GET" style={{ display: "inline-flex", gap: 6, marginLeft: 12, alignItems: "center" }}>
            {sp.status && <input type="hidden" name="status" value={sp.status} />}
            {sp.classroomId && <input type="hidden" name="classroomId" value={sp.classroomId} />}
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            <span style={{ fontSize: 12, color: "var(--pd-text-muted)" }}>Tarih:</span>
            <input type="date" name="from" defaultValue={sp.from} className="od-input od-input-sm" />
            <span style={{ fontSize: 12 }}>→</span>
            <input type="date" name="to" defaultValue={sp.to} className="od-input od-input-sm" />
            <button type="submit" className="od-btn od-btn-sm od-btn-ghost">Uygula</button>
          </form>
        </div>

        <table className="od-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Öğrenci</th>
              <th>Bağlam</th>
              <th>Sınıf / Ders</th>
              <th>Durum</th>
              <th>Gecikme (dk)</th>
              <th>Kayıt</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--pd-text-muted)" }}>Kayıt bulunamadı.</td></tr>
            )}
            {records.map((r) => {
              const st = statusLabel(r.status);
              return (
                <tr key={r.id}>
                  <td style={{ fontSize: 12 }}>{formatDateTime(r.sessionDate)}</td>
                  <td>
                    <Link href={`/panel/admin/ogrenciler/${r.student.id}`} style={{ color: "var(--pd-primary)" }}>
                      {r.student.fullName}
                    </Link>
                  </td>
                  <td style={{ fontSize: 12 }}>{r.context === "CLASSROOM_SESSION" ? "Sınıf oturumu" : "Birebir ders"}</td>
                  <td style={{ fontSize: 12 }}>
                    {r.classroom?.name || "—"}
                    {r.lesson && <div style={{ color: "var(--pd-text-muted)" }}>{r.lesson.title}</div>}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--pd-bg)", color: st.tone, border: `1px solid ${st.tone}33` }}>
                      {st.label}
                    </span>
                  </td>
                  <td className="od-mono">{r.minutesLate ?? "—"}</td>
                  <td style={{ fontSize: 11, color: "var(--pd-text-muted)" }}>
                    {r.recordedBy?.name || r.recordedBy?.email || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          {Array.from({ length: Math.min(totalPages, 12) }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={buildHref({ page: p === 1 ? undefined : String(p) })} className={`od-btn od-btn-sm ${p === page ? "od-btn-primary" : "od-btn-ghost"}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
