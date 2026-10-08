"use client";

import Link from "next/link";

type NextBestAction = {
  key: string;
  audience: "STUDENT" | "PARENT" | "TEACHER";
  priority: number;
  title: string;
  explanation: string;
  action:
    | { type: "OPEN_PLAN"; href: string }
    | { type: "OPEN_REVIEW"; href: string }
    | { type: "CONTACT_STUDENT"; studentId: string }
    | { type: "OPEN_INTERVENTION"; href: string }
    | { type: "OPEN_DIGEST"; href: string }
    | { type: "ASK_QUESTION"; prompt: string };
  evidenceRefs: { id: string; label: string }[];
  generatedAt: string;
  expiresAt?: string | null;
};

function getActionLabel(action: NextBestAction["action"]): string {
  switch (action.type) {
    case "OPEN_PLAN":
      return "Haftalık planı gör";
    case "OPEN_REVIEW":
      return "Sonucunu Gör";
    case "OPEN_INTERVENTION":
      return "Öğrenciyi Gör";
    case "OPEN_DIGEST":
      return "Haftalık Özeti Gör";
    default:
      return "Detayı Gör";
  }
}

export function DinoNextBestActions({ items }: { items: NextBestAction[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-5 rounded-od-xl border border-(--site-line) bg-white p-5">
      <h2 className="text-[15px] font-extrabold text-(--site-ink)">
        Önerilen sonraki adım
      </h2>
      <div className="mt-4 grid gap-3">
        {items.slice(0, 3).map((item) => (
          <article
            key={item.key}
            className="rounded-2xl border border-(--site-line) bg-(--site-bg-warm) p-4"
          >
            <p className="text-[12px] font-extrabold uppercase tracking-[.06em] text-(--brand-olive)">
              {item.audience}
            </p>
            <h3 className="mt-1 text-[14px] font-bold text-(--site-ink)">
              {item.title}
            </h3>
            <p className="mt-1 text-[13px] leading-6 text-(--site-body)">
              {item.explanation}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {"href" in item.action ? (
                <Link
                  href={item.action.href}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover min-h-10 px-3.5 text-[12.5px]"
                >
                  {getActionLabel(item.action)}
                </Link>
              ) : (
                <span className="rounded-full border border-(--site-line) px-3 py-1 text-[12px] font-medium text-(--site-body)">
                  {item.action.type === "ASK_QUESTION"
                    ? item.action.prompt
                    : "Eylem"}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
