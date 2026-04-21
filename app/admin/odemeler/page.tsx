import Link from "next/link";
import { Prisma, IntakeStatus, PurchaseStatus } from "@prisma/client";
import { Filter } from "lucide-react";

type PurchaseWithRelations = Prisma.PurchaseIntentGetPayload<{
  include: {
    events: { take: 3 };
    student: { select: { id: true; fullName: true } };
  };
}>;
import { prisma } from "@/lib/prisma";
import {
  formatDateTime,
  formatDateTimeLocalInput,
  intakeStatusLabels,
  intakeStatusOptions,
  purchaseStatusLabels,
  purchaseStatusOptions,
  buildWhatsAppLink
} from "@/lib/admin";
import { updatePurchaseAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    q?: string;
    intakeStatus?: string;
    purchaseStatus?: string;
    tasks?: string;
    updated?: string;
    edit?: string;
    page?: string;
  }>;
};

function buildWhere(f: { q: string; intakeStatus: string; purchaseStatus: string; tasks: string }): Prisma.PurchaseIntentWhereInput | undefined {
  const conditions: Prisma.PurchaseIntentWhereInput[] = [];
  if (f.q) {
    conditions.push({
      OR: [
        { studentFullName: { contains: f.q, mode: "insensitive" } },
        { studentPhone: { contains: f.q, mode: "insensitive" } },
        { packageName: { contains: f.q, mode: "insensitive" } }
      ]
    });
  }
  if (f.intakeStatus) conditions.push({ intakeStatus: f.intakeStatus as IntakeStatus });
  if (f.purchaseStatus) conditions.push({ status: f.purchaseStatus as PurchaseStatus });
  if (f.tasks === "1") conditions.push({ nextActionAt: { not: null } });
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}

const PURCHASE_STYLE: Record<PurchaseStatus, string> = {
  PENDING: "pd-tag pd-tag-warning",
  PAID: "pd-tag pd-tag-success",
  FAILED: "pd-tag pd-tag-danger",
};

const INTAKE_STYLE: Record<IntakeStatus, string> = {
  NEW: "pd-tag",
  REVIEWING: "pd-tag pd-tag-info",
  CONTACTED: "pd-tag pd-tag-warning",
  ENROLLED: "pd-tag pd-tag-success",
  ARCHIVED: "pd-tag",
};

