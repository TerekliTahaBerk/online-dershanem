import { prisma } from "@/lib/prisma";
import { GrantAccessForm } from "@/components/odk/admin/grant-access-form";
import { revokeUserAccessTag } from "@/app/odk/admin/actions";
import { Users } from "lucide-react";

async function getData() {
  const [students, accessTags] = await Promise.all([
    prisma.user.findMany({
      where: {
        odkUserAccessTags: { some: {} },
      },
      select: {
        id: true,
        name: true,
        email: true,
        odkUserAccessTags: {
          include: { accessTag: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.odkAccessTag.findMany({ where: { isActive: true }, orderBy: { title: "asc" } }),
  ]);
  return { students, accessTags };
}

export default async function OgrencilerPage() {
  const { students, accessTags } = await getData();

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Öğrenci Erişimi</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          ODK'ya erişimi olan {students.length} öğrenci
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Student list */}
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-8 w-8 text-stone-300 mb-3" />
              <p className="text-sm font-medium text-stone-500">Henüz erişim verilmemiş</p>
              <p className="text-xs text-stone-400 mt-1">Sağdaki formdan öğrenciye erişim ver.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {students.map((user) => (
                <div key={user.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900 truncate">{user.name ?? user.email}</p>
                      {user.name && <p className="text-xs text-stone-400">{user.email}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {user.odkUserAccessTags.map((uat) => (
                      <div key={uat.id} className="flex items-center gap-1.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${uat.revokedAt ? "bg-stone-50 text-stone-400 border-stone-200 line-through" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                          {uat.accessTag.title}
                        </span>
                        {!uat.revokedAt && (
                          <form action={async () => { "use server"; await revokeUserAccessTag(user.id, uat.accessTagId); }}>
                            <button type="submit" className="text-xs text-stone-400 hover:text-red-500 transition">
                              ×
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grant access form */}
        <div>
          <GrantAccessForm accessTags={accessTags} />
        </div>
      </div>
    </div>
  );
}
