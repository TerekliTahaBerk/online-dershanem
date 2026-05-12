import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import {
  updateStudentAction,
  deleteStudentAction,
  assignStudentToClassroomAction,
  removeStudentFromClassroomAction,
  assignPackageToStudentAction,
  removePackageFromStudentAction,
  linkParentToStudentAction,
  unlinkParentFromStudentAction,
} from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditStudent({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelRole("admin");
  const { id } = await params;
  const [s, allClassrooms, allPackages, allParents] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: {
        classrooms: { include: { classroom: { select: { id: true, name: true, branch: true } } } },
        packages: { include: { package: { select: { id: true, name: true, type: true } } } },
        parents: { include: { parent: { select: { id: true, fullName: true, phone: true } } } },
      },
    }),
    prisma.classroom.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, branch: true } }),
    prisma.package.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
    prisma.parent.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true, phone: true } }),
  ]);
  if (!s) notFound();

  const linkedClassroomIds = new Set(s.classrooms.map((x) => x.classroom.id));
  const linkedPackageIds = new Set(s.packages.filter((x) => !x.revokedAt).map((x) => x.package.id));
  const linkedParentIds = new Set(s.parents.map((x) => x.parent.id));
  const availClassrooms = allClassrooms.filter((c) => !linkedClassroomIds.has(c.id));
  const availPackages = allPackages.filter((p) => !linkedPackageIds.has(p.id));
  const availParents = allParents.filter((p) => !linkedParentIds.has(p.id));

  const update = updateStudentAction.bind(null, id);
  const del = deleteStudentAction.bind(null, id);
  const addClassroom = assignStudentToClassroomAction.bind(null, id);
  const addPackage = assignPackageToStudentAction.bind(null, id);
  const linkParent = linkParentToStudentAction.bind(null, id);

  return (
    <>
      <PageHeader
        title={`Düzenle: ${s.fullName}`}
        right={<Link href={`/panel/admin/ogrenciler/${id}`} className="od-btn od-btn-ghost od-btn-sm">← Detay</Link>}
      />
      <Card>
        <CardBody>
          <form action={update} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ad Soyad *"><Input name="fullName" defaultValue={s.fullName} required /></Field>
            <Field label="Email"><Input name="email" type="email" defaultValue={s.email ?? ""} /></Field>
            <Field label="Sınıf"><Input name="classLevel" defaultValue={s.classLevel ?? ""} /></Field>
            <Field label="Sınav türü"><Input name="examType" defaultValue={s.examType ?? ""} /></Field>
            <Field label="Şehir"><Input name="city" defaultValue={s.city ?? ""} /></Field>
            <Field label="İlçe"><Input name="district" defaultValue={s.district ?? ""} /></Field>
            <Field label="Okul"><Input name="schoolName" defaultValue={s.schoolName ?? ""} /></Field>
            <Field label="Hedef"><Input name="targetGoal" defaultValue={s.targetGoal ?? ""} /></Field>
            <Field label="Durum">
              <Select name="status" defaultValue={s.status}>
                <option value="NEW">NEW</option>
                <option value="FOLLOW_UP">FOLLOW_UP</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="AT_RISK">AT_RISK</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Notlar"><Textarea name="notes" defaultValue={s.notes ?? ""} /></Field></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions><button className="od-btn od-btn-primary" type="submit">Kaydet</button></FormActions>
            </div>
          </form>

          <hr style={{ margin: "24px 0 16px", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Sınıflar</h3>
          {s.classrooms.length === 0 ? (
            <div className="od-muted" style={{ fontSize: 13 }}>Henüz sınıf atanmamış.</div>
          ) : (
            <table className="od-table">
              <thead><tr><th>Sınıf</th><th>Şube</th><th></th></tr></thead>
              <tbody>
                {s.classrooms.map((cs) => (
                  <tr key={cs.classroom.id}>
                    <td>{cs.classroom.name}</td>
                    <td className="od-muted">{cs.classroom.branch ?? "—"}</td>
                    <td>
                      <form action={removeStudentFromClassroomAction.bind(null, id, cs.classroom.id)} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>Kaldır</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {availClassrooms.length > 0 && (
            <form action={addClassroom} className="od-grid g-2" style={{ gap: 12, alignItems: "end", marginTop: 12 }}>
              <Field label="Sınıf ekle">
                <Select name="classroomId" required defaultValue="">
                  <option value="" disabled>Seçin…</option>
                  {availClassrooms.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.branch ? ` · ${c.branch}` : ""}</option>
                  ))}
                </Select>
              </Field>
              <FormActions><button className="od-btn od-btn-primary od-btn-sm" type="submit">Ata</button></FormActions>
            </form>
          )}

          <hr style={{ margin: "24px 0 16px", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Paketler</h3>
          {s.packages.length === 0 ? (
            <div className="od-muted" style={{ fontSize: 13 }}>Henüz paket atanmamış.</div>
          ) : (
            <table className="od-table">
              <thead><tr><th>Paket</th><th>Tür</th><th>Atandı</th><th>İptal</th><th></th></tr></thead>
              <tbody>
                {s.packages.map((sp) => (
                  <tr key={sp.package.id}>
                    <td>{sp.package.name}</td>
                    <td className="od-muted">{sp.package.type}</td>
                    <td className="od-muted">{sp.assignedAt.toLocaleDateString("tr-TR")}</td>
                    <td className="od-muted">{sp.revokedAt ? sp.revokedAt.toLocaleDateString("tr-TR") : "—"}</td>
                    <td>
                      <form action={removePackageFromStudentAction.bind(null, id, sp.package.id)} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>Sil</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {availPackages.length > 0 && (
            <form action={addPackage} className="od-grid g-3" style={{ gap: 12, alignItems: "end", marginTop: 12 }}>
              <Field label="Paket ekle">
                <Select name="packageId" required defaultValue="">
                  <option value="" disabled>Seçin…</option>
                  {availPackages.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} · {p.type}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Not"><Input name="notes" placeholder="Opsiyonel" /></Field>
              <FormActions><button className="od-btn od-btn-primary od-btn-sm" type="submit">Ata</button></FormActions>
            </form>
          )}

          <hr style={{ margin: "24px 0 16px", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Veliler</h3>
          {s.parents.length === 0 ? (
            <div className="od-muted" style={{ fontSize: 13 }}>Henüz veli bağlı değil.</div>
          ) : (
            <table className="od-table">
              <thead><tr><th>Veli</th><th>Telefon</th><th>İlişki</th><th>Birincil</th><th></th></tr></thead>
              <tbody>
                {s.parents.map((ps) => (
                  <tr key={ps.parent.id}>
                    <td>{ps.parent.fullName}</td>
                    <td className="od-muted">{ps.parent.phone ?? "—"}</td>
                    <td className="od-muted">{ps.relationship ?? "—"}</td>
                    <td>{ps.isPrimary ? "✓" : "—"}</td>
                    <td>
                      <form action={unlinkParentFromStudentAction.bind(null, id, ps.parent.id)} style={{ display: "inline" }}>
                        <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>Bağı Kaldır</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {availParents.length > 0 && (
            <form action={linkParent} className="od-grid g-3" style={{ gap: 12, alignItems: "end", marginTop: 12 }}>
              <Field label="Veli ekle">
                <Select name="parentId" required defaultValue="">
                  <option value="" disabled>Seçin…</option>
                  {availParents.map((p) => (
                    <option key={p.id} value={p.id}>{p.fullName}{p.phone ? ` · ${p.phone}` : ""}</option>
                  ))}
                </Select>
              </Field>
              <Field label="İlişki"><Input name="relationship" placeholder="Anne / Baba / Vasi" /></Field>
              <Field label="Birincil"><label style={{ fontSize: 13 }}><input type="checkbox" name="isPrimary" /> Birincil iletişim</label></Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormActions><button className="od-btn od-btn-primary od-btn-sm" type="submit">Bağla</button></FormActions>
              </div>
            </form>
          )}

          <hr style={{ margin: "24px 0 16px", border: 0, borderTop: "1px solid var(--pd-line)" }} />
          <form action={del}>
            <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>🗑 Öğrenciyi sil</button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
