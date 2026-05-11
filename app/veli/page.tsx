import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, BookOpen, CalendarDays, Wallet, ClipboardList, ClipboardCheck } from "lucide-react";
import { requireParent } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { canSeeOwnedPackagePrice, formatPriceMasked } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function VeliDashboardPage() {
  const { session, parentId, isAdmin } = await requireParent();
  const userName = session.user?.name ?? session.user?.email ?? "Veli";

  if (!parentId && !isAdmin) {
    redirect("/giris");
  }

  const parent = parentId
    ? await prisma.parent.findUnique({
        where: { id: parentId },
        include: {
          students: {
            include: {
              student: {
                include: {
                  packages: {
                    where: { revokedAt: null },
                    include: { package: { select: { name: true, price: true } } },
                    orderBy: { assignedAt: "desc" },
                    take: 1,
                  },
                  lessons: {
                    where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
                    orderBy: { scheduledAt: "asc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      })
    : null;

  const childCount = parent?.students.length ?? 0;
  const role = (session.user?.role ?? "PARENT") as any;

  const totalActivePackages =
    parent?.students.reduce((acc: number, ps: any) => acc + ps.student.packages.length, 0) ?? 0;

  const upcoming =
    parent?.students
      .flatMap((ps: any) =>
        ps.student.lessons.map((l: any) => ({ ...l, studentName: ps.student.fullName })),
      )
      .sort((a: any, b: any) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))[0] ?? null;

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--pd-muted-2)" }}>
            Veli Paneli
          </p>
          <h1 className="pd-page-title">Hoş geldin, {userName}</h1>
          <p className="pd-page-subtitle">Çocuğunuzun gelişimi, ödevleri, devamsızlığı ve ödemeleri.</p>
        </div>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Kpi icon={<Users size={16} />} label="Bağlı çocuk" value={String(childCount)} />
        <Kpi icon={<BookOpen size={16} />} label="Aktif paket" value={String(totalActivePackages)} />
        <Kpi
          icon={<CalendarDays size={16} />}
          label="Yaklaşan ders"
          value={
            upcoming
              ? new Date(upcoming.scheduledAt).toLocaleString("tr-TR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
        />
        <Kpi icon={<Wallet size={16} />} label="Ödeme" value="Görüntüle" href="/veli/odemeler" />
      </section>

      {childCount > 0 && parent ? (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Çocuklarınız</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {parent.students.map((ps: any) => {
              const pkg = ps.student.packages[0];
              return (
                <div key={ps.studentId} className="pd-card" style={{ padding: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 15 }}>{ps.student.fullName}</strong>
                    <div style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>
                      {ps.student.classLevel ?? "—"} · {ps.relationship ?? "Veli"}
                      {ps.isPrimary && (
                        <span className="pd-chip" style={{ marginLeft: 6, fontSize: 10, background: "#fef3c7" }}>
                          Birincil
                        </span>
                      )}
                    </div>
                  </div>
                  {pkg && (
                    <div style={{ fontSize: 13, color: "var(--pd-ink-3)", marginBottom: 8 }}>
                      <strong>Paket:</strong> {pkg.package.name}
                      <span style={{ marginLeft: 8, color: "var(--pd-muted-2)" }}>
                        {formatPriceMasked(pkg.package.price, canSeeOwnedPackagePrice(role))}
                      </span>
                    </div>
                  )}
                  <Link href={`/veli/cocuklarim/${ps.studentId}`} className="pd-btn-ghost" style={{ fontSize: 12 }}>
                    Detay →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="pd-card" style={{ padding: 24, color: "var(--pd-muted-2)" }}>
          Hesabınıza henüz bir öğrenci bağlanmamış. Lütfen kurum yöneticisi ile iletişime geçin.
        </div>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        <ShortcutCard
          href="/veli/odevler"
          icon={<ClipboardCheck size={16} />}
          title="Ödevler"
          desc="Verilen ve teslim edilen ödevler"
        />
        <ShortcutCard
          href="/veli/devamsizlik"
          icon={<ClipboardList size={16} />}
          title="Devamsızlık"
          desc="Yoklama kayıtları"
        />
        <ShortcutCard href="/veli/inbox" icon={<Wallet size={16} />} title="Bildirimler" desc="Tüm gelişmeler" />
      </section>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="pd-kpi-card">
      <div style={{ fontSize: 12, color: "var(--pd-muted-2)", display: "flex", alignItems: "center", gap: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {content}
    </Link>
  ) : (
    content
  );
}

function ShortcutCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="pd-card"
      style={{
        padding: 16,
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}>
        {icon} {title}
      </div>
      <div style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>{desc}</div>
    </Link>
  );
}
