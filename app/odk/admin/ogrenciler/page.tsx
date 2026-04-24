import { prisma } from "@/lib/prisma";
import { GrantAccessForm } from "@/components/odk/admin/grant-access-form";
import { revokeUserAccessTag, extendUserAccessTag } from "@/app/odk/admin/actions";
import { Users, Clock } from "lucide-react";

type AccessTagEntry = {
  id: string;
  accessTagId: string;
  revokedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  accessTag: { title: string };
};

type Student = {
  id: string;
  name: string | null;
  email: string;
  odkUserAccessTags: AccessTagEntry[];
};

function isActive(tag: AccessTagEntry) {
  if (tag.revokedAt) return false;
  if (tag.expiresAt && tag.expiresAt <= new Date()) return false;
  return true;
}

function daysLeft(expiresAt: Date): number {
  return Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
}

async function getData() {
  const now = new Date();
  const [students, accessTags, allStudentUsers] = await Promise.all([
    // Only fetch students who have at least one active (non-revoked, non-expired) tag
    prisma.user.findMany({
      where: {
        odkUserAccessTags: {
          some: {
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        odkUserAccessTags: {
          select: {
            id: true,
            accessTagId: true,
            revokedAt: true,
            expiresAt: true,
            createdAt: true,
            accessTag: { select: { title: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as Promise<Student[]>,
    prisma.odkAccessTag.findMany({ where: { isActive: true }, orderBy: { title: "asc" } }),
    prisma.user.findMany({
      where: {
        role: { not: "ADMIN" },
        OR: [{ role: "STUDENT" }, { student: { isNot: null } }],
      },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
  ]);
  return { students, accessTags, allStudentUsers };
}

export default async function OgrencilerPage() {
  const { students, accessTags, allStudentUsers } = await getData();

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Öğrenci Erişimi</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          ODK&apos;ya aktif erişimi olan {students.length} öğrenci
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
              {students.map((user) => {
                const activeTags = user.odkUserAccessTags.filter(isActive);
                return (
                  <div key={user.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-stone-900 truncate">{user.name ?? user.email}</p>
                        {user.name && <p className="text-xs text-stone-400">{user.email}</p>}
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                        Aktif
                      </span>
                    </div>

                    <div className="mt-3 space-y-3">
                      {activeTags.map((uat) => {
                        const left = uat.expiresAt ? daysLeft(uat.expiresAt) : null;
                        const urgent = left !== null && left <= 7;
                        const expiryDateValue = uat.expiresAt
                          ? new Date(uat.expiresAt).toISOString().slice(0, 10)
                          : "";

                        return (
                          <div key={uat.id} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 space-y-2">
                            {/* Tag header row */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-medium text-stone-700 truncate">
                                  {uat.accessTag.title}
                                </span>
                                {uat.expiresAt ? (
                                  <span className={`flex items-center gap-1 text-xs ${urgent ? "text-red-600 font-semibold" : "text-stone-400"}`}>
                                    <Clock className="h-3 w-3 shrink-0" />
                                    {urgent
                                      ? `${left} gün kaldı`
                                      : new Date(uat.expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })
                                    }
                                  </span>
                                ) : (
                                  <span className="text-xs text-emerald-600">Süresiz</span>
                                )}
                              </div>

                              {/* Revoke button */}
                              <form
                                action={async () => {
                                  "use server";
                                  await revokeUserAccessTag(user.id, uat.accessTagId);
                                }}
                              >
                                <button
                                  type="submit"
                                  className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition"
                                >
                                  Kaldır
                                </button>
                              </form>
                            </div>

                            {/* Extend date inline form */}
                            <form
                              action={async (fd: FormData) => {
                                "use server";
                                const newDate = fd.get("newExpiresAt") as string | null;
                                await extendUserAccessTag(user.id, uat.accessTagId, newDate || null);
                              }}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="date"
                                name="newExpiresAt"
                                defaultValue={expiryDateValue}
                                min={new Date().toISOString().slice(0, 10)}
                                className="flex-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
                              />
                              <button
                                type="submit"
                                className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100 transition"
                              >
                                Uzat
                              </button>
                              <button
                                type="submit"
                                name="newExpiresAt"
                                value=""
                                className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
                                title="Süresiz yap"
                              >
                                ∞
                              </button>
                            </form>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grant access form */}
        <div>
          <GrantAccessForm accessTags={accessTags} allStudentUsers={allStudentUsers} />
        </div>
      </div>
    </div>
  );
}
