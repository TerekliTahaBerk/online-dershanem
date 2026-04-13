import { prisma } from "@/lib/prisma";
import { AccessTagCreateForm } from "@/components/odk/admin/access-tag-create-form";
import { Tag } from "lucide-react";

async function getAccessTags() {
  return prisma.odkAccessTag.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { userTags: true, examTags: true, packageTags: true } },
    },
  });
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Tag className="h-8 w-8 text-stone-300 mb-3" />
              <p className="text-sm font-medium text-stone-500">Henüz etiket yok</p>
              <p className="text-xs text-stone-400 mt-1">Sağdaki formdan ilk etiketi oluştur.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Etiket</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Anahtar</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Öğrenciler</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Sınavlar</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Paketler</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{tag.title}</p>
                      {tag.description && <p className="text-xs text-stone-400 mt-0.5">{tag.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-stone-100 px-2 py-0.5 text-xs font-mono text-stone-600">{tag.key}</code>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{tag._count.userTags}</td>
                    <td className="px-4 py-3 text-stone-600">{tag._count.examTags}</td>
                    <td className="px-4 py-3 text-stone-600">{tag._count.packageTags}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tag.isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                        {tag.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                  </tr>
                ))}
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
