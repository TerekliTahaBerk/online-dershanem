import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { InviteAcceptForm } from "@/components/panel/invite-accept-form";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { PANEL_ENABLED } from "@/lib/panel-config";

export const metadata: Metadata = {
  ...buildMarketingMetadata({
    title: "Hesap Daveti",
    description: "Online Dershanem hesap davetini tamamlayın.",
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
          Daveti tamamlamak için panelin açık olduğu bir zamanda tekrar deneyin.
        </p>
      </AuthCard>
    );
  }

  const params = await searchParams;
  const token = params.token?.trim();
  if (!token) {
    return (
      <AuthCard title="Davet bağlantısı eksik" googleLabel="Google ile giriş yap">
        <p className="text-center text-[13px] text-dc-ink-muted">
          Geçerli bir davet bağlantısı açın veya yöneticinizden yeni davet isteyin.
        </p>
        <Link href="/giris" className="mt-4 block text-center text-[13px] font-semibold text-dc-brand hover:underline">
          Giriş sayfasına dön
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Hesabınızı etkinleştirin" googleLabel="Google ile giriş yap">
      <p className="mb-4 text-center text-[13px] text-dc-ink-muted">
        Daveti tamamlamak için kendi parolanızı belirleyin.
      </p>
      <InviteAcceptForm token={token} />
    </AuthCard>
  );
}
