import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { InviteAcceptForm } from "@/components/panel/invite-accept-form";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { PANEL_ENABLED } from "@/lib/panel-config";

export const metadata: Metadata = {
  ...buildMarketingMetadata({
    title: "Hesap Daveti",
    description: "onlinedershanem. hesap davetini tamamlayın.",
    canonical: "/davet",
  }),
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  if (!PANEL_ENABLED) {
    return (
      <AuthCard title="Panel şu anda kapalı" googleLabel="Google ile giriş yap">
        <p className="text-center text-[13px] text-dc-ink-muted">
          Panel şu an kısa bir süreliğine kapalı; daveti tamamlamak için biraz sonra tekrar deneyebilirsiniz.
        </p>
      </AuthCard>
    );
  }

  const params = await searchParams;
  const token = params.token?.trim();
  if (!token) {
    return (
      <AuthCard
        title="Davet bağlantısı eksik"
        googleLabel="Google ile giriş yap"
      >
        <p className="text-center text-[13px] text-dc-ink-muted">
          Davet bağlantısı eksik görünüyor. Size gönderilen bağlantıyı yeniden açabilir ya da bizden yeni bir davet
          isteyebilirsiniz 🤝
        </p>
        <Link
          href="/giris"
          className="mt-4 block text-center text-[13px] font-semibold text-dc-brand-strong hover:underline"
        >
          Giriş sayfasına dön
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Aramıza hoş geldiniz! 🎉"
      googleLabel="Google ile giriş yap"
    >
      <p className="mb-4 text-center text-[13px] text-dc-ink-muted">
        Daveti tamamlamak için size özel bir parola belirlemeniz yeterli.
      </p>
      <InviteAcceptForm token={token} />
    </AuthCard>
  );
}
