import Link from "next/link";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { Prisma, IntakeStatus } from "@prisma/client";
import { Plus, Filter } from "lucide-react";

type LeadWithStudent = Prisma.LeadSubmissionGetPayload<{
  include: { student: { select: { id: true; fullName: true } } };
}>;
import { prisma } from "@/lib/prisma";
import {
  formatDateTime,
  formatDateTimeLocalInput,
  intakeStatusLabels,
  intakeStatusOptions,
  buildWhatsAppLink
} from "@/lib/admin";
import { updateLeadAction, deleteLeadAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    q?: string;
    intakeStatus?: string;
    tasks?: string;
    updated?: string;
    edit?: string;
    page?: string;
  }>;
};

function buildWhere(f: { q: string; intakeStatus: string; tasks: string }): Prisma.LeadSubmissionWhereInput | undefined {
  const conditions: Prisma.LeadSubmissionWhereInput[] = [];
  if (f.q) {
    conditions.push({
      OR: [
        { fullName: { contains: f.q, mode: "insensitive" } },
        { phone: { contains: f.q, mode: "insensitive" } },
        { classLevel: { contains: f.q, mode: "insensitive" } },
        { examType: { contains: f.q, mode: "insensitive" } }
      ]
    });
  }
  if (f.intakeStatus) conditions.push({ intakeStatus: f.intakeStatus as IntakeStatus });
  if (f.tasks === "1") conditions.push({ nextActionAt: { not: null } });
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}

const STATUS_STYLE: Record<IntakeStatus, string> = {
  NEW: "pd-tag",
  REVIEWING: "pd-tag pd-tag-info",
  CONTACTED: "pd-tag pd-tag-warning",
  ENROLLED: "pd-tag pd-tag-success",
  ARCHIVED: "pd-tag"
};

