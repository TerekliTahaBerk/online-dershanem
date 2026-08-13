import { FinalCta } from "@/components/public/primitives";

type Props = { title?: string; subtitle?: string; ctaLabel?: string; ctaHref?: string };

export function FooterCta({
  title = "Öğrencinizin seviyesini ücretsiz görüşmede konuşalım.",
  subtitle = "Sınıfını, hedefini ve uygun küçük grup ihtimalini birlikte değerlendirelim.",
  ctaLabel = "Ön görüşme talebi",
  ctaHref = "/iletisim/",
}: Props) {
  return (
    <FinalCta eyebrow="Ücretsiz ön görüşme" title={title} body={subtitle} href={ctaHref} label={ctaLabel} secondary={{ href: "/iletisim/", label: "Bize ulaşın" }} />
  );
}
