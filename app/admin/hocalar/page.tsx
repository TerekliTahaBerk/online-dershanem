import Link from "next/link";
import { TeacherStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { teacherStatusLabels, teacherStatusOptions } from "@/lib/admin";
import { updateTeacherAction, createTeacherAccountAction, toggleTeacherAdminAccessAction, deleteTeacherAction } from "./actions";
import { ConfirmFormButton } from "@/components/ui/confirm-form-button";
import { Plus, CalendarDays, ShieldCheck, Trash2, GraduationCap } from "lucide-react";

type TeacherWithRelations = Prisma.TeacherGetPayload<{
  include: {
    _count: { select: { lessons: true } };
    lessons: { take: 1 };
    user: { select: { id: true; email: true; role: true } };
  };
}>;

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    updated?: string;
    edit?: string;
    status?: string;
  }>;
};

export default async function HocalarPage({ searchParams }: Props) {
  const params = await searchParams;
  const updated = params?.updated ?? "";
  const editId = params?.edit ?? "";
  const statusFilter = params?.status ?? "";

  const teachers = await prisma.teacher.findMany({
    where: statusFilter ? { status: statusFilter as TeacherStatus } : undefined,
    orderBy: [{ status: "asc" }, { fullName: "asc" }],
    include: {
      _count: { select: { lessons: true } },
      lessons: {
        where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
        take: 1
      },
      user: { select: { id: true, email: true, role: true } },
    }
  }) as unknown as TeacherWithRelations[];

  const buildUrl = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (statusFilter) p.set("status", statusFilter);
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/admin/hocalar?${p.toString()}`;
  };

  const successMessages: Record<string, string> = {
    created: "Hoca eklendi.",
    "created-linked": "Hoca eklendi ve mevcut kullanıcıya bağlandı.",
    teacher: "Hoca güncellendi.",
    toggle: "Hoca durumu güncellendi.",
    "account-created": "Öğretmen paneli hesabı oluşturuldu.",
    "account-linked": "Mevcut kullanıcı öğretmen kaydına bağlandı.",
    "admin-access": "Admin erişimi güncellendi.",
    deleted: "Hoca silindi.",
  };

  const errorMessages: Record<string, string> = {
    "account-exists": "Bu hoca zaten bir panele bağlı.",
    "email-taken": "Bu e-posta adresi başka bir kullanıcıda kullanılıyor.",
    "account-error": "Hesap oluşturulurken bir hata oluştu.",
    "password-short": "Yeni hesap için en az 6 karakterlik şifre girin.",
  };

  return (
    <>
      <div className="pd-page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="pd-page-title">Hocalar</h1>
            <p className="pd-page-sub">
              {teachers.length} hoca · {teachers.filter((t) => t.status === "ACTIVE").length} aktif
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4 }}>
              <Link
                href="/admin/hocalar"
                className={`pd-btn pd-btn-sm ${!statusFilter ? "pd-btn-accent" : "pd-btn-ghost"}`}
              >
                Tümü
              </Link>
              {teacherStatusOptions.map((s) => (
                <Link
                  key={s}
                  href={buildUrl({ status: s })}
                  className={`pd-btn pd-btn-sm ${statusFilter === s ? "pd-btn-accent" : "pd-btn-ghost"}`}
                >
                  {teacherStatusLabels[s]}
                </Link>
              ))}
            </div>
            <Link href="/admin/hocalar/yeni" className="pd-btn pd-btn-accent pd-btn-sm">
              <Plus size={13} /> Yeni Hoca
            </Link>
          </div>
        </div>
      </div>

      <div className="pd-page-body">
        {successMessages[updated] && (
          <div style={{ background: "#e8f5ef", border: "1px solid #b3dfc7", color: "#0d5c3d", padding: "10px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {successMessages[updated]}
          </div>
        )}
        {errorMessages[updated] && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "10px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {errorMessages[updated]}
          </div>
        )}

        <div className="pd-card" style={{ overflow: "hidden" }}>
          {teachers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px" }}>
              <GraduationCap size={40} style={{ color: "var(--pd-muted-2)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--pd-muted)" }}>Hoca bulunamadı</p>
              <Link href="/admin/hocalar/yeni" style={{ fontSize: 13, color: "var(--pd-accent)", display: "inline-block", marginTop: 8 }}>
                İlk hocayı ekle →
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Hoca</th>
                    <th>İletişim</th>
                    <th>Branşlar</th>
                    <th>Ders</th>
                    <th>Sonraki Ders</th>
                    <th>Durum</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => {
                    const isEditing = editId === teacher.id;
                    const nextLesson = teacher.lessons[0];
                    return (
                      <>
                        <tr key={teacher.id} style={{ background: isEditing ? "var(--pd-accent-soft)" : undefined }}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div className="pd-avatar pd-avatar-sm">{teacher.fullName[0]}</div>
                              <div>
                                <div style={{ fontWeight: 500, color: "var(--pd-ink)" }}>{teacher.fullName}</div>
                                {teacher.user?.role === "ADMIN" && (
                                  <span className="pd-chip" style={{ fontSize: 10, marginTop: 2, display: "inline-flex" }}>
                                    Admin + Öğretmen
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {teacher.email && <div style={{ fontSize: 13, color: "var(--pd-ink-2)" }}>{teacher.email}</div>}
                            {teacher.phone && <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>{teacher.phone}</div>}
                            {!teacher.email && !teacher.phone && <span style={{ color: "var(--pd-muted-2)" }}>—</span>}
                          </td>
                          <td>
                            <span className="pd-chip">{teacher.subjects}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--pd-ink-2)" }}>
                              <CalendarDays size={13} style={{ color: "var(--pd-muted)" }} />
                              {teacher._count.lessons}
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--pd-muted)" }}>
                            {nextLesson ? (
                              <>
                                <div style={{ fontWeight: 500, color: "var(--pd-ink-2)" }}>
                                  {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(nextLesson.scheduledAt))}
                                </div>
                                <div>
                                  {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(nextLesson.scheduledAt))}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: "var(--pd-muted-2)" }}>—</span>
                            )}
                          </td>
                          <td>
                            <span className={teacher.status === "ACTIVE" ? "pd-tag pd-tag-success" : "pd-tag"}>
                              {teacherStatusLabels[teacher.status]}
                            </span>
                          </td>
                          <td>
                            <Link
                              href={isEditing ? buildUrl({ edit: "" }) : buildUrl({ edit: teacher.id })}
                              className="pd-btn pd-btn-ghost pd-btn-sm"
                            >
                              {isEditing ? "Kapat" : "Düzenle"}
                            </Link>
                          </td>
                        </tr>

                        {isEditing && (
                          <tr key={`${teacher.id}-edit`}>
                            <td colSpan={7} style={{ padding: 16, background: "var(--pd-bg-subtle)", borderBottom: "1px solid var(--pd-line)" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                {/* Edit form */}
                                <form action={updateTeacherAction} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                                  <input type="hidden" name="teacherId" value={teacher.id} />
                                  <input type="hidden" name="returnTo" value={buildUrl({ edit: teacher.id })} />

                                  {[
                                    { label: "Ad Soyad", name: "fullName", type: "text", value: teacher.fullName, required: true },
                                    { label: "E-posta", name: "email", type: "email", value: teacher.email ?? "" },
                                    { label: "Telefon", name: "phone", type: "tel", value: teacher.phone ?? "" },
                                    { label: "Branşlar", name: "subjects", type: "text", value: teacher.subjects, required: true },
                                  ].map((field) => (
                                    <div key={field.name}>
                                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>{field.label}</label>
                                      <input
                                        type={field.type}
                                        name={field.name}
                                        defaultValue={field.value}
                                        required={field.required}
                                        style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }}
                                      />
                                    </div>
                                  ))}

                                  <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Durum</label>
                                    <select name="status" defaultValue={teacher.status}
                                      style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }}>
                                      {teacherStatusOptions.map((s) => <option key={s} value={s}>{teacherStatusLabels[s]}</option>)}
                                    </select>
                                  </div>

                                  <div style={{ gridColumn: "1 / -1" }}>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Bio / Açıklama</label>
                                    <textarea name="bio" rows={2} defaultValue={teacher.bio ?? ""}
                                      style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)", resize: "none" }} />
                                  </div>

                                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center" }}>
                                    <button type="submit" className="pd-btn pd-btn-accent pd-btn-sm">Kaydet</button>
                                    <Link href={buildUrl({ edit: "" })} className="pd-btn pd-btn-ghost pd-btn-sm">İptal</Link>
                                    <div style={{ marginLeft: "auto" }}>
                                      <ConfirmFormButton
                                        action={deleteTeacherAction}
                                        title="Hocayı sil"
                                        description={`${teacher.fullName} kaydını silersen öğretmen profili kaldırılır. Bu işlem geri alınamaz.`}
                                        confirmLabel="Hocayı sil"
                                        cancelLabel="Vazgeç"
                                        hiddenFields={[{ name: "teacherId", value: teacher.id }]}
                                        className="pd-btn pd-btn-sm"
                                        style={{ background: "var(--pd-bg-elevated)", border: "1px solid #fca5a5", color: "#b42318" }}
                                      >
                                        <Trash2 size={13} /> Sil
                                      </ConfirmFormButton>
                                    </div>
                                  </div>
                                </form>

                                {/* Panel access */}
                                <div style={{ borderTop: "1px solid var(--pd-line)", paddingTop: 16 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                    <ShieldCheck size={14} style={{ color: "var(--pd-accent)" }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--pd-ink-2)" }}>Öğretmen Paneli Erişimi</span>
                                  </div>
                                  {teacher.user ? (
                                    <div style={{ background: "var(--pd-accent-soft)", border: "1px solid var(--pd-accent)", borderRadius: 10, padding: "12px 14px" }}>
                                      <div style={{ fontSize: 13, color: "var(--pd-accent)", marginBottom: 8 }}>
                                        Panel hesabı mevcut: <strong>{teacher.user.email}</strong>
                                      </div>
                                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <span className={teacher.user.role === "ADMIN" ? "pd-chip pd-chip-accent" : "pd-chip"}>
                                          {teacher.user.role === "ADMIN" ? "Admin erişimi açık" : "Sadece öğretmen"}
                                        </span>
                                        <form action={toggleTeacherAdminAccessAction} style={{ display: "inline" }}>
                                          <input type="hidden" name="teacherId" value={teacher.id} />
                                          <input type="hidden" name="userId" value={teacher.user.id} />
                                          <input type="hidden" name="currentValue" value={teacher.user.role === "ADMIN" ? "true" : "false"} />
                                          <button type="submit" className="pd-btn pd-btn-ghost pd-btn-sm">
                                            {teacher.user.role === "ADMIN" ? "Admin erişimini kapat" : "Admin erişimi ver"}
                                          </button>
                                        </form>
                                      </div>
                                    </div>
                                  ) : (
                                    <form action={createTeacherAccountAction} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                                      <input type="hidden" name="teacherId" value={teacher.id} />
                                      <input type="hidden" name="name" value={teacher.fullName} />
                                      <div>
                                        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Giriş E-postası</label>
                                        <input type="email" name="email" required defaultValue={teacher.email ?? ""}
                                          style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }} />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Şifre</label>
                                        <input type="text" name="password" minLength={6}
                                          style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }} />
                                      </div>
                                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--pd-ink-2)", alignSelf: "end", paddingBottom: 8 }}>
                                        <input type="checkbox" name="grantAdminAccess" style={{ accentColor: "var(--pd-accent)" }} />
                                        Admin erişimi ver
                                      </label>
                                      <div style={{ alignSelf: "end" }}>
                                        <button type="submit" className="pd-btn pd-btn-accent pd-btn-sm" style={{ width: "100%" }}>
                                          Hesap Oluştur
                                        </button>
                                      </div>
                                    </form>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
