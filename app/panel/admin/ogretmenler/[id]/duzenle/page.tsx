/**
 * Phase 3 / Session 4 — D4: Teacher detail cockpit.
 *
 * Sectioned operational dashboard for a single teacher:
 *   1. Identity (edit)
 *   2. Account lifecycle (TeacherAccountCard)
 *   3. Classroom assignments (TeacherClassroomManager)
 *   4. Availability — deferred (no model yet)
 *   5. Compensation rules (TeacherCompensationCard)
 *   6. Payroll snapshot (read-only link)
 *   7. Recent audit
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { Badge } from "@/components/panel/ui/badge";
import { TeacherAccountCard } from "@/components/panel/teachers/teacher-account-card";
import { TeacherClassroomManager } from "@/components/panel/teachers/teacher-classroom-manager";
import { TeacherCompensationCard } from "@/components/panel/teachers/teacher-compensation-card";
import { deriveUserAccountState } from "@/lib/panel/account-onboarding-shared";
import { updateTeacherAction, deleteTeacherAction } from "../../_actions";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

export default async function EditTeacher({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelRole("admin");
  const { id } = await params;

  const [t, allClassrooms, allCourses, audit] = await Promise.all([
    prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            passwordHash: true,
            lastLoginAt: true,
            userInviteToken: true,
            userInviteTokenExpiresAt: true,
            userInviteSentAt: true,
            mustChangePassword: true,
            passwordChangedAt: true,
            accountDisabledAt: true,
          },
        },
        classrooms: {
          include: { classroom: { select: { id: true, name: true, branch: true, level: true } } },
        },
        compensationRules: {
          orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
          include: {
            course: { select: { id: true, title: true } },
            classroom: { select: { id: true, name: true } },
          },
        },
        _count: { select: { lessons: true, assignments: true, payrollItems: true } },
      },
    }),
    prisma.classroom.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, branch: true },
    }),
    prisma.course.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "Teacher", entityId: id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, action: true, summary: true, createdAt: true, actor: { select: { name: true, email: true } } },
    }),
  ]);
  if (!t) notFound();

  const linkedIds = new Set(t.classrooms.map((x) => x.classroom.id));
  const availableClassrooms = allClassrooms.filter((c) => !linkedIds.has(c.id));
  const accountState = deriveUserAccountState(t.user);
  const linkedRows = t.classrooms.map((ct) => ({
    classroomId: ct.classroom.id,
    classroomName: ct.classroom.name,
    classroomBranch: ct.classroom.branch,
    classroomLevel: ct.classroom.level,
    subject: ct.subject,
    isLead: ct.isLead,
  }));
  const ruleRows = t.compensationRules.map((r) => ({
    id: r.id,
    hourlyRate: r.hourlyRate,
    isActive: r.isActive,
    courseId: r.courseId,
    courseTitle: r.course?.title ?? null,
    classroomId: r.classroomId,
    classroomName: r.classroom?.name ?? null,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    note: r.note,
  }));

  const update = updateTeacherAction.bind(null, id);
  const del = deleteTeacherAction.bind(null, id);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Öğretmenler", href: "/panel/admin/ogretmenler" },
          { label: t.fullName },
        ]}
        title={t.fullName}
        subtitle={`${t.subjects} · oluşturuldu ${fmtDate(t.createdAt)}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/panel/admin/ogretmenler" className="od-btn ghost sm">← Liste</Link>
          </div>
        }
      />

      <div className="od-grid g-3" style={{ gap: 16, gridTemplateColumns: "minmax(0, 1fr) 320px" }}>
        <div style={{ display: "grid", gap: 16 }}>
          {/* 1. Identity */}
          <Card>
            <CardBody>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Kimlik</h2>
              <form action={update} className="od-form-grid">
                <Field label="Ad Soyad *"><Input name="fullName" defaultValue={t.fullName} required /></Field>
                <Field label="Branş *"><Input name="subjects" defaultValue={t.subjects} required /></Field>
                <Field label="Email"><Input name="email" type="email" defaultValue={t.email ?? ""} /></Field>
                <Field label="Telefon"><Input name="phone" defaultValue={t.phone ?? ""} /></Field>
                <Field label="Durum">
                  <Select name="status" defaultValue={t.status}>
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Pasif</option>
                  </Select>
                </Field>
                <div className="full">
                  <Field label="Dahili not / bio">
                    <Textarea name="bio" defaultValue={t.bio ?? ""} rows={3} />
                  </Field>
                </div>
                <div className="full">
                  <FormActions>
                    <button className="od-btn dark sm" type="submit">Kaydet</button>
                  </FormActions>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* 2. Account */}
          <Card>
            <CardBody>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Hesap durumu</h2>
              <TeacherAccountCard
                teacherId={t.id}
                email={t.email}
                hasAccount={!!t.user}
                accountState={accountState}
                user={t.user}
              />
            </CardBody>
          </Card>

          {/* 3. Classrooms */}
          <Card>
            <CardBody>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                Sınıf / ders ataması <span className="od-muted" style={{ fontSize: 12, fontWeight: 400 }}>· {t.classrooms.length} sınıf</span>
              </h2>
              <TeacherClassroomManager
                teacherId={t.id}
                linked={linkedRows}
                available={availableClassrooms}
              />
            </CardBody>
          </Card>

          {/* 4. Availability — deferred */}
          <Card>
            <CardBody>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Müsaitlik</h2>
              <div className="od-soft-alert">
                <b>Müsaitlik modeli henüz yok.</b><br />
                Haftalık müsaitlik / blok saatleri için yapılandırılmış bir veri modeli ileride eklenecek.
                Şimdilik <i>dahili not</i> alanına yazılabilir.
              </div>
            </CardBody>
          </Card>

          {/* 5. Compensation */}
          <Card>
            <CardBody>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Hakediş kuralları</h2>
              <TeacherCompensationCard
                teacherId={t.id}
                rules={ruleRows}
                courses={allCourses}
                classrooms={allClassrooms}
              />
            </CardBody>
          </Card>

          {/* 6. Payroll snapshot — read-only link */}
          <Card>
            <CardBody>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Bordro özeti</h2>
              <div className="od-grid g-3" style={{ gap: 12, fontSize: 13 }}>
                <KvBlock k="Toplam ders" v={String(t._count.lessons)} />
                <KvBlock k="Verilen ödev" v={String(t._count.assignments)} />
                <KvBlock k="Bordro satırı" v={String(t._count.payrollItems)} />
              </div>
              <div style={{ marginTop: 10 }}>
                <Link
                  href={`/panel/admin/ogretmen-hakedisleri?teacher=${t.id}`}
                  className="od-btn ghost sm"
                >
                  Bordro hub'ında ayrıntı →
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* 7. Audit */}
          <Card>
            <CardBody>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Son aktivite</h2>
              {audit.length === 0 ? (
                <div className="od-empty-soft" style={{ padding: 12, fontSize: 13 }}>Henüz kayıt yok.</div>
              ) : (
                <ul style={{ display: "grid", gap: 6, fontSize: 13, listStyle: "none", padding: 0 }}>
                  {audit.map((a) => (
                    <li key={a.id} style={{ display: "flex", gap: 10, alignItems: "baseline", borderBottom: "1px solid var(--pd-line)", paddingBottom: 6 }}>
                      <code style={{ fontSize: 11, color: "var(--od-muted)" }}>{a.action}</code>
                      <span>{a.summary ?? "—"}</span>
                      <span style={{ marginLeft: "auto", color: "var(--od-muted)", fontSize: 12 }}>
                        {fmtDate(a.createdAt)} · {a.actor?.name ?? a.actor?.email ?? "sistem"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Danger zone */}
          <Card>
            <CardBody>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "var(--pd-bad)" }}>Tehlike bölgesi</h2>
              <form action={del}>
                <button
                  type="submit"
                  className="od-btn ghost sm"
                  style={{ color: "var(--pd-bad)" }}
                >
                  🗑 Öğretmeni kalıcı olarak sil
                </button>
              </form>
              <div className="od-muted" style={{ fontSize: 12, marginTop: 6 }}>
                Geçmiş dersler ve bordrolar SetNull/Cascade davranışı çerçevesinde etkilenir.
                Silmek yerine <b>Pasif</b> duruma çekmek genelde tercih edilir.
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right rail */}
        <aside style={{ position: "sticky", top: 16, alignSelf: "start", display: "grid", gap: 10 }}>
          <Card>
            <CardBody>
              <div style={{ display: "grid", gap: 6 }}>
                <Badge tone={t.status === "ACTIVE" ? "ok" : "neutral"}>{t.status === "ACTIVE" ? "Aktif" : "Pasif"}</Badge>
                <Kv k="Email" v={t.email ?? "—"} />
                <Kv k="Telefon" v={t.phone ?? "—"} />
                <Kv k="Branş" v={t.subjects} />
                <Kv k="Sınıf sayısı" v={String(t.classrooms.length)} />
                <Kv k="Aktif kural" v={String(t.compensationRules.filter((r) => r.isActive).length)} />
                <Kv k="Hesap" v={t.userId ? "Var" : "Yok"} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Bölümler</h3>
              <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 4, fontSize: 13 }}>
                <li><a className="od-link" href="#kimlik">Kimlik</a></li>
                <li><a className="od-link" href="#hesap">Hesap durumu</a></li>
                <li><a className="od-link" href="#siniflar">Sınıflar</a></li>
                <li><a className="od-link" href="#hakedis">Hakediş</a></li>
                <li><a className="od-link" href="#bordro">Bordro</a></li>
                <li><a className="od-link" href="#aktivite">Aktivite</a></li>
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--od-muted)" }}>{k}</span>
      <span style={{ fontSize: 13 }}>{v}</span>
    </div>
  );
}
function KvBlock({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ padding: 10, border: "1px solid var(--pd-line)", borderRadius: 8 }}>
      <div style={{ fontSize: 11, color: "var(--od-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{k}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{v}</div>
    </div>
  );
}
