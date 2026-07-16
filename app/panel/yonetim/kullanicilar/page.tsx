import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { roleLabel } from "@/lib/auth/roles";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { CreateUserForm } from "@/components/panel/create-user-form";
import { UserRowActions } from "@/components/panel/user-row-actions";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { UsersRound } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(value);
}

export default async function UsersPage() {
  const session = await requireRole("ADMIN");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      nav={<PanelNav role={session.role} />}
    >
      <AdminPageHeader eyebrow="Kişi yönetimi" title="Herkes doğru yerde." description="Öğrenci, öğretmen, veli ve yönetici hesaplarını tek yerden açın; erişim durumlarını güvenle yönetin." icon={UsersRound} meta={`${users.length} hesap`} />

      <section id="yeni-hesap" className="mt-6 scroll-mt-28 rounded-[20px] border border-[var(--site-line)] bg-white p-5 shadow-[var(--panel-card-shadow)]">
        <h2 className="text-[14px] font-bold text-[var(--site-ink)]">Yeni hesap aç</h2>
        <div className="mt-4">
          <CreateUserForm />
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-[13px] font-extrabold text-[var(--site-ink)]">
          Mevcut hesaplar <span className="font-medium text-[var(--site-muted)]">({users.length})</span>
        </h2>

        <ul className="mt-3 flex flex-col gap-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-col gap-3 rounded-[14px] border border-[var(--site-line)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-[var(--site-ink)]">
                    {user.fullName || user.email}
                  </span>
                  <span className="shrink-0 rounded-full border border-[var(--brand-olive-soft)] bg-[var(--brand-olive-soft)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.05em] text-[var(--brand-olive)]">
                    {roleLabel(user.role)}
                  </span>
                  {/* Durum rengi marka yeşilinden AYRI bir eksende — "aktif menü" ile
                      "askıya alınmış hesap" aynı yeşille çizilmemeli. */}
                  {user.status === "SUSPENDED" ? (
                    <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.05em] text-rose-700">
                      Askıda
                    </span>
                  ) : null}
                  {user.mustChangePassword ? (
                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.05em] text-amber-800">
                      Parola bekliyor
                    </span>
                  ) : null}
                  {user.id === session.userId ? (
                    <span className="shrink-0 text-[11px] font-semibold text-[var(--site-muted)]">siz</span>
                  ) : null}
                </div>

                <p className="mt-1 truncate text-[12.5px] text-[var(--site-body)]">
                  {user.fullName ? `${user.email} · ` : ""}
                  {user.phone || "telefon yok"}
                </p>
                <p className="mt-0.5 text-[11.5px] text-[var(--site-muted)]">
                  Açılış {formatDate(user.createdAt)} · Son giriş {formatDate(user.lastLoginAt)}
                </p>
              </div>

              <UserRowActions
                userId={user.id}
                email={user.email}
                fullName={user.fullName}
                phone={user.phone}
                status={user.status}
                isSelf={user.id === session.userId}
              />
            </li>
          ))}
        </ul>
      </section>
    </PanelShell>
  );
}
