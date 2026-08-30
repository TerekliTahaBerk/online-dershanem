import Link from "next/link";
import { Check } from "lucide-react";
import { firstValueComplete, type FirstValueStep } from "@/lib/od/first-value";

/**
 * İLK DEĞER KONTROL LİSTESİ (OD-013).
 *
 * Yeni bir hesabın panelde ne yapması gerektiğini gösterir ve tamamlandığında
 * KENDİNİ KALDIRIR — kalıcı bir "başarı çubuğu" değildir. Yüzde, rozet ve
 * seri yoktur: bu bir oyunlaştırma değil, kurulum listesidir.
 *
 * Ekibi bekleyen adımlar da BASILIR ama eylem düğmesi olmadan; kullanıcı
 * sırasının nerede olduğunu görmeli, kendi yapamayacağı bir işi arıyor
 * olmamalı.
 */
export function FirstValueChecklist({ steps }: { steps: FirstValueStep[] }) {
  if (!steps.length || firstValueComplete(steps)) return null;

  const remaining = steps.filter((step) => !step.done).length;

  return (
    <section aria-labelledby="first-value-heading" className="mt-5 rounded-[14px] border border-dc-line bg-white p-[22px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="first-value-heading" className="text-[16px] font-bold text-dc-ink">Kurulumu tamamla</h2>
        <span className="text-[13px] text-dc-ink-faint">{remaining} adım kaldı</span>
      </div>
      <p className="mt-2 text-[13px] leading-[1.6] text-dc-ink-muted">
        Bu kısa liste bittiğinde panel senin için tam çalışır. Tamamlandığında kendiliğinden kaybolur.
      </p>

      <ol className="mt-4 flex flex-col gap-3">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center rounded ${
                step.done ? "bg-dc-brand-strong text-white" : "border border-[#DDE4E0]"
              }`}
            >
              {step.done ? <Check size={11} strokeWidth={3} /> : null}
            </span>
            <div className="min-w-0">
              <p className={`text-[14px] font-semibold ${step.done ? "text-dc-ink-ghost line-through" : "text-dc-ink"}`}>
                {step.title}
                {!step.done && step.actor === "TEAM" ? (
                  <span className="ml-2 rounded-full bg-dc-line-soft px-2 py-0.5 text-[11px] font-bold text-dc-ink-muted">
                    Ekibimizde
                  </span>
                ) : null}
              </p>
              {!step.done ? (
                <p className="mt-1 text-[13px] leading-[1.6] text-dc-ink-muted">{step.description}</p>
              ) : null}
              {!step.done && step.href && step.actionLabel ? (
                <Link href={step.href} className="mt-2 inline-block text-[13px] font-bold text-dc-brand-strong underline underline-offset-2">
                  {step.actionLabel}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
