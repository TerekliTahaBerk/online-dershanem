import Link from "next/link";
import type { Faq } from "@/lib/site-content";
import { PublicAccordion } from "@/components/public/accordion";
import { PublicSection, SectionIntro } from "@/components/public/primitives";

type Props = { title?: string; items: Faq[]; tone?: "plain" | "warm"; showAllLink?: boolean };

export function FaqAccordion({ title = "Karar vermeden önce merak edilenler.", items, tone = "warm", showAllLink = false }: Props) {
  return (
    <PublicSection id="sss" tone={tone === "warm" ? "soft" : "white"}>
        <div className="grid gap-10 lg:grid-cols-[.65fr_1.35fr] lg:gap-20">
          <div>
            <SectionIntro title={title} size="section" />
            {showAllLink ? <Link href="/sss/" className="mt-7 inline-flex text-[14px] font-semibold text-[var(--brand-olive)] hover:underline">Tüm soruları gör</Link> : null}
          </div>
          <PublicAccordion items={items.map((item) => ({ title: item.q, content: item.a }))} />
        </div>
    </PublicSection>
  );
}
