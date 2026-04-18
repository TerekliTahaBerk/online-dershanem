import Link from "next/link";
import { Prisma, IntakeStatus } from "@prisma/client";

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

const INTAKE_COLORS: Record<IntakeStatus, string> = {
  NEW: "bg-gray-100 text-gray-600",
  REVIEWING: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-violet-50 text-violet-700",
  ENROLLED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-gray-100 text-gray-400"
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

  const buildUrl = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (intakeStatus) p.set("intakeStatus", intakeStatus);
    if (tasks) p.set("tasks", tasks);
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/admin/formlar?${p.toString()}`;
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#091413]">Formlar</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString("tr-TR")} form başvurusu</p>
      </div>

      {updated === "lead" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-lg">
          Form güncellendi.
        </div>
      )}

      {/* Filters */}
      <form method="GET" action="/admin/formlar" className="flex flex-wrap gap-3">
        <input type="text" name="q" defaultValue={q} placeholder="İsim, telefon..."
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 focus:border-[#408A71]" />
        <select name="intakeStatus" defaultValue={intakeStatus}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#408A71]/30">
          <option value="">Tüm Durumlar</option>
          {intakeStatusOptions.map((s) => (
            <option key={s} value={s}>{intakeStatusLabels[s]}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white cursor-pointer">
          <input type="checkbox" name="tasks" value="1" defaultChecked={tasks === "1"} className="accent-[#408A71]" />
          Görevli
        </label>
        <button type="submit" className="bg-[#408A71] hover:bg-[#285A48] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Filtrele
        </button>
        {(q || intakeStatus || tasks) && (
          <Link href="/admin/formlar" className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2">Temizle</Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Başvuran</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Sınav / Sınıf</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Kaynak</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Durum</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Öğrenci</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">Form başvurusu bulunamadı.</td>
                </tr>
              )}
              {leads.map((lead) => {
                const isEditing = editId === lead.id;
                const waLink = buildWhatsAppLink(lead.phone);
                return (
                  <>
                    <tr key={lead.id} className={`hover:bg-gray-50 transition-colors ${isEditing ? "bg-[#B0E4CC]/10" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#091413]">{lead.fullName}</p>
                        {waLink ? (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-xs text-[#408A71] hover:underline">{lead.phone}</a>
                        ) : (
                          <p className="text-xs text-gray-400">{lead.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{lead.examType}</p>
                        <p className="text-xs text-gray-400">{lead.classLevel}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{lead.source}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${INTAKE_COLORS[lead.intakeStatus]}`}>
                          {intakeStatusLabels[lead.intakeStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(lead.submittedAt)}</td>
                      <td className="px-4 py-3">
                        {lead.student ? (
                          <Link href={`/admin/ogrenciler?edit=${lead.student.id}`} className="text-xs text-[#408A71] hover:underline">
                            {lead.student.fullName}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-300">Eşleşmedi</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={isEditing ? buildUrl({ edit: "" }) : buildUrl({ edit: lead.id })}
                          className="text-xs text-[#408A71] hover:text-[#285A48] font-medium border border-[#408A71]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#B0E4CC]/20 transition-colors"
                        >
                          {isEditing ? "Kapat" : "Düzenle"}
                        </Link>
                      </td>
                    </tr>

                    {isEditing && (
                      <tr key={`${lead.id}-edit`}>
                        <td colSpan={7} className="px-4 py-4 bg-[#B0E4CC]/5 border-b border-[#B0E4CC]/30">
                          <form action={updateLeadAction} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <input type="hidden" name="leadId" value={lead.id} />
                            <input type="hidden" name="returnTo" value={buildUrl({ edit: lead.id })} />

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Durum</label>
                              <select name="intakeStatus" defaultValue={lead.intakeStatus}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#408A71]/30">
                                {intakeStatusOptions.map((s) => (
                                  <option key={s} value={s}>{intakeStatusLabels[s]}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Görev Etiketi</label>
                              <input type="text" name="taskLabel" defaultValue={lead.taskLabel ?? ""}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30" />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Sonraki Eylem</label>
                              <input type="datetime-local" name="nextActionAt" defaultValue={formatDateTimeLocalInput(lead.nextActionAt)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30" />
                            </div>

                            <div className="space-y-1 col-span-2 md:col-span-4">
                              <label className="text-xs font-medium text-gray-600">Admin Notları</label>
                              <textarea name="adminNotes" defaultValue={lead.adminNotes ?? ""} rows={2}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 resize-none" />
                            </div>

                            <div className="col-span-2 md:col-span-4 flex gap-3 items-center flex-wrap">
                              <button type="submit" className="bg-[#408A71] hover:bg-[#285A48] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                                Kaydet
                              </button>
                              <Link href={buildUrl({ edit: "" })} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">İptal</Link>
                              <form action={deleteLeadAction} className="ml-auto">
                                <input type="hidden" name="leadId" value={lead.id} />
                                <input type="hidden" name="returnTo" value={buildUrl({ edit: "" })} />
                                <button
                                  type="submit"
                                  onClick={(e) => { if (!confirm("Bu formu kalıcı olarak silmek istediğinizden emin misiniz?")) e.preventDefault(); }}
                                  className="text-xs font-medium border border-red-200 text-red-700 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
                                >
                                  Formu Sil
                                </button>
                              </form>
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}</span>
            <div className="flex gap-2">
              {page > 0 && (
                <Link href={buildUrl({ page: String(page - 1) })} className="text-xs text-[#408A71] border border-[#408A71]/30 rounded-lg px-3 py-1.5 hover:bg-[#B0E4CC]/20 transition-colors">Önceki</Link>
              )}
              {(page + 1) * PAGE_SIZE < total && (
                <Link href={buildUrl({ page: String(page + 1) })} className="text-xs text-[#408A71] border border-[#408A71]/30 rounded-lg px-3 py-1.5 hover:bg-[#B0E4CC]/20 transition-colors">Sonraki</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
