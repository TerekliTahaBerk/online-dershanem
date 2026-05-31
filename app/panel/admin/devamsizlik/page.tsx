import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { SearchInput } from "@/components/panel/ui/search-input";
import { SavedViewsBar } from "@/components/panel/ui/saved-views";
import {
  ATTENDANCE_DISPLAY_ORDER,
  getAttendanceStatusLabel,
  getAttendanceStatusCssVar,
  isWritableAttendanceStatus,
} from "@/lib/attendance";
import type { Prisma, AttendanceStatus } from "@prisma/client";

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

type Tone = "mint" | "yellow" | "blush" | "lavender" | "sky" | "neutral";

const STATUS_TONE: Record<AttendanceStatus, Tone> = {
  PRESENT: "mint",
  LATE: "yellow",
  ABSENT: "blush",
  EXCUSED: "sky",
  LEFT_EARLY: "lavender",
};

const STATUS_DESCRIPTION: Record<AttendanceStatus, string> = {
  PRESENT: "Derse zamanında katılan öğrenciler.",
  LATE: "Derse geç kalanlar — soft uyarı.",
  ABSENT: "Derse hiç katılmayan öğrenciler.",
  EXCUSED: "Mazereti onaylananlar.",
  LEFT_EARLY: "Dersi erken terk edenler.",
};

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function pct(n: number, total: number): number {
  if (!total) return 0;
  return (n / total) * 100;
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
  if (sp.status && isWritableAttendanceStatus(sp.status)) {
    where.status = sp.status;
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

  const kpi: Record<AttendanceStatus, number> = {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    EXCUSED: 0,
    LEFT_EARLY: 0,
  };
  for (const row of kpiAgg) kpi[row.status] = row._count._all;
  const sumAll = Object.values(kpi).reduce((a, b) => a + b, 0);
  const sum = sumAll || 1;
  // PRESENT, LATE, LEFT_EARLY all count as "showed up" for the rate calc.
  const attendanceRate = ((kpi.PRESENT + kpi.LATE + kpi.LEFT_EARLY) / sum) * 100;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const weekAgoIso = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...sp, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, String(v));
    }
    const s = params.toString();
    return `/panel/admin/devamsizlik${s ? `?${s}` : ""}`;
  };

  const filtersActive = Boolean(sp.status || sp.q || sp.from || sp.to || sp.classroomId);

  // Pastel KPI tiles
  const kpiTiles: Array<{ label: string; value: number; tone: Tone; pct: number; meta?: string }> = [
    { label: "Geldi",      value: kpi.PRESENT,    tone: "mint",     pct: pct(kpi.PRESENT, sum) },
    { label: "Geç",        value: kpi.LATE,       tone: "yellow",   pct: pct(kpi.LATE, sum) },
    { label: "Gelmedi",    value: kpi.ABSENT,     tone: "blush",    pct: pct(kpi.ABSENT, sum) },
    { label: "Erken ayrıldı", value: kpi.LEFT_EARLY, tone: "lavender", pct: pct(kpi.LEFT_EARLY, sum) },
    { label: "Mazeretli",  value: kpi.EXCUSED,    tone: "sky",      pct: pct(kpi.EXCUSED, sum) },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Devamsızlık" },
        ]}
        title="Devamsızlık"
        subtitle="Yoklama, geç kalma ve mazeret kayıtlarını takip edin."
        right={<SearchInput placeholder="Öğrenci adı, telefon…" />}
      />

      {/* Pastel KPI tiles ------------------------------------------------ */}
      <div className="od-attendance-kpi-grid">
        {kpiTiles.map((t) => (
          <div key={t.label} className={`od-attendance-kpi tone-${t.tone}`}>
            <div className="k-eyebrow">{t.label}</div>
            <div className="k-value">{t.value}</div>
            <div className="k-meta">%{t.pct.toFixed(1)} · {sumAll} kayıt</div>
            <div className="k-bar" aria-hidden>
              <span style={{ width: `${Math.min(100, t.pct)}%` }} />
            </div>
          </div>
        ))}
        <div className="od-attendance-kpi tone-neutral">
          <div className="k-eyebrow">Devam oranı</div>
          <div className="k-value">%{attendanceRate.toFixed(1)}</div>
          <div className="k-meta">{sumAll} toplam · son 30 gün</div>
          <div className="k-bar" aria-hidden>
            <span style={{ width: `${Math.min(100, attendanceRate)}%`, background: "#14140F" }} />
          </div>
        </div>
      </div>

      {/* Saved views ----------------------------------------------------- */}
      <div style={{ marginBottom: 12 }}>
        <SavedViewsBar
          scope="attendance"
          presets={[
            { name: "Tümü", filter: {} },
            { name: "Bu hafta devamsız", filter: { status: "ABSENT", from: weekAgoIso } },
            { name: "Geç kalanlar", filter: { status: "LATE" } },
            { name: "Erken ayrılanlar", filter: { status: "LEFT_EARLY" } },
            { name: "Mazeret bekleyenler", filter: { status: "EXCUSED" } },
          ]}
        />
      </div>

      {/* Status board (grouped quick view) ------------------------------- */}
      {sumAll > 0 && !sp.status ? (
        <div className="od-attendance-board">
          {ATTENDANCE_DISPLAY_ORDER.map((st) => {
            const tone = STATUS_TONE[st];
            const count = kpi[st];
            return (
              <Link
                key={st}
                href={buildHref({ status: st })}
                className="od-attendance-board-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="b-head">
                  <span className={`od-attendance-status tone-${tone}`}>{getAttendanceStatusLabel(st)}</span>
                  <span className="b-count">{count}</span>
                </div>
                <div className="b-meta">{STATUS_DESCRIPTION[st]}</div>
                <div className="k-bar" aria-hidden style={{ height: 4, borderRadius: 999, background: "rgba(20,20,15,.04)", overflow: "hidden", position: "relative" }}>
                  <span style={{ position: "absolute", inset: "0 auto 0 0", width: `${pct(count, sum)}%`, background: `var(${getAttendanceStatusCssVar(st)})`, opacity: .55, borderRadius: 999 }} />
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {/* Toolbar — status pills + classroom + date range ----------------- */}
      <div className="od-attendance-toolbar">
        <span className="od-attendance-toolbar-label">Durum</span>
        <Link
          href={buildHref({ status: undefined })}
          className={`od-attendance-chip ${!sp.status ? "is-active" : ""}`}
        >
          Tümü
        </Link>
        {ATTENDANCE_DISPLAY_ORDER.map((st) => (
          <Link
            key={st}
            href={buildHref({ status: st })}
            className={`od-attendance-chip ${sp.status === st ? "is-active" : ""}`}
          >
            {getAttendanceStatusLabel(st)}
          </Link>
        ))}

        <span className="od-attendance-toolbar-spacer" />

        <form method="GET">
          <span className="od-attendance-toolbar-label">Sınıf</span>
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
          <button type="submit" className="od-btn sm">Uygula</button>
        </form>

        <form method="GET">
          <span className="od-attendance-toolbar-label">Tarih</span>
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          {sp.classroomId && <input type="hidden" name="classroomId" value={sp.classroomId} />}
          {sp.q && <input type="hidden" name="q" value={sp.q} />}
          <input type="date" name="from" defaultValue={sp.from} className="od-input od-input-sm" />
          <span style={{ fontSize: 11, color: "#9B9B95" }}>→</span>
          <input type="date" name="to" defaultValue={sp.to} className="od-input od-input-sm" />
          <button type="submit" className="od-btn sm">Uygula</button>
          {filtersActive ? (
            <Link href="/panel/admin/devamsizlik" className="od-btn ghost sm">Temizle</Link>
          ) : null}
        </form>
      </div>

      {/* Attendance table ------------------------------------------------ */}
      <Card>
        <table className="od-table premium-table">
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
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#9B9B95" }}>
                  {filtersActive
                    ? "Seçili filtreler için yoklama kaydı yok."
                    : "Kayıt bulunamadı."}
                </td>
              </tr>
            )}
            {records.map((r) => {
              const tone = STATUS_TONE[r.status as AttendanceStatus] ?? "neutral";
              return (
                <tr key={r.id}>
                  <td style={{ fontSize: 12 }}>{formatDateTime(r.sessionDate)}</td>
                  <td>
                    <Link href={`/panel/admin/ogrenciler/${r.student.id}`} style={{ color: "var(--pd-primary)", fontWeight: 500 }}>
                      {r.student.fullName}
                    </Link>
                  </td>
                  <td style={{ fontSize: 12, color: "#6F6F6A" }}>
                    {r.context === "CLASSROOM_SESSION" ? "Sınıf oturumu" : "Birebir ders"}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {r.classroom?.name || "—"}
                    {r.lesson && <div style={{ color: "#9B9B95", fontSize: 11 }}>{r.lesson.title}</div>}
                  </td>
                  <td>
                    <span className={`od-attendance-status tone-${tone}`}>
                      {getAttendanceStatusLabel(r.status)}
                    </span>
                  </td>
                  <td className="od-mono" style={{ fontSize: 12 }}>{r.minutesLate ?? "—"}</td>
                  <td style={{ fontSize: 11, color: "#9B9B95" }}>
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
            <Link
              key={p}
              href={buildHref({ page: p === 1 ? undefined : String(p) })}
              className={`od-btn sm ${p === page ? "dark" : "ghost"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
