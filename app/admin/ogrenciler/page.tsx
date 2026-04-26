import Link from "next/link";
import { Prisma, StudentStatus } from "@prisma/client";
import { Plus, Filter } from "lucide-react";

type StudentWithNextLesson = Prisma.StudentGetPayload<{
  include: { lessons: { take: 1 } };
}>;
import { prisma } from "@/lib/prisma";
import {
  buildWhatsAppLink,
  formatDateTime,
  formatDateTimeLocalInput,
  studentStatusLabels,
  studentStatusOptions
} from "@/lib/admin";
import { updateStudentAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    q?: string;
    studentStatus?: string;
    tasks?: string;
    updated?: string;
    edit?: string;
    page?: string;
  }>;
};

function buildWhere(filters: { q: string; studentStatus: string; tasks: string }): Prisma.StudentWhereInput | undefined {
  const conditions: Prisma.StudentWhereInput[] = [];
  if (filters.q) {
    conditions.push({
      OR: [
        { fullName: { contains: filters.q, mode: "insensitive" } },
        { phone: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
        { schoolName: { contains: filters.q, mode: "insensitive" } },
        { activePackage: { contains: filters.q, mode: "insensitive" } }
      ]
    });
  }
  if (filters.studentStatus) conditions.push({ status: filters.studentStatus as StudentStatus });
  if (filters.tasks === "1") conditions.push({ nextActionAt: { not: null } });
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}

const STATUS_STYLE: Record<StudentStatus, string> = {
  NEW: "pd-tag",
  FOLLOW_UP: "pd-tag pd-tag-warning",
  ACTIVE: "pd-tag pd-tag-success",
  AT_RISK: "pd-tag pd-tag-danger",
  COMPLETED: "pd-tag pd-tag-info",
  INACTIVE: "pd-tag",
};

export default async function OgrencilerPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params?.q ?? "";
  const studentStatus = params?.studentStatus ?? "";
  const tasks = params?.tasks ?? "";
  const updated = params?.updated ?? "";
  const editId = params?.edit ?? "";
  const page = Math.max(0, parseInt(params?.page ?? "0", 10));
  const PAGE_SIZE = 30;

  const filters = { q, studentStatus, tasks };
  const where = buildWhere(filters);

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        lessons: {
          where: { status: "SCHEDULED" },
          orderBy: { scheduledAt: "asc" },
          take: 1
        }
      },
      orderBy: [{ nextActionAt: "asc" }, { status: "asc" }, { updatedAt: "desc" }],
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE
    }) as unknown as StudentWithNextLesson[],
    prisma.student.count({ where })
  ]);

  const buildUrl = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (studentStatus) p.set("studentStatus", studentStatus);
    if (tasks) p.set("tasks", tasks);
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/admin/ogrenciler?${p.toString()}`;
  };

  return (
    <>
      <div className="pd-page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="pd-page-title">Öğrenciler</h1>
            <p className="pd-page-sub">{total.toLocaleString("tr-TR")} öğrenci</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <form method="GET" action="/admin/ogrenciler" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div className="pd-input-search">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--pd-muted-2)", flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input type="text" name="q" defaultValue={q} placeholder="İsim, telefon, okul..." />
              </div>
              <select
                name="studentStatus"
                defaultValue={studentStatus}
                style={{
                  border: "1px solid var(--pd-line)",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 13,
                  background: "var(--pd-bg-elevated)",
                  color: "var(--pd-ink-2)"
                }}
              >
                <option value="">Tüm Durumlar</option>
                {studentStatusOptions.map((s) => (
                  <option key={s} value={s}>{studentStatusLabels[s]}</option>
                ))}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--pd-ink-2)", cursor: "pointer" }}>
                <input type="checkbox" name="tasks" value="1" defaultChecked={tasks === "1"} style={{ accentColor: "var(--pd-accent)" }} />
                Görevli
              </label>
              <button type="submit" className="pd-btn pd-btn-ghost pd-btn-sm">
                <Filter size={13} /> Filtrele
              </button>
              {(q || studentStatus || tasks) && (
                <Link href="/admin/ogrenciler" className="pd-btn pd-btn-ghost pd-btn-sm">Temizle</Link>
              )}
            </form>
            <Link href="/admin/ogrenciler/yeni" className="pd-btn pd-btn-accent pd-btn-sm">
              <Plus size={13} /> Yeni Öğrenci
            </Link>
          </div>
        </div>
      </div>

      <div className="pd-page-body">
        {updated === "student" && (
          <div style={{ background: "#e8f5ef", border: "1px solid #b3dfc7", color: "#0d5c3d", padding: "10px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            Öğrenci güncellendi.
          </div>
        )}
        {updated === "student-error" && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "10px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            Güncelleme başarısız.
          </div>
        )}

        <div className="pd-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>İletişim</th>
                  <th>Sınav / Sınıf</th>
                  <th>Paket</th>
                  <th>Durum</th>
                  <th>Sonraki Görev</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "var(--pd-muted)" }}>
                      Öğrenci bulunamadı.
                    </td>
                  </tr>
                )}
                {students.map((student) => {
                  const waLink = buildWhatsAppLink(student.phone);
                  const isEditing = editId === student.id;
                  const isOverdue = student.nextActionAt && new Date(student.nextActionAt) < new Date();
                  return (
                    <>
                      <tr
                        key={student.id}
                        style={{ background: isEditing ? "var(--pd-accent-soft)" : undefined }}
                      >
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="pd-avatar pd-avatar-sm">{student.fullName[0]}</div>
                            <div>
                              <Link
                                href={`/admin/ogrenciler/${student.id}`}
                                style={{ fontWeight: 500, color: "var(--pd-ink)", textDecoration: "none" }}
                              >
                                {student.fullName}
                              </Link>
                              {student.city && (
                                <div style={{ fontSize: 11, color: "var(--pd-muted)", marginTop: 1 }}>{student.city}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {waLink ? (
                            <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--pd-accent)" }}>
                              {student.phone}
                            </a>
                          ) : (
                            <span style={{ fontSize: 13, color: "var(--pd-ink-2)" }}>{student.phone}</span>
                          )}
                          {student.email && (
                            <div style={{ fontSize: 11, color: "var(--pd-muted)", marginTop: 1, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {student.email}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: 13 }}>{student.examType ?? "—"}</div>
                          {student.classLevel && <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>{student.classLevel}</div>}
                        </td>
                        <td style={{ fontSize: 13, color: "var(--pd-ink-2)" }}>
                          {student.activePackage ?? <span style={{ color: "var(--pd-muted-2)" }}>—</span>}
                        </td>
                        <td>
                          <span className={STATUS_STYLE[student.status]}>
                            {studentStatusLabels[student.status]}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {student.taskLabel && (
                            <div style={{ fontWeight: 500, color: "var(--pd-ink-2)", marginBottom: 2 }}>{student.taskLabel}</div>
                          )}
                          {student.nextActionAt ? (
                            <span style={{ color: isOverdue ? "#b91c1c" : "var(--pd-muted)", fontWeight: isOverdue ? 600 : undefined }}>
                              {formatDateTime(student.nextActionAt)}
                            </span>
                          ) : (
                            <span style={{ color: "var(--pd-muted-2)" }}>—</span>
                          )}
                        </td>
                        <td>
                          <Link
                            href={isEditing ? buildUrl({ edit: "" }) : buildUrl({ edit: student.id })}
                            className="pd-btn pd-btn-ghost pd-btn-sm"
                          >
                            {isEditing ? "Kapat" : "Düzenle"}
                          </Link>
                        </td>
                      </tr>

                      {isEditing && (
                        <tr key={`${student.id}-edit`}>
                          <td
                            colSpan={7}
                            style={{
                              padding: 16,
                              background: "var(--pd-bg-subtle)",
                              borderBottom: "1px solid var(--pd-line)"
                            }}
                          >
                            <form action={updateStudentAction} className="pd-student-edit-grid">
                              <input type="hidden" name="studentId" value={student.id} />
                              <input type="hidden" name="returnTo" value={buildUrl({ edit: student.id })} />

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Durum</label>
                                <select
                                  name="status"
                                  defaultValue={student.status}
                                  style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }}
                                >
                                  {studentStatusOptions.map((s) => (
                                    <option key={s} value={s}>{studentStatusLabels[s]}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Aktif Paket</label>
                                <input
                                  type="text"
                                  name="activePackage"
                                  defaultValue={student.activePackage ?? ""}
                                  style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Görev Etiketi</label>
                                <input
                                  type="text"
                                  name="taskLabel"
                                  defaultValue={student.taskLabel ?? ""}
                                  style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Sonraki Eylem</label>
                                <input
                                  type="datetime-local"
                                  name="nextActionAt"
                                  defaultValue={formatDateTimeLocalInput(student.nextActionAt)}
                                  style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }}
                                />
                              </div>

                              <div style={{ gridColumn: "1 / -1" }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Notlar</label>
                                <textarea
                                  name="notes"
                                  defaultValue={student.notes ?? ""}
                                  rows={2}
                                  style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)", resize: "none" }}
                                />
                              </div>

                              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
                                <button type="submit" className="pd-btn pd-btn-accent pd-btn-sm">Kaydet</button>
                                <Link href={buildUrl({ edit: "" })} className="pd-btn pd-btn-ghost pd-btn-sm">İptal</Link>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {total > PAGE_SIZE && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--pd-line)", fontSize: 12, color: "var(--pd-muted)" }}>
              <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {page > 0 && (
                  <Link href={buildUrl({ page: String(page - 1) })} className="pd-btn pd-btn-ghost pd-btn-sm">Önceki</Link>
                )}
                {(page + 1) * PAGE_SIZE < total && (
                  <Link href={buildUrl({ page: String(page + 1) })} className="pd-btn pd-btn-ghost pd-btn-sm">Sonraki</Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
