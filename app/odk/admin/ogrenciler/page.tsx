import { prisma } from "@/lib/prisma";
import { calcDaysLeft } from "@/lib/admin";
import { GrantAccessForm } from "@/components/odk/admin/grant-access-form";
import { AssignEntitlementForm } from "@/components/odk/admin/assign-entitlement-form";
import { revokeUserAccessTag, extendUserAccessTag, revokeOdkEntitlement, extendOdkEntitlement } from "@/app/odk/admin/actions";
import { Users, Clock, Package } from "lucide-react";

type AccessTagEntry = {
  id: string;
  accessTagId: string;
  revokedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  accessTag: { title: string };
  entitlementId: string | null;
};

type EntitlementEntry = {
  id: string;
  status: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  package: { id: string; title: string };
};

type Student = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "STUDENT" | "TEACHER";
  odkUserAccessTags: AccessTagEntry[];
  odkEntitlements: EntitlementEntry[];
};

function isAccessActive(item: { revokedAt: Date | null; expiresAt: Date | null; status?: string }): boolean {
  if (item.revokedAt) return false;
  if (item.status && item.status !== "ACTIVE") return false;
  if (item.expiresAt && item.expiresAt <= new Date()) return false;
  return true;
}

function daysLeft(expiresAt: Date): number {
  return calcDaysLeft(expiresAt);
}

async function getData() {
  const now = new Date();
  const [students, accessTags, allStudentUsers, odkPackages] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          {
            odkUserAccessTags: {
              some: {
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
          },
          {
            odkEntitlements: {
              some: {
                revokedAt: null,
                status: "ACTIVE",
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        odkUserAccessTags: {
          select: {
            id: true,
            accessTagId: true,
            revokedAt: true,
            expiresAt: true,
            createdAt: true,
            entitlementId: true,
            accessTag: { select: { title: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        odkEntitlements: {
          select: {
            id: true,
            status: true,
            expiresAt: true,
            revokedAt: true,
            createdAt: true,
            package: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as Promise<Student[]>,
    prisma.odkAccessTag.findMany({ where: { isActive: true }, orderBy: [{ service: "asc" }, { title: "asc" }] }),
    prisma.user.findMany({
      where: {
        role: { not: "ADMIN" },
        OR: [
          { role: "STUDENT" },
          { role: "TEACHER" },
          { student: { isNot: null } },
          { teacher: { isNot: null } },
        ],
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
    prisma.odkPackage.findMany({
      where: { isActive: true },
      select: { id: true, title: true, durationDays: true },
      orderBy: { title: "asc" },
    }),
  ]);
  return { students, accessTags, allStudentUsers, odkPackages };
}

export default async function OgrencilerPage() {
  const { students, accessTags, allStudentUsers, odkPackages } = await getData();

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Erişim Yönetimi</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          OD ve ODK erişim tag'i bulunan {students.length} kullanıcı (öğrenci + eğitmen)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Student list */}
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          {students.length === 0 ? (
            <div className="pd-empty tone-mint" style={{ borderRadius: 0, border: "none" }}>
              <div className="pd-empty-icon">
                <Users size={20} />
              </div>
              <div className="pd-empty-title">Henüz erişim verilmemiş</div>
              <div className="pd-empty-desc">Sağdaki formdan öğrenciye erişim ver.</div>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {students.map((user) => {
                const activeTags = user.odkUserAccessTags.filter(isAccessActive);
                const activeEntitlements = user.odkEntitlements.filter(isAccessActive);

                // Only show manual tags (not linked to an entitlement)
                const manualTags = activeTags.filter((t) => !t.entitlementId);

                return (
                  <div key={user.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900 truncate">{user.name ?? user.email}</p>
                          {user.name && <p className="text-xs text-stone-400">{user.email}</p>}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${
                          user.role === "TEACHER"
                            ? "bg-sky-50 text-sky-700 border-sky-100"
                            : "bg-violet-50 text-violet-700 border-violet-100"
                        }`}>
                          {user.role === "TEACHER" ? "Eğitmen" : "Öğrenci"}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                        Aktif
                      </span>
                    </div>

                    {/* Entitlement-based access (packages) */}
                    {activeEntitlements.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Paket Erişimleri</p>
                        {activeEntitlements.map((ent) => {
                          const left = ent.expiresAt ? daysLeft(ent.expiresAt) : null;
                          const urgent = left !== null && left <= 7;
                          const expiryDateValue = ent.expiresAt
                            ? new Date(ent.expiresAt).toISOString().slice(0, 10)
                            : "";

                          return (
                            <div key={ent.id} className="rounded-lg border border-purple-100 bg-purple-50/40 px-3 py-2.5 space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Package className="h-3 w-3 text-purple-500 shrink-0" />
                                  <span className="text-xs font-medium text-purple-900 truncate">
                                    {ent.package.title}
                                  </span>
                                  {ent.expiresAt ? (
                                    <span className={`flex items-center gap-1 text-xs ${urgent ? "text-red-600 font-semibold" : "text-stone-400"}`}>
                                      <Clock className="h-3 w-3 shrink-0" />
                                      {urgent
                                        ? `${left} gün kaldı`
                                        : new Date(ent.expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })
                                      }
                                    </span>
                                  ) : (
                                    <span className="text-xs text-emerald-600">Süresiz</span>
                                  )}
                                </div>

                                {/* Revoke entitlement */}
                                <form
                                  action={async () => {
                                    "use server";
                                    await revokeOdkEntitlement(ent.id);
                                  }}
                                >
                                  <button
                                    type="submit"
                                    className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition"
                                  >
                                    İptal Et
                                  </button>
                                </form>
                              </div>

                              {/* Extend date form */}
                              <form
                                action={async (fd: FormData) => {
                                  "use server";
                                  const newDate = fd.get("newExpiresAt") as string | null;
                                  await extendOdkEntitlement(ent.id, newDate || null);
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
                    )}

                    {/* Manual tag-level access */}
                    {manualTags.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {activeEntitlements.length > 0 && (
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Manuel Etiket Erişimleri</p>
                        )}
                        {manualTags.map((uat) => {
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar: Grant access + Assign package */}
        <div className="space-y-4">
          <GrantAccessForm accessTags={accessTags} allStudentUsers={allStudentUsers} />
          <AssignEntitlementForm allStudentUsers={allStudentUsers} odkPackages={odkPackages} />
        </div>
      </div>
    </div>
  );
}
