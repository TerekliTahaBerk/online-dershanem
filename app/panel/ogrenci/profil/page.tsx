import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { productLabel } from "@/lib/auth/roles";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelCardTitle, PanelHeading } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · PROFİL VE HESAP — onaylı tasarım (Panel.dc.html → sProfile).
 *
 * Tasarımdaki iki kart: "Bilgilerin" (ad, e-posta, hedef sınav, bağlı veli) ve
 * "Paketin" (ürün üyelikleri + durum). Üçüncü olarak tasarımın "güvenli hesap
 * aksiyonları" ifadesi mevcut güvenlik sayfalarına bağlanır — yeni bir parola
 * akışı kurulmaz, var olan `/panel/parola` ve `/panel/oturumlar` kullanılır.
 *
 * ÜRÜNDEN BAĞIMSIZ SAYFA: `requirePanelRole` ile korunur. Öğrenci hangi ürünü
 * almış olursa olsun kendi profilini görebilmeli (§ guards — `requireRole`
 * OD şartı koşar, burada yanlış olurdu).
 */

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-dc-ink-faint">{label}</dt>
      <dd className="mt-1 text-[14.5px] font-medium text-dc-ink">{value}</dd>
    </div>
  );
}

export default async function StudentProfilePage() {
  const session = await requirePanelRole("STUDENT");

  const [profile, memberships] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      select: {
        classLevel: true,
        targetGoal: true,
        parents: {
          select: { relationship: true, parent: { select: { fullName: true, email: true } } },
        },
      },
    }),
    prisma.productMembership.findMany({
      where: { userId: session.userId, revokedAt: null },
      select: { product: true, expiresAt: true, startsAt: true },
      orderBy: { product: "asc" },
    }),
  ]);

  const now = new Date();
  /* Süresi geçmiş üyelik "aktif" yazmamalı — durum tarihten türetilir. */
  const active = memberships.filter((m) => !m.expiresAt || m.expiresAt > now);

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Profil"
    >
      <div className="max-w-[760px]">
        <PanelHeading title="Profil ve hesap" />

        <PanelCard className="mt-[22px]">
          <PanelCardTitle>Bilgilerin</PanelCardTitle>
          <dl className="mt-3.5 grid gap-4 sm:grid-cols-2">
            <Field label="Ad soyad" value={session.fullName || "—"} />
            <Field label="E-posta" value={session.email} />
            <Field label="Hedef sınav" value={profile?.targetGoal || "Henüz belirlenmedi"} />
            <Field label="Sınıf" value={profile?.classLevel || "Henüz belirlenmedi"} />
            <Field
              label="Bağlı veli"
              value={
                profile?.parents.length
                  ? profile.parents
                      .map((p) => p.parent.fullName || p.parent.email)
                      .join(", ")
                  : "Bağlı veli yok"
              }
            />
          </dl>
        </PanelCard>

        <PanelCard className="mt-4">
          <PanelCardTitle>Paketin</PanelCardTitle>
          {active.length === 0 ? (
            <p className="mt-3 text-[14px] leading-[1.6] text-dc-ink-muted">
              Şu anda aktif bir ürün paketin görünmüyor. Paket bilgin güncellenmediyse
              eğitim koordinatörünle görüşebilirsin.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {active.map((m) => (
                <li
                  key={m.product}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-[14.5px] font-medium text-dc-ink-body"
                >
                  <span>{productLabel(m.product)}</span>
                  <span className="text-dc-brand-hover">
                    Aktif
                    {m.expiresAt ? ` · dönem sonu ${DATE.format(m.expiresAt)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3.5 text-[13px] text-dc-ink-faint">
            Paket değişikliği için eğitim koordinatörünle görüşebilirsin.
          </p>
        </PanelCard>

        <PanelCard className="mt-4">
          <PanelCardTitle>Hesap güvenliği</PanelCardTitle>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Link
              href="/panel/parola"
              className="rounded-lg bg-dc-brand-strong px-3.5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-dc-brand-hover"
            >
              Parolanı değiştir
            </Link>
            <Link
              href="/panel/oturumlar"
              className="rounded-lg border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-dc-ink-muted transition-colors hover:border-dc-brand"
            >
              Aktif oturumların
            </Link>
          </div>
        </PanelCard>
      </div>
    </PanelShell>
  );
}
