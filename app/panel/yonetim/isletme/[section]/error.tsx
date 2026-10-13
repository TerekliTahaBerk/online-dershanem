"use client";
import { buttonClass } from "@/components/panel/primitives";
export default function BusinessSectionError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      className="pn-scope m-6 max-w-[1280px] rounded-[10px] border border-pn-border bg-white p-5"
    >
      <h2 className="text-[15px] font-semibold text-pn-text">
        Bu bölüm şu anda yüklenemedi.
      </h2>
      <p className="mt-2 text-sm text-pn-text-muted">
        Teknik ayrıntı kayıtlara alındı. Biraz sonra yeniden deneyebilirsiniz.
      </p>
      <button
        onClick={reset}
        className={buttonClass("secondary", "md", "mt-4")}
      >
        Yeniden dene
      </button>
    </section>
  );
}
