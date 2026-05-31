/**
 * Student 360 — server-side tab nav + per-tab presentation components.
 *
 * The page (server component) fetches all data conditionally (per-tab) and
 * passes it into the tab body. This file is pure presentation: no data
 * fetching, no server actions. Keeping it server-renderable means we don't
 * pay for hydration on tab body content.
 *
 * Tab nav uses simple anchor links with `?tab=…` (consistent with the rest
 * of the panel). No client JS needed.
 *
 * Eight tabs:
 *   overview · education · attendance · homework · odk · finance · notes · logs
 */

import Link from "next/link";
import { Badge } from "@/components/panel/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { KpiCard } from "@/components/panel/ui/kpi-card";

export const STUDENT_TAB_KEYS = [
  "overview",
  "education",
  "attendance",
  "homework",
  "odk",
  "finance",
  "notes",
  "logs",
] as const;

export type StudentTab = (typeof STUDENT_TAB_KEYS)[number];

const TAB_LABELS: Record<StudentTab, string> = {
  overview:   "Özet",
  education:  "Eğitim",
  attendance: "Devamsızlık",
  homework:   "Ödevler",
  odk:        "ODK",
  finance:    "Finans",
  notes:      "Notlar",
  logs:       "Loglar",
};

export function parseStudentTab(raw: string | undefined): StudentTab {
  if (raw && (STUDENT_TAB_KEYS as readonly string[]).includes(raw)) {
    return raw as StudentTab;
  }
  return "overview";
}

// ──────────────────────────────────────────────────────────────────────────
// Tab nav
// ──────────────────────────────────────────────────────────────────────────

