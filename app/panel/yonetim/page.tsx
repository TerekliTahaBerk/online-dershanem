import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const session = await requireRole("ADMIN");

  const [userCount, activeGroups, upcomingLessons, openLeads] = await Promise.all([
    prisma.user.count(),
    prisma.group.count({ where: { isActive: true } }),
    prisma.lesson.count({ where: { startsAt: { gte: new Date() }, status: "PLANNED" } }),
    prisma.leadSubmission.count({ where: { intakeStatus: { in: ["NEW", "REVIEWING"] } } }),
  ]);

  const stats = [
    { label: "Hesap", value: userCount },
    { label: "Aktif grup", value: activeGroups },
    { label: "Planlı ders", value: upcomingLessons },
    { label: "Açık talep", value: openLeads },
  ];

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      nav={<PanelNav role={session.role} />}
    >
      <h1 className="text-[22px] font-semibold tracking-[-.02em] text-[var(--site-ink)]">Özet</h1>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[14px] border border-[var(--site-line)] bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--site-muted)]">{s.label}</p>
            <p className="mt-1.5 text-[26px] font-semibold leading-none tabular-nums text-[var(--site-ink)]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[16px] border border-[var(--site-line)] bg-white p-5">
        <h2 className="text-[14px] font-bold text-[var(--site-ink)]">Bugünün kontrolü</h2>
        <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-6 text-[var(--site-body)]">
          Hesapları açtıktan sonra grupları kurup dersleri planlayın. Öğretmenin kaydettiği her ders öğrenci ve veli ekranlarına otomatik yansır.
        </p>
        <Link href="/panel/yonetim/egitim" className="site-btn site-btn-primary site-btn-sm mt-4">
          Eğitim akışına git
        </Link>
      </div>
    </PanelShell>
  );
}
