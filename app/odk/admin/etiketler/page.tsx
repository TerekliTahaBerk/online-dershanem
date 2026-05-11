import { prisma } from "@/lib/prisma";
import { AccessTagCreateForm } from "@/components/odk/admin/access-tag-create-form";
import { toggleAccessTag, deleteAccessTag } from "@/app/odk/admin/actions";
import { Tag } from "lucide-react";

type TagRow = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  service: "OD" | "ODK";
  isActive: boolean;
  _count: { userTags: number; examTags: number; packageTags: number };
};

async function getAccessTags(): Promise<TagRow[]> {
  const rows = await prisma.odkAccessTag.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      key: true,
      title: true,
      description: true,
      service: true,
      isActive: true,
      _count: { select: { userTags: true, examTags: true, packageTags: true } },
    },
  });
  return rows as unknown as TagRow[];
}

export default async function EtiketlerPage() {
  const tags = await getAccessTags();

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Erişim Etiketleri</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Sınavlara, paketlere ve öğrencilere atanan erişim kuralları
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Tags list */}
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          {tags.length === 0 ? (
            <div className="pd-empty tone-yellow" style={{ borderRadius: 0, border: "none" }}>
              <div className="pd-empty-icon">
                <Tag size={20} />
              </div>
              <div className="pd-empty-title">Henüz etiket yok</div>
              <div className="pd-empty-desc">Sağdaki formdan ilk etiketi oluştur.</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Etiket</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Anahtar</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Servis</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Öğrenci</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Sınav</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Paket</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Durum</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {tags.map((tag) => {
                  const isUsed = tag._count.userTags > 0 || tag._count.examTags > 0 || tag._count.packageTags > 0;
                  return (
                    <tr key={tag.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-900">{tag.title}</p>
                        {tag.description && <p className="text-xs text-stone-400 mt-0.5">{tag.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-stone-100 px-2 py-0.5 text-xs font-mono text-stone-600">{tag.key}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          tag.service === "OD"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-violet-50 text-violet-700"
                        }`}>
                          {tag.service}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{tag._count.userTags}</td>
                      <td className="px-4 py-3 text-stone-600">{tag._count.examTags}</td>
                      <td className="px-4 py-3 text-stone-600">{tag._count.packageTags}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tag.isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                          {tag.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <form action={async () => { "use server"; await toggleAccessTag(tag.id, !tag.isActive); }}>
                            <button
                              type="submit"
                              className="rounded-md px-2.5 py-1 text-xs font-medium text-stone-600 border border-stone-200 hover:bg-stone-50 transition"
                            >
                              {tag.isActive ? "Pasifleştir" : "Aktifleştir"}
                            </button>
                          </form>
                          {!isUsed && (
                            <form action={async () => { "use server"; await deleteAccessTag(tag.id); }}>
                              <button
                                type="submit"
                                className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition"
                              >
                                Sil
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

        {/* Create form */}
        <div>
          <AccessTagCreateForm />
        </div>
      </div>
    </div>
  );
}
