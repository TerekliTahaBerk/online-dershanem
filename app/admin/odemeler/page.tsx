import Link from "next/link";
import { Prisma, IntakeStatus, PurchaseStatus } from "@prisma/client";

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

const PURCHASE_STATUS_COLORS: Record<PurchaseStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200"
};

const INTAKE_STATUS_COLORS: Record<IntakeStatus, string> = {
  NEW: "bg-gray-100 text-gray-600",
  REVIEWING: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-violet-50 text-violet-700",
  ENROLLED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-gray-100 text-gray-400"
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
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#091413]">Ödemeler</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString("tr-TR")} kayıt bulundu</p>
      </div>

      {/* Flash */}
      {updated === "purchase" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-lg">
          Ödeme kaydı güncellendi.
        </div>
      )}

      {/* Filters */}
      <form method="GET" action="/admin/odemeler" className="flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="İsim, telefon, paket..."
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 focus:border-[#408A71]"
        />
        <select
          name="intakeStatus"
          defaultValue={intakeStatus}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#408A71]/30"
        >
          <option value="">Tüm Süreç</option>
          {intakeStatusOptions.map((s) => (
            <option key={s} value={s}>{intakeStatusLabels[s]}</option>
          ))}
        </select>
        <select
          name="purchaseStatus"
          defaultValue={purchaseStatus}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#408A71]/30"
        >
          <option value="">Tüm Ödeme Durumu</option>
          {purchaseStatusOptions.map((s) => (
            <option key={s} value={s}>{purchaseStatusLabels[s]}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white cursor-pointer">
          <input type="checkbox" name="tasks" value="1" defaultChecked={tasks === "1"} className="accent-[#408A71]" />
          Görevli
        </label>
        <button
          type="submit"
          className="bg-[#408A71] hover:bg-[#285A48] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Filtrele
        </button>
        {(q || intakeStatus || purchaseStatus || tasks) && (
          <Link href="/admin/odemeler" className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2">
            Temizle
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Öğrenci</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Paket</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Süreç</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ödeme</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Görev</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
              {purchases.map((purchase) => {
                const isEditing = editId === purchase.id;
                const waLink = buildWhatsAppLink(purchase.studentPhone);
                return (
                  <>
                    <tr key={purchase.id} className={`hover:bg-gray-50 transition-colors ${isEditing ? "bg-[#B0E4CC]/10" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#091413]">{purchase.studentFullName}</p>
                        {waLink ? (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-xs text-[#408A71] hover:underline">
                            {purchase.studentPhone}
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400">{purchase.studentPhone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-700">{purchase.packageName}</p>
                        {purchase.paymentLink && (
                          <a
                            href={purchase.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Ödeme Linki ↗
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${INTAKE_STATUS_COLORS[purchase.intakeStatus]}`}>
                          {intakeStatusLabels[purchase.intakeStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${PURCHASE_STATUS_COLORS[purchase.status]}`}>
                          {purchaseStatusLabels[purchase.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(purchase.submittedAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {purchase.taskLabel && <p className="font-medium text-gray-700 mb-0.5">{purchase.taskLabel}</p>}
                        {purchase.nextActionAt ? (
                          <span className={new Date(purchase.nextActionAt) < new Date() ? "text-red-600 font-medium" : ""}>
                            {formatDateTime(purchase.nextActionAt)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={isEditing ? buildUrl({ edit: "" }) : buildUrl({ edit: purchase.id })}
                          className="text-xs text-[#408A71] hover:text-[#285A48] font-medium border border-[#408A71]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#B0E4CC]/20 transition-colors"
                        >
                          {isEditing ? "Kapat" : "Düzenle"}
                        </Link>
                      </td>
                    </tr>

                    {/* Inline edit */}
                    {isEditing && (
                      <tr key={`${purchase.id}-edit`}>
                        <td colSpan={7} className="px-4 py-4 bg-[#B0E4CC]/5 border-b border-[#B0E4CC]/30">
                          <form action={updatePurchaseAction} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <input type="hidden" name="purchaseId" value={purchase.id} />
                            <input type="hidden" name="linkedStudentId" value={purchase.student?.id ?? ""} />
                            <input type="hidden" name="returnTo" value={buildUrl({ edit: purchase.id })} />

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Süreç Durumu</label>
                              <select name="intakeStatus" defaultValue={purchase.intakeStatus}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#408A71]/30">
                                {intakeStatusOptions.map((s) => (
                                  <option key={s} value={s}>{intakeStatusLabels[s]}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Ödeme Durumu</label>
                              <select name="status" defaultValue={purchase.status}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#408A71]/30">
                                {purchaseStatusOptions.map((s) => (
                                  <option key={s} value={s}>{purchaseStatusLabels[s]}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Paket Adı</label>
                              <input type="text" name="packageName" defaultValue={purchase.packageName}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30" />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Görev Etiketi</label>
                              <input type="text" name="taskLabel" defaultValue={purchase.taskLabel ?? ""}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30" />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Sonraki Eylem</label>
                              <input type="datetime-local" name="nextActionAt" defaultValue={formatDateTimeLocalInput(purchase.nextActionAt)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30" />
                            </div>

                            <div className="space-y-1 col-span-2 md:col-span-3">
                              <label className="text-xs font-medium text-gray-600">Admin Notları</label>
                              <textarea name="adminNotes" defaultValue={purchase.adminNotes ?? ""} rows={2}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 resize-none" />
                            </div>

                            <div className="col-span-2 md:col-span-3 lg:col-span-4 flex gap-3">
                              <button type="submit"
                                className="bg-[#408A71] hover:bg-[#285A48] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                                Kaydet
                              </button>
                              <Link href={buildUrl({ edit: "" })} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
                                İptal
                              </Link>
                            </div>
                          </form>

                          {/* Event log */}
                          {purchase.events.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-[#B0E4CC]/30">
                              <p className="text-xs font-semibold text-gray-500 mb-2">Son Olaylar</p>
                              <div className="space-y-1.5">
                                {purchase.events.map((event) => (
                                  <div key={event.id} className="flex items-center gap-3 text-xs text-gray-600">
                                    <span className="text-gray-400">{formatDateTime(event.createdAt)}</span>
                                    <span>{event.eventType.replace(/_/g, " ")}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                                      event.status === "PAID" ? "bg-emerald-50 text-emerald-700" :
                                      event.status === "FAILED" ? "bg-red-50 text-red-700" :
                                      "bg-gray-100 text-gray-600"
                                    }`}>{event.status}</span>
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

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
            </span>
            <div className="flex gap-2">
              {page > 0 && (
                <Link href={buildUrl({ page: String(page - 1) })} className="text-xs text-[#408A71] border border-[#408A71]/30 rounded-lg px-3 py-1.5 hover:bg-[#B0E4CC]/20 transition-colors">
                  Önceki
                </Link>
              )}
              {(page + 1) * PAGE_SIZE < total && (
                <Link href={buildUrl({ page: String(page + 1) })} className="text-xs text-[#408A71] border border-[#408A71]/30 rounded-lg px-3 py-1.5 hover:bg-[#B0E4CC]/20 transition-colors">
                  Sonraki
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
