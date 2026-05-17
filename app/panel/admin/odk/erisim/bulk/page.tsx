import type { Metadata } from "next";
import Link from "next/link";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { BulkGrantForm } from "@/components/panel/odk/bulk-grant-form";

export const metadata: Metadata = {
  title: "Toplu ODK Erişim · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BulkGrantPage() {
  await requirePanelRole("admin");

  return (
    <>
      <PageHeader
        title="Toplu ODK Erişim"
        subtitle="CSV ile birden fazla kullanıcıya aynı anda access tag tanımla"
        right={
          <Link href="/panel/admin/odk/erisim" className="od-btn od-btn-ghost od-btn-sm">
            ← Erişim listesi
          </Link>
        }
      />

      <Card>
        <CardHeader title="CSV formatı" />
        <CardBody>
          <p style={{ marginTop: 0, fontSize: 13 }}>
            Aşağıdaki başlıkları içeren bir CSV yapıştırın veya yükleyin.
            Önce <strong>kuru çalıştırma (dry-run)</strong> ile doğrulayın, sonra <strong>uygula</strong> butonuna basın.
          </p>
          <pre className="od-mono" style={{ background: "var(--pd-bg-soft, #f6f4f0)", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto" }}>
{`email,phone,accessTagKey,expiresAt
ali@example.com,,odk-tyt-deneme,2025-12-31
,+905551234567,odk-ayt-deneme,
veli@example.com,,odk-lgs-paket,`}
          </pre>
          <ul style={{ fontSize: 13, marginTop: 8 }}>
            <li><strong>email</strong> veya <strong>phone</strong>: en az biri zorunlu. Email öncelikli.</li>
            <li><strong>accessTagKey</strong>: <code>OdkAccessTag.key</code> alanıyla eşleşmeli, aktif olmalı.</li>
            <li><strong>expiresAt</strong>: ISO tarih (YYYY-MM-DD) — boş bırakılırsa süresiz.</li>
            <li>Aynı kullanıcıya aynı tag varsa <em>upsert</em> yapılır (revoke geri alınır, expiresAt güncellenir).</li>
          </ul>
        </CardBody>
      </Card>

      <div style={{ height: 16 }} />

      <BulkGrantForm />
    </>
  );
}
