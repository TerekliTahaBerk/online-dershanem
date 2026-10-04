import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { PASSWORD_CHANGE_PATH, PRODUCT_SELECTOR_PATH } from "@/lib/auth/roles";
import { tallyEmbedUrl } from "@/lib/integrations/tally";
import { TallyContactForm } from "@/components/account/tally-contact-form";

export const metadata: Metadata = {
  title: "İletişim formu",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Kayıt sonrası iletişim formu (Tally `vGRQ5X`).
 *
 * Kullanıcıya ulaşabilmemiz için doldurulur; ATLANABİLİR. Form gönderilince ya
 * da "Sonra dolduracağım" ile kullanıcı ürün paneli seçicisine geçer.
 * Doldurulmadıkça panelde hatırlatma bandı görünür.
 *
 * Gizli alanlar (ref/name/email/phone/role/products) URL'den Tally'ye geçer;
 * `ref` imzalıdır, webhook hesabı yalnız onunla eşleştirir.
 */
export default async function ContactFormPage({ searchParams }: { searchParams: Promise<{ tekrar?: string }> }) {
  const session = await requireSession();
  if (session.mustChangePassword) redirect(PASSWORD_CHANGE_PATH);

  const [user, params] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { fullName: true, email: true, phone: true, role: true, contactFormSubmittedAt: true, signupProfile: { select: { interestedProducts: true } } },
    }),
    searchParams,
  ]);

  // Formu zaten doldurmuş kullanıcıyı tekrar buraya kilitlemeyelim; ayarlardan
  // bilerek dönen ("?tekrar=1") kullanıcı yine görebilir.
  if (user.contactFormSubmittedAt && params.tekrar !== "1") redirect(PRODUCT_SELECTOR_PATH);

  const src = tallyEmbedUrl({
    userId: session.userId,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    products: user.signupProfile?.interestedProducts ?? [],
  });

  return <TallyContactForm src={src} alreadySubmitted={Boolean(user.contactFormSubmittedAt)} />;
}