export default async function OdemelerPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params?.q ?? "";
  const intakeStatus = params?.intakeStatus ?? "";
  const purchaseStatus = params?.purchaseStatus ?? "";
  const tasks = params?.tasks ?? "";
  const updated = params?.updated ?? "";
  const editId = params?.edit ?? "";
  const page = Math.max(0, parseInt(params?.page ?? "0", 10));
  const PAGE_SIZE = 30;

  const filters = { q, intakeStatus, purchaseStatus, tasks };
  const where = buildWhere(filters);

  const [purchases, total] = await Promise.all([
    prisma.purchaseIntent.findMany({
      where,
      include: {
        events: { orderBy: { createdAt: "desc" }, take: 3 },
        student: { select: { id: true, fullName: true } }
      },
      orderBy: [{ nextActionAt: "asc" }, { submittedAt: "desc" }],
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE
    }) as unknown as PurchaseWithRelations[],
    prisma.purchaseIntent.count({ where })
  ]);

  const buildUrl = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (intakeStatus) p.set("intakeStatus", intakeStatus);
    if (purchaseStatus) p.set("purchaseStatus", purchaseStatus);
    if (tasks) p.set("tasks", tasks);
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/admin/odemeler?${p.toString()}`;
  };

  return (
    <>
      <div className="pd-page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="pd-page-title">Ödemeler</h1>
            <p className="pd-page-sub">{total.toLocaleString("tr-TR")} kayıt</p>
          </div>
          <form method="GET" action="/admin/odemeler" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="pd-input-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--pd-muted-2)", flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input type="text" name="q" defaultValue={q} placeholder="İsim, telefon, paket..." />
            </div>
            <select name="intakeStatus" defaultValue={intakeStatus}
              style={{ border: "1px solid var(--pd-line)", borderRadius: 8, padding: "7px 10px", fontSize: 13, background: "var(--pd-bg-elevated)", color: "var(--pd-ink-2)" }}>
              <option value="">Tüm Süreç</option>
              {intakeStatusOptions.map((s) => <option key={s} value={s}>{intakeStatusLabels[s]}</option>)}
            </select>
            <select name="purchaseStatus" defaultValue={purchaseStatus}
              style={{ border: "1px solid var(--pd-line)", borderRadius: 8, padding: "7px 10px", fontSize: 13, background: "var(--pd-bg-elevated)", color: "var(--pd-ink-2)" }}>
              <option value="">Tüm Ödeme</option>
              {purchaseStatusOptions.map((s) => <option key={s} value={s}>{purchaseStatusLabels[s]}</option>)}
            </select>
            <button type="submit" className="pd-btn pd-btn-ghost pd-btn-sm">
              <Filter size={13} /> Filtrele
            </button>
            {(q || intakeStatus || purchaseStatus || tasks) && (
              <Link href="/admin/odemeler" className="pd-btn pd-btn-ghost pd-btn-sm">Temizle</Link>
            )}
          </form>
        </div>
      </div>

      <div className="pd-page-body">
        {updated === "purchase" && (
          <div style={{ background: "#e8f5ef", border: "1px solid #b3dfc7", color: "#0d5c3d", padding: "10px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            Ödeme kaydı güncellendi.
          </div>
        )}

        <div className="pd-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>Paket</th>
                  <th>Süreç</th>
                  <th>Ödeme</th>
                  <th>Tarih</th>
                  <th>Görev</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "var(--pd-muted)" }}>
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
                {purchases.map((purchase) => {
                  const isEditing = editId === purchase.id;
                  const waLink = buildWhatsAppLink(purchase.studentPhone);
                  const isOverdue = purchase.nextActionAt && new Date(purchase.nextActionAt) < new Date();
                  return (
                    <>
                      <tr key={purchase.id} style={{ background: isEditing ? "var(--pd-accent-soft)" : undefined }}>
                        <td>
                          <div style={{ fontWeight: 500, color: "var(--pd-ink)" }}>{purchase.studentFullName}</div>
                          {waLink ? (
                            <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--pd-accent)" }}>
                              {purchase.studentPhone}
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--pd-muted)" }}>{purchase.studentPhone}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--pd-ink-2)" }}>{purchase.packageName}</div>
                          {purchase.paymentLink && (
                            <a href={purchase.paymentLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--pd-accent)" }}>
                              Ödeme Linki ↗
                            </a>
                          )}
                        </td>
                        <td><span className={INTAKE_STYLE[purchase.intakeStatus]}>{intakeStatusLabels[purchase.intakeStatus]}</span></td>
                        <td><span className={PURCHASE_STYLE[purchase.status]}>{purchaseStatusLabels[purchase.status]}</span></td>
                        <td style={{ fontSize: 12, color: "var(--pd-muted)" }}>{formatDateTime(purchase.submittedAt)}</td>
                        <td style={{ fontSize: 12 }}>
                          {purchase.taskLabel && <div style={{ fontWeight: 500, color: "var(--pd-ink-2)", marginBottom: 2 }}>{purchase.taskLabel}</div>}
                          {purchase.nextActionAt ? (
                            <span style={{ color: isOverdue ? "#b91c1c" : "var(--pd-muted)", fontWeight: isOverdue ? 600 : undefined }}>
                              {formatDateTime(purchase.nextActionAt)}
                            </span>
                          ) : (
                            <span style={{ color: "var(--pd-muted-2)" }}>—</span>
                          )}
                        </td>
                        <td>
                          <Link
                            href={isEditing ? buildUrl({ edit: "" }) : buildUrl({ edit: purchase.id })}
                            className="pd-btn pd-btn-ghost pd-btn-sm"
                          >
                            {isEditing ? "Kapat" : "Düzenle"}
                          </Link>
                        </td>
                      </tr>

                      {isEditing && (
                        <tr key={`${purchase.id}-edit`}>
                          <td colSpan={7} style={{ padding: 16, background: "var(--pd-bg-subtle)", borderBottom: "1px solid var(--pd-line)" }}>
                            <form action={updatePurchaseAction} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                              <input type="hidden" name="purchaseId" value={purchase.id} />
                              <input type="hidden" name="linkedStudentId" value={purchase.student?.id ?? ""} />
                              <input type="hidden" name="returnTo" value={buildUrl({ edit: purchase.id })} />

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Süreç Durumu</label>
                                <select name="intakeStatus" defaultValue={purchase.intakeStatus}
                                  style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }}>
                                  {intakeStatusOptions.map((s) => <option key={s} value={s}>{intakeStatusLabels[s]}</option>)}
                                </select>
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Ödeme Durumu</label>
                                <select name="status" defaultValue={purchase.status}
                                  style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }}>
                                  {purchaseStatusOptions.map((s) => <option key={s} value={s}>{purchaseStatusLabels[s]}</option>)}
                                </select>
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Paket Adı</label>
                                <input type="text" name="packageName" defaultValue={purchase.packageName}
                                  style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }} />
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Görev Etiketi</label>
                                <input type="text" name="taskLabel" defaultValue={purchase.taskLabel ?? ""}
                                  style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }} />
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Sonraki Eylem</label>
                                <input type="datetime-local" name="nextActionAt" defaultValue={formatDateTimeLocalInput(purchase.nextActionAt)}
                                  style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)" }} />
                              </div>

                              <div style={{ gridColumn: "2 / -1" }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", display: "block", marginBottom: 5 }}>Admin Notları</label>
                                <textarea name="adminNotes" defaultValue={purchase.adminNotes ?? ""} rows={2}
                                  style={{ width: "100%", border: "1px solid var(--pd-line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--pd-bg-elevated)", resize: "none" }} />
                              </div>

                              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
                                <button type="submit" className="pd-btn pd-btn-accent pd-btn-sm">Kaydet</button>
                                <Link href={buildUrl({ edit: "" })} className="pd-btn pd-btn-ghost pd-btn-sm">İptal</Link>
                              </div>
                            </form>

                            {purchase.events.length > 0 && (
                              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--pd-line)" }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", marginBottom: 8 }}>Son Olaylar</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {purchase.events.map((event) => (
                                    <div key={event.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                                      <span style={{ color: "var(--pd-muted)" }}>{formatDateTime(event.createdAt)}</span>
                                      <span style={{ color: "var(--pd-ink-2)" }}>{event.eventType.replace(/_/g, " ")}</span>
                                      <span className={event.status === "PAID" ? "pd-tag pd-tag-success" : event.status === "FAILED" ? "pd-tag pd-tag-danger" : "pd-tag"} style={{ fontSize: 10 }}>
                                        {event.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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
                {page > 0 && <Link href={buildUrl({ page: String(page - 1) })} className="pd-btn pd-btn-ghost pd-btn-sm">Önceki</Link>}
                {(page + 1) * PAGE_SIZE < total && <Link href={buildUrl({ page: String(page + 1) })} className="pd-btn pd-btn-ghost pd-btn-sm">Sonraki</Link>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
