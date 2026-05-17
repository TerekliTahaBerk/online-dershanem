import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { getStudentProductFlags } from "@/lib/access/student-product-flags";
import { computeStudentRisk } from "@/lib/analytics/risk";
import { RiskBadge, InsightList } from "@/components/panel/analytics";
import { attendanceInsights, assignmentInsights, sortInsights } from "@/lib/analytics/insights";

export const dynamic = "force-dynamic";

type Tab =
  | "genel" | "sinif" | "dersler" | "program" | "odevler"
  | "devamsizlik" | "paket" | "odemeler" | "bildirimler" | "islem";

const TAB_LABELS: Record<Tab, string> = {
  genel: "Genel Bilgiler",
  sinif: "Sınıf",
  dersler: "Dersler",
  program: "Ders Programı",
  odevler: "Ödevler",
  devamsizlik: "Devamsızlık",
  paket: "OD Paket",
  odemeler: "OD Ödemeler",
  bildirimler: "Bildirimler",
  islem: "İşlem Geçmişi",
};

function parseTab(raw: string | undefined): Tab {
  const valid = Object.keys(TAB_LABELS) as Tab[];
  if (raw && (valid as string[]).includes(raw)) return raw as Tab;
  return "genel";
}

const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(d) : "—";
const fmtDateTime = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d) : "—";
const fmtTRY = (c: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(c / 100);

export default async function StudentDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;
  const { tab: tabRaw } = await searchParams;
  const tab = parseTab(tabRaw);

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, phone: true, email: true,
      city: true, district: true, schoolName: true,
      classLevel: true, department: true, examType: true,
      targetGoal: true, targetSchool: true,
      status: true, activePackage: true,
      createdAt: true, updatedAt: true,
      userId: true,
      user: { select: { id: true, email: true, role: true } },
    },
  });
  if (!student) notFound();

  const flagsMap = await getStudentProductFlags([student.id]);
  const flags = flagsMap.get(student.id);

  // FAZ 8: Sadece "genel" tab'da risk + insight hesapla
  const risk = tab === "genel" ? await computeStudentRisk(student.id) : null;

  const classrooms = (tab === "sinif" || tab === "genel")
    ? await prisma.classroomStudent.findMany({
        where: { studentId: student.id },
        include: { classroom: true },
      })
    : [];

  const lessons = (tab === "dersler" || tab === "program")
    ? await prisma.lesson.findMany({
        where: { studentId: student.id },
        orderBy: { scheduledAt: "desc" },
        take: tab === "program" ? 50 : 20,
        include: { teacher: { select: { fullName: true } }, course: { select: { title: true } } },
      })
    : [];

  const submissions = tab === "odevler"
    ? await prisma.assignmentSubmission.findMany({
        where: { studentId: student.id },
        orderBy: { submittedAt: "desc" },
        take: 30,
        include: { assignment: { select: { id: true, title: true, dueAt: true } } },
      })
    : [];

  const attendances = tab === "devamsizlik"
    ? await prisma.attendance.findMany({
        where: { studentId: student.id },
        orderBy: { sessionDate: "desc" },
        take: 50,
      })
    : [];

  const enrollments = (tab === "paket" || tab === "genel")
    ? await prisma.studentPackageEnrollment.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        include: { package: { select: { id: true, name: true, price: true } } },
      })
    : [];

  const examResults = tab === "genel"
    ? await prisma.studentExamResult.findMany({
        where: { studentId: student.id },
        orderBy: { takenAt: "desc" },
        take: 5,
      })
    : [];

  const accountingEntries = (tab === "odemeler" || tab === "islem")
    ? await prisma.accountingEntry.findMany({
        where: { studentId: student.id },
        orderBy: { occurredAt: "desc" },
        take: 50,
      })
    : [];

  const notifications = (tab === "bildirimler" && student.userId)
    ? await prisma.notification.findMany({
        where: { userId: student.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  const auditLogs = tab === "islem"
    ? await prisma.auditLog.findMany({
        where: { entityType: "Student", entityId: student.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { actor: { select: { name: true, email: true } } },
      })
    : [];

  const tabHref = (t: Tab) => `?tab=${t}`;

  const attendanceStats = (() => {
    if (attendances.length === 0) return null;
    const total = attendances.length;
    const present = attendances.filter((a) => a.status === "PRESENT").length;
    const absent = attendances.filter((a) => a.status === "ABSENT").length;
    const late = attendances.filter((a) => a.status === "LATE").length;
    return { total, present, absent, late, pct: Math.round((present / total) * 100) };
  })();

  return (
    <>
      <PageHeader
        title={student.fullName}
        subtitle={`${student.classLevel ?? "—"} · ${student.examType ?? "—"} · ${student.phone}`}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge tone={flags?.hasOD ? "teal" : "neutral"}>{flags?.hasOD ? "OD ✓" : "OD ✗"}</Badge>
            <Badge tone={flags?.hasODK ? "purple" : "neutral"}>{flags?.hasODK ? "ODK ✓" : "ODK ✗"}</Badge>
            {risk ? <RiskBadge level={risk.level} score={risk.score} /> : null}
            {flags?.hasODK && student.userId ? (
              <Link href={`/panel/admin/odk/ogrenciler/${student.userId}`} className="od-btn od-btn-ghost od-btn-sm">
                ODK detayı →
              </Link>
            ) : null}
            <Link href={`/panel/admin/ogrenciler/${student.id}/duzenle`} className="od-btn od-btn-primary od-btn-sm">
              Düzenle
            </Link>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", borderBottom: "1px solid var(--pd-line)", paddingBottom: 8 }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <Link key={t} href={tabHref(t)} className={"od-btn od-btn-sm " + (tab === t ? "od-btn-primary" : "od-btn-ghost")}>
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      {tab === "genel" && risk && risk.signals.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <InsightList
            insights={sortInsights([
              ...risk.signals.map((s, i) => ({
                id: `risk-${i}`,
                severity: risk.level === "high" ? "danger" as const : risk.level === "medium" ? "warn" as const : "info" as const,
                icon: "⚠️",
                title: s.message,
                body: `Risk sinyali · ağırlık ${s.weight}`,
              })),
            ])}
          />
        </div>
      ) : null}

      {tab === "genel" ? (
        <div className="od-grid g-2" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <CardHeader title="Kişisel bilgiler" />
            <CardBody>
              <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, fontSize: 13, margin: 0 }}>
                <dt className="od-muted">Telefon</dt><dd className="od-mono">{student.phone}</dd>
                <dt className="od-muted">E-posta</dt><dd>{student.email ?? "—"}</dd>
                <dt className="od-muted">Şehir/İlçe</dt><dd>{[student.city, student.district].filter(Boolean).join(" / ") || "—"}</dd>
                <dt className="od-muted">Okul</dt><dd>{student.schoolName ?? "—"}</dd>
                <dt className="od-muted">Bölüm</dt><dd>{student.department ?? "—"}</dd>
                <dt className="od-muted">Hedef</dt><dd>{student.targetGoal ?? "—"}</dd>
                <dt className="od-muted">Hedef okul</dt><dd>{student.targetSchool ?? "—"}</dd>
                <dt className="od-muted">Durum</dt>
                <dd><Badge tone={student.status === "ACTIVE" ? "ok" : student.status === "AT_RISK" ? "bad" : student.status === "NEW" ? "teal" : "neutral"}>{student.status}</Badge></dd>
                <dt className="od-muted">Kayıt</dt><dd className="od-mono od-muted">{fmtDate(student.createdAt)}</dd>
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Hızlı özet" subtitle="Sınıf · paket · son denemeler" />
            <CardBody>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <strong style={{ fontSize: 12, color: "var(--pd-muted)" }}>Sınıflar</strong>
                  <div style={{ marginTop: 4 }}>
                    {classrooms.length === 0
                      ? <span className="od-muted">Atanmış sınıf yok</span>
                      : classrooms.map((c) => <Badge key={c.classroomId} tone="teal">{c.classroom.name}</Badge>)}
                  </div>
                </div>
                <div>
                  <strong style={{ fontSize: 12, color: "var(--pd-muted)" }}>Aktif OD Paket</strong>
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    {enrollments.length === 0
                      ? <span className="od-muted">Paket kaydı yok</span>
                      : <ul style={{ margin: 0, paddingLeft: 18 }}>{enrollments.slice(0, 3).map((e) => <li key={e.id}>{e.package.name} · {fmtTRY(e.package.price)}</li>)}</ul>}
                  </div>
                </div>
                <div>
                  <strong style={{ fontSize: 12, color: "var(--pd-muted)" }}>Son denemeler</strong>
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    {examResults.length === 0
                      ? <span className="od-muted">Deneme sonucu yok</span>
                      : <ul style={{ margin: 0, paddingLeft: 18 }}>{examResults.map((r) => <li key={r.id}>{r.title} · Net {r.net?.toString() ?? "—"} · {fmtDate(r.takenAt)}</li>)}</ul>}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === "sinif" ? (
        <Card>
          <CardHeader title="Sınıf bağları" subtitle={`${classrooms.length} sınıf`} />
          <CardBody>
            {classrooms.length === 0 ? <EmptyState title="Öğrenci hiçbir sınıfa atanmamış" /> : (
              <table className="od-table">
                <thead><tr><th>Sınıf</th><th>Düzey</th><th>Eklendiği tarih</th></tr></thead>
                <tbody>
                  {classrooms.map((c) => (
                    <tr key={c.classroomId}>
                      <td><strong>{c.classroom.name}</strong></td>
                      <td><Badge tone="teal">{c.classroom.level}</Badge></td>
                      <td className="od-mono od-muted">{fmtDate(c.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "dersler" || tab === "program" ? (
        <Card>
          <CardHeader title={tab === "program" ? "Ders programı" : "Son dersler"} subtitle={`${lessons.length} kayıt`} />
          <CardBody>
            {lessons.length === 0 ? <EmptyState title={tab === "program" ? "Planlanmış ders yok" : "Ders kaydı yok"} /> : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Zaman</th><th>Konu</th><th>Öğretmen</th>
                    {tab === "program" ? <th>Lokasyon</th> : null}
                    <th>Süre</th><th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l) => (
                    <tr key={l.id}>
                      <td className="od-mono od-muted">{fmtDateTime(l.scheduledAt)}</td>
                      <td>{l.title ?? l.course?.title ?? l.subject ?? "—"}</td>
                      <td>{l.teacher.fullName}</td>
                      {tab === "program" ? <td className="od-muted" style={{ fontSize: 12 }}>{l.location ?? (l.googleMeetLink ? "Online" : "—")}</td> : null}
                      <td className="od-mono">{l.duration}dk</td>
                      <td><Badge tone={l.status === "COMPLETED" ? "ok" : l.status === "CANCELLED" ? "bad" : l.status === "SCHEDULED" ? "teal" : "neutral"}>{l.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "odevler" ? (
        <Card>
          <CardHeader title="Ödev gönderimleri" subtitle={`${submissions.length} kayıt`} />
          <CardBody>
            {submissions.length === 0 ? <EmptyState title="Ödev gönderimi yok" /> : (
              <table className="od-table">
                <thead><tr><th>Ödev</th><th>Son tarih</th><th>Gönderim</th><th>Puan</th></tr></thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.assignment.title}</td>
                      <td className="od-mono od-muted">{fmtDate(s.assignment.dueAt)}</td>
                      <td className="od-mono od-muted">{fmtDateTime(s.submittedAt)}</td>
                      <td className="od-mono">{s.score !== null ? <Badge tone="ok">{s.score}</Badge> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "devamsizlik" ? (
        <>
          {attendanceStats ? (
            <div className="od-kpi-grid" style={{ marginBottom: 12 }}>
              <KpiCard label="Toplam oturum" value={attendanceStats.total} />
              <KpiCard label="Devam" value={`${attendanceStats.present} (%${attendanceStats.pct})`} />
              <KpiCard label="Devamsız" value={attendanceStats.absent} />
              <KpiCard label="Geç" value={attendanceStats.late} />
            </div>
          ) : null}
          <Card>
            <CardHeader title="Yoklama kayıtları" subtitle={`${attendances.length} oturum`} />
            <CardBody>
              {attendances.length === 0 ? <EmptyState title="Yoklama kaydı yok" /> : (
                <table className="od-table">
                  <thead><tr><th>Tarih</th><th>Durum</th><th>Gecikme</th><th>Bağlam</th><th>Not</th></tr></thead>
                  <tbody>
                    {attendances.map((a) => (
                      <tr key={a.id}>
                        <td className="od-mono od-muted">{fmtDateTime(a.sessionDate)}</td>
                        <td><Badge tone={a.status === "PRESENT" ? "ok" : a.status === "ABSENT" ? "bad" : a.status === "LATE" ? "warn" : "neutral"}>{a.status}</Badge></td>
                        <td className="od-mono">{a.minutesLate ? `${a.minutesLate}dk` : "—"}</td>
                        <td className="od-muted" style={{ fontSize: 12 }}>{a.context}</td>
                        <td className="od-muted" style={{ fontSize: 12 }}>{a.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </>
      ) : null}

      {tab === "paket" ? (
        <Card>
          <CardHeader title="OD paket kayıtları" subtitle={`${enrollments.length} enrollment`} />
          <CardBody>
            {enrollments.length === 0 ? <EmptyState title="Aktif OD paket yok" /> : (
              <table className="od-table">
                <thead><tr><th>Paket</th><th>Tutar</th><th>Durum</th><th>Başlangıç</th></tr></thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id}>
                      <td><Link href={`/panel/admin/paketler/${e.package.id}`}>{e.package.name}</Link></td>
                      <td className="od-mono">{fmtTRY(e.package.price)}</td>
                      <td><Badge tone={e.status === "ACTIVE" ? "ok" : "neutral"}>{e.status}</Badge></td>
                      <td className="od-mono od-muted">{fmtDate(e.startsAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "odemeler" ? (
        <Card>
          <CardHeader title="OD muhasebe izleri" subtitle={`${accountingEntries.filter((e) => e.service === "OD").length} OD kayıt`} />
          <CardBody>
            {accountingEntries.length === 0 ? <EmptyState title="Ödeme/muhasebe kaydı yok" /> : (
              <table className="od-table">
                <thead><tr><th>Tarih</th><th>Tip</th><th>Servis</th><th>Kategori</th><th>Tutar</th></tr></thead>
                <tbody>
                  {accountingEntries.filter((e) => e.service === "OD").map((e) => (
                    <tr key={e.id}>
                      <td className="od-mono od-muted">{fmtDate(e.occurredAt)}</td>
                      <td><Badge tone={e.type === "INCOME" ? "ok" : "bad"}>{e.type}</Badge></td>
                      <td><Badge tone="teal">{e.service}</Badge></td>
                      <td>{e.category}</td>
                      <td className="od-mono">{fmtTRY(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "bildirimler" ? (
        <Card>
          <CardHeader title="Bildirim geçmişi" subtitle={`${notifications.length} bildirim`} />
          <CardBody>
            {!student.userId ? (
              <EmptyState title="Kullanıcı hesabı yok" description="Bu öğrencinin sisteme bağlı bir User kaydı yok, dolayısıyla bildirim gönderilemez." />
            ) : notifications.length === 0 ? <EmptyState title="Bildirim yok" /> : (
              <table className="od-table">
                <thead><tr><th>Tarih</th><th>Tip</th><th>Başlık</th><th>Okundu</th></tr></thead>
                <tbody>
                  {notifications.map((n) => (
                    <tr key={n.id}>
                      <td className="od-mono od-muted">{fmtDateTime(n.createdAt)}</td>
                      <td><Badge tone="neutral">{n.type}</Badge></td>
                      <td>{n.title}</td>
                      <td className="od-mono od-muted">{fmtDateTime(n.readAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "islem" ? (
        <Card>
          <CardHeader title="Audit log" subtitle={`${auditLogs.length} işlem`} />
          <CardBody>
            {auditLogs.length === 0 ? <EmptyState title="İşlem kaydı yok" /> : (
              <table className="od-table">
                <thead><tr><th>Tarih</th><th>Aksiyon</th><th>Özet</th><th>Aktör</th></tr></thead>
                <tbody>
                  {auditLogs.map((a) => (
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
      ) : null}
    </>
  );
}