export default async function FormlarPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params?.q ?? "";
  const intakeStatus = params?.intakeStatus ?? "";
  const tasks = params?.tasks ?? "";
  const updated = params?.updated ?? "";
  const editId = params?.edit ?? "";
  const page = Math.max(0, parseInt(params?.page ?? "0", 10));
  const PAGE_SIZE = 30;

  const filters = { q, intakeStatus, tasks };
  const where = buildWhere(filters);

  const [leads, total] = await Promise.all([
    prisma.leadSubmission.findMany({
      where,
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: [{ nextActionAt: "asc" }, { submittedAt: "desc" }],
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE
    }) as unknown as LeadWithStudent[],
    prisma.leadSubmission.count({ where })
  ]);

  const newCount = leads.filter((l) => l.intakeStatus === "NEW").length;

  const buildUrl = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (intakeStatus) p.set("intakeStatus", intakeStatus);
    if (tasks) p.set("tasks", tasks);
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/admin/formlar?${p.toString()}`;
  };

  return (
    <>
      <div className="pd-page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="pd-page-title">Lead Inbox</h1>
            <p className="pd-page-sub">
              {total} başvuru · {newCount > 0 && `${newCount} yeni`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <form method="GET" action="/admin/formlar" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div className="pd-input-search">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--pd-muted-2)", flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input type="text" name="q" defaultValue={q} placeholder="İsim, telefon..." />
              </div>
              <select
                name="intakeStatus"
                defaultValue={intakeStatus}
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
                {intakeStatusOptions.map((s) => (
                  <option key={s} value={s}>{intakeStatusLabels[s]}</option>
                ))}
              </select>
              <button type="submit" className="pd-btn pd-btn-ghost pd-btn-sm">
                <Filter size={13} /> Filtrele
              </button>
              {(q || intakeStatus || tasks) && (
                <Link href="/admin/formlar" className="pd-btn pd-btn-ghost pd-btn-sm">
                  Temizle
                </Link>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className="pd-page-body">
        {updated === "lead" && (
          <div
            style={{
              background: "#e8f5ef",
              border: "1px solid #b3dfc7",
              color: "#0d5c3d",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16
            }}
          >
            Form güncellendi.
          </div>
        )}

        <div className="pd-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Başvuran</th>
                  <th>Sınav / Sınıf</th>
                  <th>Kaynak</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th>Öğrenci</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "var(--pd-muted)" }}>
                      Form başvurusu bulunamadı.
                    </td>
                  </tr>
                )}
                {leads.map((lead) => {
                  const isEditing = editId === lead.id;
                  const waLink = buildWhatsAppLink(lead.phone);
                  return (
                    <>
                      <tr
                        key={lead.id}
                        style={{ background: isEditing ? "var(--pd-accent-soft)" : undefined }}
                      >
                        <td>
                          <div style={{ fontWeight: 500, color: "var(--pd-ink)" }}>{lead.fullName}</div>
                          {waLink ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, color: "var(--pd-accent)" }}
                            >
                              {lead.phone}
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--pd-muted)" }}>{lead.phone}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: 13 }}>{lead.examType}</div>
                          <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>{lead.classLevel}</div>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--pd-muted)" }}>{lead.source}</td>
                        <td>
                          <span className={STATUS_STYLE[lead.intakeStatus]}>
                            {intakeStatusLabels[lead.intakeStatus]}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--pd-muted)" }}>
                          {formatDateTime(lead.submittedAt)}
                        </td>
                        <td>
                          {lead.student ? (
                            <Link
                              href={`/admin/ogrenciler/${lead.student.id}`}
                              style={{ fontSize: 12, color: "var(--pd-accent)" }}
                            >
                              {lead.student.fullName}
                            </Link>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>Eşleşmedi</span>
                          )}
                        </td>
                        <td>
                          <Link
                            href={isEditing ? buildUrl({ edit: "" }) : buildUrl({ edit: lead.id })}
                            className="pd-btn pd-btn-ghost pd-btn-sm"
                          >
                            {isEditing ? "Kapat" : "Düzenle"}
                          </Link>
                        </td>
                      </tr>

                      {isEditing && (
                        <tr key={`${lead.id}-edit`}>
                          <td
                            colSpan={7}
                            style={{
                              padding: "16px",
                              background: "var(--pd-bg-subtle)",
                              borderBottom: "1px solid var(--pd-line)"
                            }}
                          >
                            <form action={updateLeadAction} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                              <input type="hidden" name="leadId" value={lead.id} />
                              <input type="hidden" name="returnTo" value={buildUrl({ edit: lead.id })} />

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>
                                  Durum
                                </label>
                                <select
                                  name="intakeStatus"
                                  defaultValue={lead.intakeStatus}
                                  style={{
                                    width: "100%",
                                    border: "1px solid var(--pd-line)",
                                    borderRadius: 8,
                                    padding: "8px 10px",
                                    fontSize: 13,
                                    background: "var(--pd-bg-elevated)"
                                  }}
                                >
                                  {intakeStatusOptions.map((s) => (
                                    <option key={s} value={s}>{intakeStatusLabels[s]}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>
                                  Görev Etiketi
                                </label>
                                <input
                                  type="text"
                                  name="taskLabel"
                                  defaultValue={lead.taskLabel ?? ""}
                                  style={{
                                    width: "100%",
                                    border: "1px solid var(--pd-line)",
                                    borderRadius: 8,
                                    padding: "8px 10px",
                                    fontSize: 13,
                                    background: "var(--pd-bg-elevated)"
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>
                                  Sonraki Eylem
                                </label>
                                <input
                                  type="datetime-local"
                                  name="nextActionAt"
                                  defaultValue={formatDateTimeLocalInput(lead.nextActionAt)}
                                  style={{
                                    width: "100%",
                                    border: "1px solid var(--pd-line)",
                                    borderRadius: 8,
                                    padding: "8px 10px",
                                    fontSize: 13,
                                    background: "var(--pd-bg-elevated)"
                                  }}
                                />
                              </div>

                              <div style={{ gridColumn: "1 / -1" }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>
                                  Admin Notları
                                </label>
                                <textarea
                                  name="adminNotes"
                                  defaultValue={lead.adminNotes ?? ""}
                                  rows={2}
                                  style={{
                                    width: "100%",
                                    border: "1px solid var(--pd-line)",
                                    borderRadius: 8,
                                    padding: "8px 10px",
                                    fontSize: 13,
                                    background: "var(--pd-bg-elevated)",
                                    resize: "none"
                                  }}
                                />
                              </div>

                              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center" }}>
                                <button type="submit" className="pd-btn pd-btn-accent pd-btn-sm">
                                  Kaydet
                                </button>
                                <Link href={buildUrl({ edit: "" })} className="pd-btn pd-btn-ghost pd-btn-sm">
                                  İptal
                                </Link>
                                <div style={{ marginLeft: "auto" }}>
                                  <ConfirmDeleteButton
                                    action={deleteLeadAction}
                                    hiddenFields={{ leadId: lead.id, returnTo: buildUrl({ edit: "" }) }}
                                    message="Bu formu kalıcı olarak silmek istediğinizden emin misiniz?"
                                    className="pd-btn pd-btn-sm pd-btn-danger"
                                  >
                                    Sil
                                  </ConfirmDeleteButton>
                                </div>
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderTop: "1px solid var(--pd-line)",
                fontSize: 12,
                color: "var(--pd-muted)"
              }}
            >
              <span>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {page > 0 && (
                  <Link href={buildUrl({ page: String(page - 1) })} className="pd-btn pd-btn-ghost pd-btn-sm">
                    Önceki
                  </Link>
                )}
                {(page + 1) * PAGE_SIZE < total && (
                  <Link href={buildUrl({ page: String(page + 1) })} className="pd-btn pd-btn-ghost pd-btn-sm">
                    Sonraki
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
