/**
 * Phase 3 / Session 3 — D3: Parent detail / operations cockpit.
 *
 * Sections:
 *   1. Kimlik           — edit form (updateParentAction)
 *   2. Hesap erişimi    — ParentAccountCard (full lifecycle on User-row)
 *   3. Bağlı çocuklar   — ParentChildrenManager (link/unlink/change rel)
 *   4. Son aktivite     — last 20 AuditLog rows for this Parent
 *   5. Tehlikeli bölge  — delete parent
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Field, Input, Textarea, FormActions } from "@/components/panel/ui/form";
import { Badge } from "@/components/panel/ui/badge";
import {
  updateParentAction,
  deleteParentAction,
} from "@/app/panel/admin/veliler/_actions";
import { ParentAccountCard } from "@/components/panel/parents/parent-account-card";
import {
  ParentChildrenManager,
  type ChildRow,
} from "@/components/panel/parents/parent-children-manager";
import {
  deriveUserAccountState,
  type UserAccountState,
} from "@/lib/panel/account-onboarding";
import {
  isParentRelationshipType,
  type ParentRelationshipType,
} from "@/lib/parents";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

export default async function EditParent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;

  const p = await prisma.parent.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          passwordHash: true,
          lastLoginAt: true,
          userInviteSentAt: true,
          userInviteToken: true,
          userInviteTokenExpiresAt: true,
          mustChangePassword: true,
          passwordChangedAt: true,
          accountDisabledAt: true,
        },
      },
      students: {
        include: {
          student: {
            select: { id: true, fullName: true, classLevel: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!p) notFound();

  const accountState: UserAccountState = deriveUserAccountState(p.user);
  const update = updateParentAction.bind(null, id);
  const del = deleteParentAction.bind(null, id);

  const children: ChildRow[] = p.students.map((s) => ({
    studentId: s.student.id,
    fullName: s.student.fullName,
    classLevel: s.student.classLevel,
    relationshipType: isParentRelationshipType(s.relationshipType)
      ? (s.relationshipType as ParentRelationshipType)
      : null,
    relationship: s.relationship,
    isPrimary: s.isPrimary,
  }));

  // Recent activity — last 20 events scoped to this Parent entity.
  const auditRows = await prisma.auditLog.findMany({
    where: { entityType: "Parent", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      action: true,
      summary: true,
      createdAt: true,
      actor: { select: { name: true, email: true } },
    },
  });

  return (
    <>
      <PageHeader
        title={p.fullName}
        breadcrumbs={[
          { label: "Admin", href: "/panel/admin" },
          { label: "Veliler", href: "/panel/admin/veliler" },
          { label: "Düzenle" },
        ]}
        subtitle={`${children.length} bağlı öğrenci · oluşturuldu ${fmtDate(p.createdAt)}`}
        right={
          <Link
            href="/panel/admin/veliler"
            className="od-btn od-btn-ghost od-btn-sm"
          >
            ← Liste
          </Link>
        }
      />

      <div
        className="od-grid"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 16, alignItems: "flex-start" }}
      >
        {/* MAIN COLUMN */}
        <div className="od-grid" style={{ gap: 16 }}>
          {/* 1. Kimlik */}
          <Card>
            <CardHeader title="Kimlik" subtitle="Telefon ve email çakışmaları kayıt sırasında tekrar kontrol edilir." />
            <CardBody>
              <form action={update} className="od-grid g-2" style={{ gap: 12 }}>
                <Field label="Ad Soyad *">
                  <Input name="fullName" defaultValue={p.fullName} required />
                </Field>
                <Field label="Telefon">
                  <Input name="phone" defaultValue={p.phone ?? ""} placeholder="+90 5xx xxx xx xx" />
                </Field>
                <Field label="Email" hint="Hesap erişimi için zorunludur.">
                  <Input name="email" type="email" defaultValue={p.email ?? ""} />
                </Field>
                <div />
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="İç notlar">
                    <Textarea name="notes" defaultValue={p.notes ?? ""} rows={3} />
                  </Field>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <FormActions>
                    <button className="od-btn od-btn-primary" type="submit">
                      Kaydet
                    </button>
                  </FormActions>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* 3. Bağlı çocuklar */}
          <Card>
            <CardHeader
              title={`Bağlı çocuklar (${children.length})`}
              subtitle="Yakınlık türü, birincil iletişim ve bağ kaldırma işlemleri."
            />
            <CardBody>
              <ParentChildrenManager parentId={id} items={children} />
            </CardBody>
          </Card>

          {/* 4. Aktivite */}
          <Card>
            <CardHeader
              title="Son aktivite"
              subtitle="Bu velinin kaydında oluşan operasyonel olaylar."
            />
            <CardBody>
              {auditRows.length === 0 ? (
                <div
                  style={{
                    padding: 12,
                    border: "1px dashed var(--pd-line)",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "var(--od-muted)",
                  }}
                >
                  Henüz olay yok. Veli kaydı oluşturulduktan sonra burada
                  görünmeye başlar.
                </div>
              ) : (
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "grid",
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  {auditRows.map((r) => (
                    <li
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 12,
                        padding: "8px 10px",
                        border: "1px solid var(--pd-line)",
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                        <span style={{ fontWeight: 600 }}>{r.action}</span>
                        <span style={{ color: "var(--od-muted)", fontSize: 12 }}>
                          {r.summary ?? "—"}
                          {r.actor ? ` · ${r.actor.name ?? r.actor.email}` : ""}
                        </span>
                      </div>
                      <span style={{ color: "var(--od-muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                        {fmtDate(r.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* 5. Tehlikeli bölge */}
          <Card>
            <CardHeader title="Tehlikeli bölge" subtitle="Geri alınamaz işlemler." />
            <CardBody>
              <form action={del}>
                <button
                  type="submit"
                  className="od-btn od-btn-ghost od-btn-sm"
                  style={{ color: "var(--pd-bad)" }}
                >
                  🗑 Veliyi sil
                </button>
                <p
                  style={{
                    marginTop: 8,
                    marginBottom: 0,
                    fontSize: 12,
                    color: "var(--od-muted)",
                  }}
                >
                  Bağlı kullanıcı hesabı varsa veli kaydı silinmeden önce hesap
                  bağlantısının kaldırılması gerekir.
                </p>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* SIDE COLUMN */}
        <div className="od-grid" style={{ gap: 16, position: "sticky", top: 24 }}>
          {/* 2. Hesap erişimi */}
          <Card>
            <CardHeader
              title="Hesap erişimi"
              subtitle="Veli panel girişine ait davet, şifre ve durum yönetimi."
            />
            <CardBody>
              <ParentAccountCard
                parentId={id}
                email={p.email}
                hasAccount={!!p.user}
                accountState={accountState}
                user={
                  p.user
                    ? {
                        email: p.user.email,
                        lastLoginAt: p.user.lastLoginAt,
                        userInviteSentAt: p.user.userInviteSentAt,
                        userInviteTokenExpiresAt: p.user.userInviteTokenExpiresAt,
                        mustChangePassword: p.user.mustChangePassword,
                        passwordChangedAt: p.user.passwordChangedAt,
                        accountDisabledAt: p.user.accountDisabledAt,
                      }
                    : null
                }
              />
            </CardBody>
          </Card>

          {/* Sonraki adım — quick guidance */}
          <Card>
            <CardHeader title="Sonraki adım" />
            <CardBody>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, display: "grid", gap: 6 }}>
                {!p.email ? (
                  <li>
                    Email eksik — hesap açabilmek için <Badge tone="bad">email gerekli</Badge>.
                  </li>
                ) : null}
                {!p.phone ? (
                  <li>
                    Telefon eksik — veli arama zorlaşır.{" "}
                    <Badge tone="warn">telefon eksik</Badge>
                  </li>
                ) : null}
                {!p.user ? (
                  <li>
                    Hesap yok — sağdaki karttan davet linki üretebilir veya
                    geçici şifre verebilirsiniz.
                  </li>
                ) : null}
                {children.length === 0 ? (
                  <li>
                    Bağlı çocuk yok — sol kolondan en az bir öğrenci bağlayın.
                  </li>
                ) : null}
                {p.user?.mustChangePassword ? (
                  <li>
                    Veli ilk girişinde şifresini değiştirmek zorunda kalacak.
                  </li>
                ) : null}
                {p.user?.accountDisabledAt ? (
                  <li>
                    Hesap devre dışı — giriş engellenir. Sağdaki karttan
                    aktifleştirebilirsiniz.
                  </li>
                ) : null}
                {p.email && p.phone && p.user && children.length > 0 && !p.user.accountDisabledAt ? (
                  <li style={{ color: "var(--od-muted)" }}>
                    ✓ Kayıt eksiksiz. Aktivite bölümünden son olayları takip
                    edebilirsiniz.
                  </li>
                ) : null}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
