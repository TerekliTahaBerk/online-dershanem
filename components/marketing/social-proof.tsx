import { CheckCircle2, CreditCard, ShieldCheck, Users } from "lucide-react";

const proofItems = [
  { icon: Users, strong: "En fazla 4 kişi", detail: "her öğrenci görünür" },
  { icon: CheckCircle2, strong: "Ders sonrası takip", detail: "sıradaki adım net" },
  { icon: ShieldCheck, strong: "Taahhütsüz", detail: "aylık paket düzeni" },
  { icon: CreditCard, strong: "Güvenli ödeme", detail: "PayTR altyapısı" },
];

export function SocialProof() {
  return (
    <section className="bg-white" aria-label="Online Dershanem avantajları">
      <div className="site-container py-7 sm:py-9">
        <div className="grid gap-3 rounded-[24px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-3 sm:grid-cols-2 lg:grid-cols-4">
          {proofItems.map(({ icon: Icon, strong, detail }) => (
            <div key={strong} className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span>
                <strong className="block text-[13.5px] text-[var(--site-ink)]">{strong}</strong>
                <span className="mt-0.5 block text-[11.5px] text-[var(--site-muted)]">{detail}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
