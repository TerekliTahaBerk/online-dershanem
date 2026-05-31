/**
 * Phase 3 / Session 6 — `/panel/admin/kayitlar/[id]`
 *
 * Enrollment detail / lifecycle cockpit. No financial side-effects:
 * status changes never touch PaymentScheduleItem or AccountingEntry.
 * Payment-plan rows are linked by `(studentId, packageId)` (Session 5
 * heuristic) — no FK migration needed.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { Field, Input, Textarea, FormActions } from "@/components/panel/ui/form";
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusTone,
} from "@/lib/panel/enrollment";
import {
  updateEnrollmentDatesAction,
  updateEnrollmentNoteAction,
} from "@/app/panel/admin/kayitlar/_actions";
import { EnrollmentTransitionButton } from "@/components/panel/enrollment/enrollment-transition-button";
import type { EnrollmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const TRY = (kurus: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(kurus / 100);
const DATE_TR = (d: Date) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(d);
const DATETIME_TR = (d: Date) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);

function isoDate(d: Date | null | undefined): string {
  if (!d) return "";
  const x = new Date(d);
  const off = x.getTimezoneOffset();
  return new Date(x.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function transitionsFor(status: EnrollmentStatus): Array<"pause" | "resume" | "complete" | "cancel" | "reactivate"> {
  switch (status) {
    case "ACTIVE":
      return ["pause", "complete", "cancel"];
    case "TRIAL":
    case "LEAD":
      return ["resume", "cancel"]; // "resume" → ACTIVE
    case "PAUSED":
      return ["resume", "complete", "cancel"];
    case "COMPLETED":
    case "CANCELLED":
      return ["reactivate"];
  }
}

export default async function EnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;

  const enrollment = await prisma.studentPackageEnrollment.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          userId: true,
          classLevel: true,
          examType: true,
        },
      },
      package: {
        select: {
          id: true,
          name: true,
          type: true,
          price: true,
          lessonCount: true,
          subjects: true,
          isActive: true,
        },
      },
    },
  });
  if (!enrollment) notFound();

  // ── Side data — fetched in parallel ──────────────────────────────────────
  const [scheduleItems, parents, classroomLinks, odkAccessTags, audit] = await Promise.all([
    prisma.paymentScheduleItem.findMany({
      where: { studentId: enrollment.studentId, packageId: enrollment.packageId },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: {
        parent: { select: { id: true, fullName: true } },
      },
    }),
    prisma.parentStudent.findMany({
      where: { studentId: enrollment.studentId },
      orderBy: [{ isPrimary: "desc" }],
      include: {
        parent: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            userId: true,
          },
        },
      },
    }),
    prisma.classroomStudent.findMany({
      where: { studentId: enrollment.studentId },
      include: { classroom: { select: { id: true, name: true, branch: true, level: true } } },
    }),
    enrollment.student.userId
      ? prisma.odkUserAccessTag.findMany({
          where: { userId: enrollment.student.userId, revokedAt: null },
          include: { accessTag: { select: { id: true, key: true, title: true, service: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "StudentPackageEnrollment", entityId: id },
          { entityType: "PaymentScheduleItem", entityId: id },
          { entityType: "OdkUserAccessTag", entityId: id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        entityType: true,
        summary: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
  ]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const today = startOfToday();
  const totalKurus = scheduleItems.reduce((s, i) => s + i.amount, 0);
  const paidKurus = scheduleItems.reduce((s, i) => s + i.paidAmount, 0);
  const overdueCount = scheduleItems.filter(
    (i) => i.status === "PENDING" && i.dueDate.getTime() < today.getTime(),
  ).length;
  const pendingCount = scheduleItems.filter((i) => i.status === "PENDING" || i.status === "PARTIAL").length;
  const distinctPayerIds = new Set(scheduleItems.map((i) => i.parentId).filter((x): x is string => !!x));
  const inferredPayer =
    distinctPayerIds.size === 1
      ? parents.find((p) => p.parent.id === Array.from(distinctPayerIds)[0]) ?? null
      : null;
  const primaryParent = parents.find((p) => p.isPrimary) ?? null;

  const netKurus =
    enrollment.listPrice !== null && enrollment.listPrice !== undefined
      ? Math.max(0, (enrollment.listPrice ?? 0) - (enrollment.discountAmount ?? 0))
      : null;

  // ── Warnings ─────────────────────────────────────────────────────────────
  const warnings: string[] = [];
  if (parents.length === 0) warnings.push("Öğrenciye bağlı bir veli yok.");
  if (scheduleItems.length === 0)
    warnings.push("Bu kayıt için tanımlı bir ödeme planı yok.");
  if (overdueCount > 0)
    warnings.push(`${overdueCount} adet gecikmiş ödeme var (Vadeler sayfasından inceleyin).`);
  if (enrollment.status === "CANCELLED")
    warnings.push("Bu kayıt iptal edilmiş durumda.");
  if (!enrollment.package.isActive)
    warnings.push("Bu kayda bağlı paket pasif durumda.");
  if (!enrollment.student.userId)
    warnings.push("Öğrencinin kullanıcı hesabı yok; ODK erişimi atanamaz.");
  if (classroomLinks.length === 0)
    warnings.push("Öğrencinin atanmış sınıfı yok.");

  const transitions = transitionsFor(enrollment.status);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Kayıtlar", href: "/panel/admin/kayitlar" },
          { label: `${enrollment.student.fullName} · ${enrollment.package.name}` },
        ]}
        title={`${enrollment.student.fullName} · ${enrollment.package.name}`}
        subtitle={[
          enrollment.package.type === "EXAM" ? "Sınav paketi" : "Kurs paketi",
          `Başlangıç: ${DATE_TR(enrollment.startsAt)}`,
          enrollment.endsAt ? `Bitiş: ${DATE_TR(enrollment.endsAt)}` : "Bitiş tarihi yok",
          `Kaynak: ${enrollment.source}`,
        ].join(" · ")}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge tone={getEnrollmentStatusTone(enrollment.status)}>
              {getEnrollmentStatusLabel(enrollment.status)}
            </Badge>
            <Link href={`/panel/admin/ogrenciler/${enrollment.student.id}`} className="od-btn ghost sm">
              Öğrenci 360 →
            </Link>
            <Link href={`/panel/admin/odemeler/vadeler?q=${encodeURIComponent(enrollment.student.fullName)}`} className="od-btn ghost sm">
              Vadeler →
            </Link>
            {primaryParent ? (
              <Link href={`/panel/admin/veliler/${primaryParent.parent.id}/duzenle`} className="od-btn ghost sm">
                Veli detayı →
              </Link>
            ) : null}
            <Link href={`/panel/admin/paketler/${enrollment.package.id}`} className="od-btn ghost sm">
              Paket →
            </Link>
          </div>
        }
      />

      {warnings.length > 0 ? (
        <div className="od-soft-alert is-info" style={{ marginBottom: 16 }}>
          <strong>Dikkat</strong>
          <ul style={{ margin: "6px 0 0 0", paddingLeft: 16 }}>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      ) : null}

      {/* ── Overview KPIs ───────────────────────────────────────────────── */}
      <div className="od-form-grid" style={{ marginBottom: 16 }}>
        <Kpi label="Liste fiyatı" value={enrollment.listPrice !== null && enrollment.listPrice !== undefined ? TRY(enrollment.listPrice) : "—"} />
        <Kpi label="İndirim" value={enrollment.discountAmount ? TRY(enrollment.discountAmount) : "—"} />
        <Kpi label="Net" value={netKurus !== null ? TRY(netKurus) : "—"} />
        <Kpi label="Plan toplamı" value={scheduleItems.length > 0 ? TRY(totalKurus) : "—"} sub={`${scheduleItems.length} satır`} />
        <Kpi label="Tahsil edilen" value={paidKurus > 0 ? TRY(paidKurus) : "—"} sub={`${pendingCount} bekleyen`} />
        <Kpi label="Gecikmiş" value={overdueCount.toString()} tone={overdueCount > 0 ? "warn" : "neutral"} />
      </div>

      {/* ── Lifecycle ──────────────────────────────────────────────────── */}
      <Card>
        <CardBody>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14 }}>Yaşam döngüsü</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {transitions.length === 0 ? (
              <span className="od-muted" style={{ fontSize: 13 }}>Bu durumdan ileri geçiş yok.</span>
            ) : (
              transitions.map((t) => (
                <EnrollmentTransitionButton key={t} enrollmentId={enrollment.id} kind={t} />
              ))
            )}
          </div>
          <div className="od-muted" style={{ fontSize: 11, marginTop: 8 }}>
            Durum değişiklikleri ödeme planı satırlarını ve muhasebe kayıtlarını etkilemez.
          </div>
        </CardBody>
      </Card>

      {/* ── Dates + Notes ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        <Card>
          <CardBody>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 14 }}>Tarihler</h3>
            <form action={updateEnrollmentDatesAction.bind(null, enrollment.id)} style={{ display: "grid", gap: 12 }}>
              <Field label="Başlangıç">
                <Input type="date" name="startsAt" defaultValue={isoDate(enrollment.startsAt)} required />
              </Field>
              <Field label="Bitiş (opsiyonel)" hint="Boş bırakılırsa süresiz olarak işaretlenir.">
                <Input type="date" name="endsAt" defaultValue={isoDate(enrollment.endsAt)} />
              </Field>
              <FormActions>
                <button type="submit" className="od-btn dark sm">Tarihleri kaydet</button>
              </FormActions>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 14 }}>Notlar</h3>
            <form action={updateEnrollmentNoteAction.bind(null, enrollment.id)} style={{ display: "grid", gap: 12 }}>
              <Field label="Faturalama dönemi (opsiyonel)">
                <Input
                  name="billingPeriodLabel"
                  defaultValue={enrollment.billingPeriodLabel ?? ""}
                  placeholder="Aylık / Tek ödeme"
                />
              </Field>
              <Field label="Notlar">
                <Textarea name="notes" rows={3} defaultValue={enrollment.notes ?? ""} />
              </Field>
              <FormActions>
                <button type="submit" className="od-btn dark sm">Notları kaydet</button>
              </FormActions>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* ── Payment plan ──────────────────────────────────────────────── */}
      <Card style={{ marginTop: 16 }}>
        <CardBody>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Ödeme planı ({scheduleItems.length})</h3>
            <Link href={`/panel/admin/odemeler/vadeler?q=${encodeURIComponent(enrollment.student.fullName)}`} className="od-btn ghost sm">
              Vadeler sayfasında aç →
            </Link>
          </div>
          {scheduleItems.length === 0 ? (
            <div className="od-muted" style={{ fontSize: 13 }}>
              Bu kayda bağlı ödeme planı yok. Vadeler sayfasından ekleyebilirsiniz.
            </div>
          ) : (
            <table className="od-table premium-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Başlık</th>
                  <th style={{ textAlign: "left" }}>Vade</th>
                  <th style={{ textAlign: "right" }}>Tutar</th>
                  <th style={{ textAlign: "right" }}>Tahsil</th>
                  <th style={{ textAlign: "left" }}>Durum</th>
                  <th style={{ textAlign: "left" }}>Ödeyici</th>
                </tr>
              </thead>
              <tbody>
                {scheduleItems.map((it) => {
                  const isOverdue = it.status === "PENDING" && it.dueDate.getTime() < today.getTime();
                  const display = isOverdue ? "OVERDUE" : it.status;
                  const tone =
                    display === "PAID" ? "ok" :
                    display === "OVERDUE" ? "bad" :
                    display === "PARTIAL" ? "warn" :
                    display === "CANCELLED" ? "neutral" :
                    "teal";
                  const label =
                    display === "PAID" ? "Ödendi" :
                    display === "OVERDUE" ? "Gecikmiş" :
                    display === "PARTIAL" ? "Kısmi" :
                    display === "CANCELLED" ? "İptal" :
                    "Bekliyor";
                  return (
                    <tr key={it.id}>
                      <td>{it.title}</td>
                      <td>{DATE_TR(it.dueDate)}</td>
                      <td style={{ textAlign: "right" }}>{TRY(it.amount)}</td>
                      <td style={{ textAlign: "right" }}>{it.paidAmount > 0 ? TRY(it.paidAmount) : "—"}</td>
                      <td><Badge tone={tone}>{label}</Badge></td>
                      <td>
                        {it.parent ? (
                          <Link href={`/panel/admin/veliler/${it.parent.id}/duzenle`} className="od-link">
                            {it.parent.fullName}
                          </Link>
                        ) : (
                          <span className="od-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* ── Payer / parents ──────────────────────────────────────────── */}
      <Card style={{ marginTop: 16 }}>
        <CardBody>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14 }}>Ödeyici / veliler</h3>
          {inferredPayer ? (
            <div className="od-muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Ödeyici, ödeme planı satırlarından okundu: <strong>{inferredPayer.parent.fullName}</strong>
            </div>
          ) : distinctPayerIds.size > 1 ? (
            <div className="od-muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Birden fazla ödeyici görünüyor (ödeme planı satırlarına bakınız).
            </div>
          ) : scheduleItems.length > 0 ? (
            <div className="od-muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Ödeme planı var ama ödeyici belirtilmemiş.
            </div>
          ) : null}
          {parents.length === 0 ? (
            <div className="od-soft-alert is-info">
              Bu öğrenciye bağlı bir veli yok.{" "}
              <Link href={`/panel/admin/ogrenciler/${enrollment.student.id}/duzenle`} className="od-btn ghost sm" style={{ marginLeft: 8 }}>
                Veli bağla →
              </Link>
            </div>
          ) : (
            <table className="od-table premium-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Ad</th>
                  <th style={{ textAlign: "left" }}>İletişim</th>
                  <th style={{ textAlign: "left" }}>Hesap</th>
                  <th style={{ textAlign: "left" }}>Yakınlık</th>
                  <th style={{ textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {parents.map((p) => (
                  <tr key={p.parent.id}>
                    <td>
                      {p.parent.fullName}
                      {p.isPrimary ? <Badge tone="ok">birincil</Badge> : null}
                    </td>
                    <td>
                      <span className="od-muted" style={{ fontSize: 11 }}>
                        {[p.parent.phone, p.parent.email].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </td>
                    <td>{p.parent.userId ? <Badge tone="ok">var</Badge> : <Badge tone="neutral">yok</Badge>}</td>
                    <td>{(p.relationshipType as string | null) ?? p.relationship ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/panel/admin/veliler/${p.parent.id}/duzenle`} className="od-btn ghost sm">
                        Aç →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* ── Classroom / ODK access ──────────────────────────────────── */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        <Card>
          <CardBody>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 14 }}>Sınıf ataması</h3>
            {classroomLinks.length === 0 ? (
              <div className="od-muted" style={{ fontSize: 13 }}>
                Sınıf atanmamış.{" "}
                <Link href={`/panel/admin/ogrenciler/${enrollment.student.id}/duzenle`} className="od-link">
                  Düzenle →
                </Link>
              </div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                {classroomLinks.map((c) => (
                  <li key={c.classroomId}>
                    <Link href={`/panel/admin/siniflar/${c.classroomId}/duzenle`} className="od-link">
                      {c.classroom.name}{c.classroom.branch ? ` / ${c.classroom.branch}` : ""}
                    </Link>{" "}
                    <span className="od-muted">· {c.classroom.level}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 14 }}>ODK erişim etiketleri</h3>
            {!enrollment.student.userId ? (
              <div className="od-muted" style={{ fontSize: 13 }}>
                Öğrencinin kullanıcı hesabı yok; ODK erişimi atanamaz.
              </div>
            ) : odkAccessTags.length === 0 ? (
              <div className="od-muted" style={{ fontSize: 13 }}>
                Aktif ODK erişim etiketi yok.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {odkAccessTags.map((g) => (
                  <Badge key={g.id} tone="purple">
                    {g.accessTag.title}
                  </Badge>
                ))}
              </div>
            )}
            {enrollment.student.userId ? (
              <div style={{ marginTop: 8 }}>
                <Link href={`/panel/admin/odk/ogrenciler/${enrollment.student.userId}`} className="od-btn ghost sm">
                  ODK detayı →
                </Link>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {/* ── Audit ──────────────────────────────────────────────────── */}
      <Card style={{ marginTop: 16 }}>
        <CardBody>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14 }}>Son aktivite</h3>
          {audit.length === 0 ? (
            <div className="od-muted" style={{ fontSize: 13 }}>Aktivite kaydı yok.</div>
          ) : (
            <table className="od-table premium-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Zaman</th>
                  <th style={{ textAlign: "left" }}>Olay</th>
                  <th style={{ textAlign: "left" }}>Aktör</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={row.id}>
                    <td>{DATETIME_TR(row.createdAt)}</td>
                    <td>
                      {row.action}
                      {row.summary ? (
                        <span className="od-muted" style={{ marginLeft: 6, fontSize: 11 }}>· {row.summary}</span>
                      ) : null}
                    </td>
                    <td>{row.actor?.name ?? row.actor?.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "warn";
}) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px solid var(--pd-line)",
        borderRadius: 12,
        background: "var(--pd-card)",
      }}
    >
      <div className="od-muted" style={{ fontSize: 11 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: tone === "warn" ? "var(--pd-warn)" : "var(--pd-ink-1)" }}>
        {value}
      </div>
      {sub ? <div className="od-muted" style={{ fontSize: 11 }}>{sub}</div> : null}
    </div>
  );
}