export function Student360TabBar({
  current,
  baseHref,
  badges,
}: {
  current: StudentTab;
  /** Pathname to the student detail page; tab links append "?tab=…" */
  baseHref: string;
  /** Optional small numeric badges per tab. */
  badges?: Partial<Record<StudentTab, number | string>>;
}) {
  return (
    <nav className="od-360-tabbar" aria-label="Öğrenci sekmeleri">
      {STUDENT_TAB_KEYS.map((t) => {
        const active = t === current;
        const badge = badges?.[t];
        return (
          <Link
            key={t}
            href={`${baseHref}?tab=${t}`}
            className={`od-360-tab${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {TAB_LABELS[t]}
            {badge !== undefined && badge !== 0 && badge !== "" ? (
              <span className="od-360-tab-badge">{badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Small shared primitives
// ──────────────────────────────────────────────────────────────────────────

const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(d) : "—";
const fmtDateTime = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d) : "—";
const fmtTRY = (cents: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(cents / 100);

export function EmptyTabState({ title, description }: { title: string; description?: string }) {
  return <EmptyState title={title} description={description} />;
}

// ──────────────────────────────────────────────────────────────────────────
// Tab body components — each takes its own pre-fetched data slice.
// All are server-renderable (no useState, no event handlers).
// ──────────────────────────────────────────────────────────────────────────

export type OverviewProps = {
  identity: {
    fullName: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    district: string | null;
    schoolName: string | null;
    classLevel: string | null;
    examType: string | null;
    department: string | null;
    targetGoal: string | null;
    targetSchool: string | null;
    status: string;
    createdAt: Date;
  };
  classrooms: Array<{ classroomId: string; classroom: { id: string; name: string; level: string } }>;
  parents: Array<{ parentId: string; relationship: string | null; isPrimary: boolean; parent: { id: string; fullName: string; phone: string | null } }>;
  recentExams: Array<{ id: string; title: string; net: number | null; takenAt: Date }>;
  enrollments: Array<{ id: string; package: { id: string; name: string; price: number } }>;
  riskBadge?: React.ReactNode;
};

export function StudentOverviewTab({
  identity,
  classrooms,
  parents,
  recentExams,
  enrollments,
}: OverviewProps) {
  return (
    <div className="od-grid g-2" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card>
        <CardHeader title="Kimlik" />
        <CardBody>
          <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, fontSize: 13, margin: 0 }}>
            <dt className="od-muted">Telefon</dt><dd className="od-mono">{identity.phone ?? "—"}</dd>
            <dt className="od-muted">E-posta</dt><dd>{identity.email ?? "—"}</dd>
            <dt className="od-muted">Şehir/İlçe</dt><dd>{[identity.city, identity.district].filter(Boolean).join(" / ") || "—"}</dd>
            <dt className="od-muted">Okul</dt><dd>{identity.schoolName ?? "—"}</dd>
            <dt className="od-muted">Sınıf düzeyi</dt><dd>{identity.classLevel ?? "—"}</dd>
            <dt className="od-muted">Sınav türü</dt><dd>{identity.examType ?? "—"}</dd>
            <dt className="od-muted">Bölüm</dt><dd>{identity.department ?? "—"}</dd>
            <dt className="od-muted">Hedef</dt><dd>{identity.targetGoal ?? "—"}</dd>
            <dt className="od-muted">Hedef okul</dt><dd>{identity.targetSchool ?? "—"}</dd>
            <dt className="od-muted">Durum</dt>
            <dd>
              <Badge tone={identity.status === "ACTIVE" ? "ok" : identity.status === "AT_RISK" ? "bad" : identity.status === "NEW" ? "teal" : "neutral"}>
                {identity.status}
              </Badge>
            </dd>
            <dt className="od-muted">Kayıt tarihi</dt><dd className="od-mono od-muted">{fmtDate(identity.createdAt)}</dd>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Hızlı özet" subtitle="Sınıf · veli · paket · denemeler" />
        <CardBody>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <strong style={{ fontSize: 12, color: "var(--pd-muted)" }}>Sınıflar</strong>
              <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {classrooms.length === 0 ? (
                  <span className="od-muted">Atanmış sınıf yok</span>
                ) : (
                  classrooms.map((c) => (
                    <Badge key={c.classroomId} tone="teal">{c.classroom.name}</Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: 12, color: "var(--pd-muted)" }}>Veliler</strong>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                {parents.length === 0 ? (
                  <span className="od-muted">Veli bağı yok</span>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {parents.map((p) => (
                      <li key={p.parentId}>
                        <Link href={`?drawer=parent&id=${p.parent.id}`} className="od-link">
                          {p.parent.fullName}
                        </Link>
                        {p.relationship ? <span className="od-muted"> · {p.relationship}</span> : null}
                        {p.isPrimary ? <Badge tone="ok">Birincil</Badge> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: 12, color: "var(--pd-muted)" }}>Aktif paketler</strong>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                {enrollments.length === 0 ? (
                  <span className="od-muted">Paket kaydı yok</span>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {enrollments.slice(0, 3).map((e) => (
                      <li key={e.id}>{e.package.name} · {fmtTRY(e.package.price)}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: 12, color: "var(--pd-muted)" }}>Son denemeler</strong>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                {recentExams.length === 0 ? (
                  <span className="od-muted">Deneme sonucu yok</span>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {recentExams.map((r) => (
                      <li key={r.id}>{r.title} · Net {r.net?.toString() ?? "—"} · {fmtDate(r.takenAt)}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Education tab — classrooms + lessons (recent + upcoming)
// ──────────────────────────────────────────────────────────────────────────

export type EducationProps = {
  classrooms: Array<{
    classroomId: string;
    joinedAt: Date;
    classroom: { id: string; name: string; level: string; branch: string | null };
  }>;
  upcomingLessons: Array<{
    id: string;
    scheduledAt: Date;
    duration: number;
    title: string | null;
    subject: string | null;
    status: string;
    teacher: { fullName: string };
    course: { title: string } | null;
  }>;
  recentLessons: Array<{
    id: string;
    scheduledAt: Date;
    duration: number;
    title: string | null;
    subject: string | null;
    status: string;
    teacher: { fullName: string };
    course: { title: string } | null;
  }>;
};

export function StudentEducationTab({ classrooms, upcomingLessons, recentLessons }: EducationProps) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <CardHeader title="Sınıf bağları" subtitle={`${classrooms.length} sınıf`} />
        <CardBody>
          {classrooms.length === 0 ? (
            <EmptyTabState title="Öğrenci hiçbir sınıfa atanmamış" />
          ) : (
            <table className="od-table">
              <thead><tr><th>Sınıf</th><th>Düzey</th><th>Şube</th><th>Eklendi</th></tr></thead>
              <tbody>
                {classrooms.map((c) => (
                  <tr key={c.classroomId}>
                    <td>
                      <Link href={`/panel/admin/siniflar/${c.classroom.id}`} className="od-link">
                        <strong>{c.classroom.name}</strong>
                      </Link>
                    </td>
                    <td><Badge tone="teal">{c.classroom.level}</Badge></td>
                    <td className="od-muted">{c.classroom.branch ?? "—"}</td>
                    <td className="od-mono od-muted">{fmtDate(c.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Yaklaşan dersler" subtitle={`${upcomingLessons.length} ders`} />
        <CardBody>
          {upcomingLessons.length === 0 ? (
            <EmptyTabState title="Planlanmış ders yok" />
          ) : (
            <LessonTable rows={upcomingLessons} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Geçmiş dersler" subtitle={`Son ${recentLessons.length}`} />
        <CardBody>
          {recentLessons.length === 0 ? (
            <EmptyTabState title="Geçmiş ders kaydı yok" />
          ) : (
            <LessonTable rows={recentLessons} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function LessonTable({ rows }: { rows: EducationProps["recentLessons"] }) {
  return (
    <table className="od-table">
      <thead>
        <tr><th>Zaman</th><th>Konu</th><th>Öğretmen</th><th>Süre</th><th>Durum</th></tr>
      </thead>
      <tbody>
        {rows.map((l) => (
          <tr key={l.id}>
            <td className="od-mono od-muted">{fmtDateTime(l.scheduledAt)}</td>
            <td>
              <Link href={`/panel/admin/ders-programi/${l.id}`} className="od-link">
                {l.title ?? l.course?.title ?? l.subject ?? "—"}
              </Link>
            </td>
            <td>{l.teacher.fullName}</td>
            <td className="od-mono">{l.duration}dk</td>
            <td>
              <Badge tone={l.status === "COMPLETED" ? "ok" : l.status === "CANCELLED" ? "bad" : l.status === "SCHEDULED" ? "teal" : "neutral"}>
                {l.status}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Attendance tab
// ──────────────────────────────────────────────────────────────────────────

export type AttendanceProps = {
  studentId: string;
  rows: Array<{
    id: string;
    sessionDate: Date;
    status: string;
    minutesLate: number | null;
    context: string;
    notes: string | null;
  }>;
  stats: { total: number; present: number; absent: number; late: number; pct: number } | null;
};

export function StudentAttendanceTab({ studentId, rows, stats }: AttendanceProps) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {stats ? (
        <div className="od-grid g-4">
          <KpiCard label="Toplam oturum" value={stats.total} />
          <KpiCard label="Devam" value={`${stats.present} (%${stats.pct})`} />
          <KpiCard label="Devamsız" value={stats.absent} />
          <KpiCard label="Geç" value={stats.late} />
        </div>
      ) : null}
      <Card>
        <CardHeader
          title="Yoklama kayıtları"
          subtitle={`${rows.length} oturum · son 50`}
          right={
            <Link
              href={`/panel/admin/devamsizlik?q=${encodeURIComponent(studentId)}`}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Tümünü gör →
            </Link>
          }
        />
        <CardBody>
          {rows.length === 0 ? (
            <EmptyTabState title="Yoklama kaydı yok" />
          ) : (
            <table className="od-table">
              <thead><tr><th>Tarih</th><th>Durum</th><th>Gecikme</th><th>Bağlam</th><th>Not</th></tr></thead>
              <tbody>
                {rows.map((a) => {
                  const tone = a.status === "PRESENT" ? "ok"
                    : a.status === "ABSENT" ? "bad"
                    : a.status === "LATE" ? "warn"
                    : a.status === "LEFT_EARLY" ? "warn"
                    : "neutral";
                  const label = a.status === "PRESENT" ? "Geldi"
                    : a.status === "ABSENT" ? "Gelmedi"
                    : a.status === "LATE" ? "Geç"
                    : a.status === "LEFT_EARLY" ? "Erken ayrıldı"
                    : a.status === "EXCUSED" ? "Mazeretli"
                    : a.status;
                  return (
                    <tr key={a.id}>
                      <td className="od-mono od-muted">{fmtDateTime(a.sessionDate)}</td>
                      <td>
                        <Badge tone={tone}>{label}</Badge>
                      </td>
                      <td className="od-mono">{a.minutesLate ? `${a.minutesLate}dk` : "—"}</td>
                      <td className="od-muted" style={{ fontSize: 12 }}>{a.context}</td>
                      <td className="od-muted" style={{ fontSize: 12 }}>{a.notes ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Homework tab
// ──────────────────────────────────────────────────────────────────────────

export type HomeworkProps = {
  submissions: Array<{
    id: string;
    status: string;
    submittedAt: Date | null;
    score: number | null;
    assignment: { id: string; title: string; dueAt: Date | null };
  }>;
  /** Counts per submission status across the whole student history. */
  counts: { PENDING: number; SUBMITTED: number; GRADED: number; LATE: number; MISSED: number };
};

export function StudentHomeworkTab({ submissions, counts }: HomeworkProps) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="od-grid g-4">
        <KpiCard label="Bekleyen" value={counts.PENDING} />
        <KpiCard label="Gönderildi" value={counts.SUBMITTED} />
        <KpiCard label="Değerlendirildi" value={counts.GRADED} />
        <KpiCard label="Geç / Eksik" value={`${counts.LATE} / ${counts.MISSED}`} />
      </div>
      <Card>
        <CardHeader title="Ödev gönderimleri" subtitle={`${submissions.length} kayıt`} />
        <CardBody>
          {submissions.length === 0 ? (
            <EmptyTabState title="Ödev gönderimi yok" />
          ) : (
            <table className="od-table">
              <thead><tr><th>Ödev</th><th>Son tarih</th><th>Gönderim</th><th>Durum</th><th>Puan</th></tr></thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/panel/admin/odevler/${s.assignment.id}/duzenle`} className="od-link">
                        {s.assignment.title}
                      </Link>
                    </td>
                    <td className="od-mono od-muted">{fmtDate(s.assignment.dueAt)}</td>
                    <td className="od-mono od-muted">{fmtDateTime(s.submittedAt)}</td>
                    <td>
                      <Badge tone={s.status === "GRADED" ? "ok" : s.status === "MISSED" ? "bad" : s.status === "LATE" ? "warn" : "neutral"}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="od-mono">{s.score !== null ? <Badge tone="ok">{s.score}</Badge> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// ODK tab
// ──────────────────────────────────────────────────────────────────────────

export type OdkProps = {
  /** Linked User row id; if null, the student has no User and can't have ODK data. */
  userId: string | null;
  attempts: Array<{
    id: string;
    status: string;
    score: unknown; // Decimal | null
    correctCount: number;
    wrongCount: number;
    blankCount: number;
    submittedAt: Date | null;
    startedAt: Date;
    autoSubmitted: boolean;
    exam: { id: string; title: string };
  }>;
  accessTags: Array<{ id: string; tag: { id: string; key: string; label: string } }>;
};

export function StudentOdkTab({ userId, attempts, accessTags }: OdkProps) {
  if (!userId) {
    return (
      <Card>
        <CardBody>
          <EmptyTabState
            title="Bu öğrenci için ODK verisi yok"
            description="Öğrencinin sisteme bağlı bir kullanıcı hesabı yok; ODK denemeleri kullanıcı bazlı kayıtlanır."
          />
        </CardBody>
      </Card>
    );
  }
  if (attempts.length === 0 && accessTags.length === 0) {
    return (
      <Card>
        <CardBody>
          <EmptyTabState
            title="Bu öğrenci için ODK verisi yok"
            description="Henüz deneme girişimi veya erişim etiketi tanımlanmamış."
          />
        </CardBody>
      </Card>
    );
  }

  // Average net (correct - wrong/4) over completed attempts only.
  const completed = attempts.filter((a) => a.status === "SUBMITTED");
  const avgNet =
    completed.length > 0
      ? completed.reduce((acc, a) => acc + (a.correctCount - a.wrongCount / 4), 0) / completed.length
      : null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="od-grid g-4">
        <KpiCard label="Toplam deneme" value={attempts.length} />
        <KpiCard label="Tamamlanan" value={completed.length} />
        <KpiCard label="Ortalama net" value={avgNet !== null ? avgNet.toFixed(2) : "—"} />
        <KpiCard label="Erişim etiketi" value={accessTags.length} />
      </div>

      {accessTags.length > 0 ? (
        <Card>
          <CardHeader title="Erişim etiketleri" />
          <CardBody>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {accessTags.map((t) => (
                <Badge key={t.id} tone="teal">{t.tag.label}</Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Son denemeler" subtitle={`${attempts.length} deneme · son 10`} />
        <CardBody>
          {attempts.length === 0 ? (
            <EmptyTabState title="Deneme kaydı yok" />
          ) : (
            <table className="od-table">
              <thead><tr><th>Sınav</th><th>Başlangıç</th><th>Gönderim</th><th>Durum</th><th>D</th><th>Y</th><th>B</th></tr></thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.exam.title}</td>
                    <td className="od-mono od-muted">{fmtDateTime(a.startedAt)}</td>
                    <td className="od-mono od-muted">{fmtDateTime(a.submittedAt)}</td>
                    <td><Badge tone={a.status === "SUBMITTED" ? "ok" : a.status === "ABANDONED" ? "bad" : "neutral"}>{a.status}{a.autoSubmitted ? " (auto)" : ""}</Badge></td>
                    <td className="od-mono">{a.correctCount}</td>
                    <td className="od-mono">{a.wrongCount}</td>
                    <td className="od-mono od-muted">{a.blankCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Finance tab
// ──────────────────────────────────────────────────────────────────────────

export type FinanceProps = {
  enrollments: Array<{
    id: string;
    status: string;
    startsAt: Date;
    package: { id: string; name: string; price: number };
  }>;
  entries: Array<{
    id: string;
    occurredAt: Date;
    type: string;
    service: string;
    category: string;
    amount: number;
    description: string | null;
  }>;
};

export function StudentFinanceTab({ enrollments, entries }: FinanceProps) {
  const odEntries = entries.filter((e) => e.service === "OD");
  const totalIncome = odEntries.filter((e) => e.type === "INCOME").reduce((a, e) => a + e.amount, 0);
  const totalExpense = odEntries.filter((e) => e.type === "EXPENSE").reduce((a, e) => a + e.amount, 0);
  const net = totalIncome - totalExpense;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="od-grid g-4">
        <KpiCard label="Aktif paketler" value={enrollments.filter((e) => e.status === "ACTIVE").length} />
        <KpiCard label="Toplam ödeme (OD)" value={fmtTRY(totalIncome)} />
        <KpiCard label="İade/gider" value={fmtTRY(totalExpense)} />
        <KpiCard label="Net" value={fmtTRY(net)} />
      </div>

      <Card>
        <CardHeader title="Paket kayıtları" subtitle={`${enrollments.length} enrollment`} />
        <CardBody>
          {enrollments.length === 0 ? (
            <EmptyTabState title="Aktif OD paket yok" />
          ) : (
            <table className="od-table">
              <thead><tr><th>Paket</th><th>Tutar</th><th>Durum</th><th>Başlangıç</th><th></th></tr></thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id}>
                    <td><Link href={`/panel/admin/paketler/${e.package.id}`} className="od-link">{e.package.name}</Link></td>
                    <td className="od-mono">{fmtTRY(e.package.price)}</td>
                    <td><Badge tone={e.status === "ACTIVE" ? "ok" : "neutral"}>{e.status}</Badge></td>
                    <td className="od-mono od-muted">{fmtDate(e.startsAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/panel/admin/kayitlar/${e.id}`} className="od-btn ghost sm">Detay →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Muhasebe izleri (OD)" subtitle={`${odEntries.length} kayıt`} />
        <CardBody>
          {odEntries.length === 0 ? (
            <EmptyTabState title="Ödeme/muhasebe kaydı yok" />
          ) : (
            <table className="od-table">
              <thead><tr><th>Tarih</th><th>Tip</th><th>Kategori</th><th>Açıklama</th><th>Tutar</th></tr></thead>
              <tbody>
                {odEntries.map((e) => (
                  <tr key={e.id}>
                    <td className="od-mono od-muted">{fmtDate(e.occurredAt)}</td>
                    <td><Badge tone={e.type === "INCOME" ? "ok" : "bad"}>{e.type}</Badge></td>
                    <td>{e.category}</td>
                    <td className="od-muted" style={{ fontSize: 12 }}>{e.description ?? "—"}</td>
                    <td className="od-mono">{fmtTRY(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Notes tab — internal notes + teacher comments + notification history
// ──────────────────────────────────────────────────────────────────────────

export type NotesProps = {
  notes: Array<{
    id: string;
    content: string;
    isPrivate: boolean;
    createdAt: Date;
    author: { name: string | null; email: string } | null;
  }>;
  teacherComments: Array<{
    id: string;
    content: string;
    rating: number | null;
    visibleToParent: boolean;
    createdAt: Date;
    teacher: { fullName: string };
  }>;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    createdAt: Date;
    readAt: Date | null;
  }>;
  hasUserAccount: boolean;
};

export function StudentNotesTab({ notes, teacherComments, notifications, hasUserAccount }: NotesProps) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <CardHeader title="İç notlar" subtitle={`${notes.length} not`} />
        <CardBody>
          {notes.length === 0 ? (
            <EmptyTabState title="İç not yok" description="Admin paneli üzerinden eklenen notlar burada görünür." />
          ) : (
            <ul style={{ display: "grid", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
              {notes.map((n) => (
                <li key={n.id} className="od-timeline-row">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12 }}>
                      {n.author?.name ?? n.author?.email ?? "Sistem"}
                    </strong>
                    <span style={{ fontSize: 11, color: "var(--pd-muted)" }}>
                      {n.isPrivate ? <Badge tone="warn">Özel</Badge> : null}{" "}
                      {fmtDateTime(n.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4, whiteSpace: "pre-wrap" }}>{n.content}</div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Öğretmen yorumları" subtitle={`${teacherComments.length} yorum`} />
        <CardBody>
          {teacherComments.length === 0 ? (
            <EmptyTabState title="Öğretmen yorumu yok" />
          ) : (
            <ul style={{ display: "grid", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
              {teacherComments.map((c) => (
                <li key={c.id} className="od-timeline-row">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                    <strong style={{ fontSize: 12 }}>{c.teacher.fullName}</strong>
                    <span style={{ fontSize: 11, color: "var(--pd-muted)" }}>
                      {c.rating !== null ? <Badge tone="teal">★ {c.rating}</Badge> : null}{" "}
                      {c.visibleToParent ? <Badge tone="ok">Veliye açık</Badge> : <Badge tone="neutral">İç</Badge>}{" "}
                      {fmtDateTime(c.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4, whiteSpace: "pre-wrap" }}>{c.content}</div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Bildirim geçmişi" subtitle={hasUserAccount ? `${notifications.length} bildirim` : "Kullanıcı hesabı yok"} />
        <CardBody>
          {!hasUserAccount ? (
            <EmptyTabState title="Kullanıcı hesabı yok" description="Bildirim göndermek için öğrenciyi bir User'a bağlayın." />
          ) : notifications.length === 0 ? (
            <EmptyTabState title="Bildirim yok" />
          ) : (
            <table className="od-table">
              <thead><tr><th>Tarih</th><th>Tip</th><th>Başlık</th><th>Okundu</th></tr></thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id}>
                    <td className="od-mono od-muted">{fmtDateTime(n.createdAt)}</td>
                    <td><Badge tone="neutral">{n.type}</Badge></td>
                    <td>{n.title}</td>
                    <td className="od-mono od-muted">{n.readAt ? fmtDateTime(n.readAt) : <span className="od-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Logs tab — audit log
// ──────────────────────────────────────────────────────────────────────────

export type LogsProps = {
  logs: Array<{
    id: string;
    createdAt: Date;
    action: string;
    summary: string | null;
    actor: { name: string | null; email: string } | null;
  }>;
};

export function StudentLogsTab({ logs }: LogsProps) {
  return (
    <Card>
      <CardHeader title="Audit log" subtitle={`${logs.length} işlem`} />
      <CardBody>
        {logs.length === 0 ? (
          <EmptyTabState title="İşlem kaydı yok" />
        ) : (
          <table className="od-table">
            <thead><tr><th>Tarih</th><th>Aksiyon</th><th>Özet</th><th>Aktör</th></tr></thead>
            <tbody>
              {logs.map((a) => (
                <tr key={a.id}>
                  <td className="od-mono od-muted">{fmtDateTime(a.createdAt)}</td>
                  <td><Badge tone="neutral">{a.action}</Badge></td>
                  <td style={{ fontSize: 12 }}>{a.summary ?? "—"}</td>
                  <td className="od-muted" style={{ fontSize: 12 }}>{a.actor?.name ?? a.actor?.email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardBody>
    </Card>
  );
}
