import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { updateExamStatus } from "@/app/odk/admin/actions";

const familyLabels: Record<string, string> = {
  TYT: "TYT", AYT: "AYT", LGS: "LGS", KPSS: "KPSS", ALES: "ALES",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: "Taslak",  className: "bg-stone-100 text-stone-600" },
  PUBLISHED: { label: "Yayında", className: "bg-emerald-50 text-emerald-700" },
  ARCHIVED:  { label: "Arşiv",   className: "bg-amber-50 text-amber-700" },
};

type ExamRow = {
  id: string;
  title: string;
  cadenceFamily: string;
  status: string;
  durationMinutes: number;
  startsAt: Date | null;
  createdAt: Date;
  _count: { sections: number; attempts: number };
};

async function getExams(): Promise<ExamRow[]> {
  const rows = await prisma.odkExam.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      cadenceFamily: true,
      status: true,
      durationMinutes: true,
      startsAt: true,
      createdAt: true,
      _count: { select: { sections: true, attempts: true } },
    },
  });
  return rows as unknown as ExamRow[];
}

export default async function OdkSinavlarPage() {
  const exams = await getExams();

  const counts = {
    total: exams.length,
    published: exams.filter((e) => e.status === "PUBLISHED").length,
    draft: exams.filter((e) => e.status === "DRAFT").length,
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Sınavlar</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {counts.total} sınav · {counts.published} yayında · {counts.draft} taslak
          </p>
        </div>
        <Link
          href="/odk/admin/sinavlar/yeni"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
        >
          <Plus className="h-4 w-4" />
          Yeni Sınav
        </Link>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {exams.length === 0 ? (
          <div className="pd-empty tone-sky" style={{ borderRadius: 0, border: "none" }}>
            <div className="pd-empty-icon">
              <FileText size={20} />
            </div>
            <div className="pd-empty-title">Henüz sınav yok</div>
            <div className="pd-empty-desc">İlk sınavını oluştur.</div>
            <Link
              href="/odk/admin/sinavlar/yeni"
              className="pd-btn pd-btn-accent pd-btn-sm"
              style={{ marginTop: 12 }}
            >
              <Plus className="h-4 w-4" />
              Sınav Oluştur
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Sınav</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Aile</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Bölüm</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Girişim</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Süre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Tarih</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {exams.map((exam) => {
                const status = statusConfig[exam.status] ?? statusConfig.DRAFT;
                return (
                  <tr key={exam.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900 truncate max-w-[220px]">{exam.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
                        {familyLabels[exam.cadenceFamily] ?? exam.cadenceFamily}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{exam._count.sections}</td>
                    <td className="px-4 py-3 text-stone-600">{exam._count.attempts}</td>
                    <td className="px-4 py-3 text-stone-500">{exam.durationMinutes} dk</td>
                    <td className="px-4 py-3 text-stone-400 text-xs">
                      {new Date(exam.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/odk/admin/sinavlar/${exam.id}`}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 border border-stone-200 hover:border-emerald-300 hover:text-emerald-700 transition"
                        >
                          Düzenle
                        </Link>
                        {exam.status === "DRAFT" && (
                          <form action={async () => { "use server"; await updateExamStatus(exam.id, "PUBLISHED"); }}>
                            <button
                              type="submit"
                              className="rounded-md px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 transition"
                            >
                              Yayınla
                            </button>
                          </form>
                        )}
                        {exam.status === "PUBLISHED" && (
                          <form action={async () => { "use server"; await updateExamStatus(exam.id, "ARCHIVED"); }}>
                            <button
                              type="submit"
                              className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-500 border border-stone-200 hover:bg-stone-100 transition"
                            >
                              Arşivle
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
