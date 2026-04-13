import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckCircle2, Tag } from "lucide-react";

type UserTagRow = {
  id: string;
  accessTagId: string;
  source: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  accessTag: { title: string };
};

async function getUserAccessInfo(userId: string) {
  const now = new Date();
  const rawTags = await prisma.odkUserAccessTag.findMany({
    where: { userId },
    include: { accessTag: true },
    orderBy: { createdAt: "desc" },
  });
  const tags = rawTags as unknown as UserTagRow[];

  return tags.map((t) => {
    const isActive =
      !t.revokedAt && (t.expiresAt === null || t.expiresAt > now);
    return { ...t, isActive };
  });
}

export default async function OdkProfilPage() {
  const session = await getServerAuthSession();
  const user = session!.user;
  const tags = await getUserAccessInfo(user.id);
  const activeTags = tags.filter((t) => t.isActive);

  const initial = (user.name ?? user.email ?? "?")[0].toUpperCase();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Profil</h1>
        <p className="text-sm text-stone-500 mt-0.5">Hesap bilgilerin ve erişim paketlerin</p>
      </div>

      {/* User info card */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 flex items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700 shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-stone-900 truncate">
            {user.name ?? "İsimsiz Kullanıcı"}
          </p>
          <p className="text-sm text-stone-400 truncate">{user.email}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">
              {activeTags.length} aktif erişim paketi
            </span>
          </div>
        </div>
      </div>

      {/* Access tags */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="border-b border-stone-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-stone-900">Erişim Paketleri</h2>
        </div>

        {tags.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Tag className="h-7 w-7 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-400">Henüz erişim paketin yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className={`text-sm font-medium ${tag.isActive ? "text-stone-900" : "text-stone-400 line-through"}`}>
                    {tag.accessTag.title}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {tag.source === "MANUAL" ? "Manuel verildi" : "Satın alma"}
                    {tag.expiresAt && (
                      <> · {tag.isActive ? "Bitiş:" : "Sona erdi:"} {new Date(tag.expiresAt).toLocaleDateString("tr-TR")}</>
                    )}
                    {!tag.expiresAt && tag.isActive && <> · Süresiz</>}
                    {tag.revokedAt && <> · İptal edildi</>}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    tag.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {tag.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
