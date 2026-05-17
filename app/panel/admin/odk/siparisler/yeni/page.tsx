import type { Metadata } from "next";
import Link from "next/link";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { UserSearch } from "@/components/panel/odk/user-search";
import { createManualOdkOrderAction } from "../_actions";

export const metadata: Metadata = {
  title: "Yeni ODK Siparişi · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewOdkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; packageId?: string }>;
}) {
  await requireOdkPanel("admin");
  const sp = await searchParams;

  const packages = await prisma.odkPackage.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: "desc" }, { priceCents: "asc" }],
    select: { id: true, title: true, priceCents: true, durationDays: true },
  });

  // Prefill: ODK öğrenci detayından "Manuel paket tanımla" ile geliniyorsa
  let prefilledUser: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
    hasActiveOdkEntitlement: boolean;
  } | null = null;
  if (sp.userId) {
    const u = await prisma.user.findUnique({
      where: { id: sp.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        student: { select: { fullName: true, phone: true } },
        odkEntitlements: {
          where: { status: "ACTIVE" },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (u) {
      prefilledUser = {
        id: u.id,
        name: u.name ?? u.student?.fullName ?? null,
        email: u.email,
        phone: u.student?.phone ?? null,
        role: u.role,
        hasActiveOdkEntitlement: u.odkEntitlements.length > 0,
      };
    }
  }

  return (
    <>
      <PageHeader
        title="Yeni ODK Siparişi"
        subtitle="Admin manuel sipariş — pending bırak veya doğrudan paid yap"
        right={
          <Link href="/panel/admin/odk/siparisler" className="od-btn od-btn-ghost od-btn-sm">
            ← Liste
          </Link>
        }
      />

      <Card>
        <CardBody>
          {packages.length === 0 ? (
            <p className="od-muted">
              Aktif ODK paketi yok. Önce{" "}
              <Link href="/panel/admin/odk/paketler/yeni">bir paket oluşturun</Link>.
            </p>
          ) : (
            <form action={createManualOdkOrderAction} className="od-form">
              <Field label="Kullanıcı *" hint="Ad, email veya telefon ile arayın (en az 2 karakter)">
                <UserSearch name="userId" defaultUser={prefilledUser} />
              </Field>

              <Field label="ODK Paket *">
                <Select name="packageId" required defaultValue={sp.packageId ?? ""}>
                  <option value="">— Paket seçin —</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                      {" · "}
                      {(p.priceCents / 100).toLocaleString("tr-TR")}₺
                      {p.durationDays ? ` · ${p.durationDays} gün` : " · süresiz"}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="od-grid g-2">
                <Field label="Ödeme durumu *" hint="paid → entitlement + tag + muhasebe otomatik">
                  <Select name="paymentStatus" required defaultValue="paid">
                    <option value="paid">PAID (manuel grant — bedelsiz)</option>
                    <option value="pending">PENDING (bekleyen sipariş, sonra paid yapılabilir)</option>
                  </Select>
                </Field>
                <Field label="Bitiş tarihi" hint="Boş = paketin süre/gün ayarı uygulanır">
                  <Input name="expiresAt" type="date" />
                </Field>
              </div>

              <Field label="Not / açıklama" hint="Muhasebe açıklamasına ve ödeme failureReason'a yazılır">
                <Textarea name="note" rows={3} placeholder="Örn. Kampanya hediyesi, manuel transfer, vs." />
              </Field>

              <Field label="Bildirim seçenekleri" hint="Sadece PAID akışında devreye girer">
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" name="notifyStudent" defaultChecked />
                    <span>Öğrenciye in-app bildirim gönder</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" name="notifyParent" />
                    <span>Veliye in-app bildirim gönder (bağlı veli varsa)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" name="notifyEmail" />
                    <span>E-posta bildirimi gönder (Resend)</span>
                  </label>
                </div>
              </Field>

              <FormActions>
                <Link href="/panel/admin/odk/siparisler" className="od-btn od-btn-ghost">
                  Vazgeç
                </Link>
                <button type="submit" className="od-btn od-btn-primary">
                  Siparişi oluştur
                </button>
              </FormActions>
            </form>
          )}
        </CardBody>
      </Card>
    </>
  );
}
