"use client";

import { useState } from "react";

/**
 * DINO AI — sohbet yüzeyi (onaylı tasarım: sDino / pDino / eDino).
 *
 * SERBEST YAZIM ALANI YOKTUR. Tasarımdaki öneri promptları burada gerçek
 * seçeneklerdir; kullanıcı birini seçer, sunucuya yalnız o sorunun anahtarı
 * gider. Gerekçe `lib/dino.ts` başında: serbest metin, öğrenci verisiyle
 * çalışan bir modele kullanıcı kontrollü talimat sokmanın en kolay yoludur.
 *
 * Yanıt bir MODEL çıktısı değilse bunu açıkça yazar — okuyucu neye baktığını
 * bilmeden bırakılmaz.
 */

export type DinoQuestionOption = { key: string; label: string };

type Turn = {
  question: string;
  text: string;
  sources: string[];
  fromModel: boolean;
  note: string | null;
  nextBestActions: Array<{ key: string; title: string; explanation: string; href: string }>;
};

const FALLBACK_NOTE: Record<string, string> = {
  PROVIDER_DISABLED: "Dino şu anda kapalı; aşağıdaki kayıtlar olduğu gibi listelendi.",
  EXTERNAL_TRANSFER_NOT_READY: "Dino henüz yapılandırılmadı; aşağıdaki kayıtlar olduğu gibi listelendi.",
  COST_CONFIG_MISSING: "Dino yapılandırması eksik; aşağıdaki kayıtlar olduğu gibi listelendi.",
  DAILY_QUOTA: "Bugünkü Dino hakkın doldu; aşağıdaki kayıtlar olduğu gibi listelendi.",
  NO_SOURCE_DATA: "Bu soru için henüz kayıtlı veri yok.",
  PROMPT_INJECTION: "Kayıtlarda beklenmedik bir içerik bulundu; güvenlik için yorum üretilmedi.",
};

export function DinoChat({
  audience,
  questions,
  studentId,
}: {
  audience: "STUDENT" | "PARENT" | "TEACHER";
  questions: DinoQuestionOption[];
  /** Veli ve eğitmen için hangi öğrenci sorulduğu. */
  studentId?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: DinoQuestionOption) {
    if (busy) return;
    setBusy(question.key);
    setError(null);
    try {
      const response = await fetch("/api/panel/dino", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audience,
          questionKey: question.key,
          studentId,
          requestKey: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { answer?: Record<string, unknown>; error?: string }
        | null;

      if (!response.ok || !payload?.answer) {
        setError(payload?.error || "Dino şu anda yanıt veremedi.");
        return;
      }

      const answer = payload.answer;
      const content = answer.answer as { text?: string } | null;
      const refs = Array.isArray(answer.sourceRefs)
        ? (answer.sourceRefs as Array<{ label?: string }>)
        : [];
      const reason = typeof answer.fallbackReason === "string" ? answer.fallbackReason : null;
      const nba = Array.isArray(payload.answer?.nextBestActions)
        ? (payload.answer.nextBestActions as Array<{ key?: string; title?: string; explanation?: string; action?: { href?: string } }>)
        : [];

      setTurns((current) => [
        ...current,
        {
          question: question.label,
          text: content?.text || "",
          sources: refs.map((ref) => ref.label || "").filter(Boolean),
          fromModel: answer.provider === "GEMINI" || answer.provider === "OPENAI",
          note: reason ? (FALLBACK_NOTE[reason] ?? "Bu yanıt model tarafından üretilmedi.") : null,
          nextBestActions: nba
            .map((item) => ({
              key: item.key || crypto.randomUUID(),
              title: item.title || "Sonraki adım",
              explanation: item.explanation || "",
              href: item.action?.href || "",
            }))
            .filter((item) => item.href),
        },
      ]);
    } catch {
      setError("Bağlantı kurulamadı.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <button
            key={question.key}
            type="button"
            disabled={busy !== null}
            onClick={() => void ask(question)}
            className="rounded-full border border-[#DDE4E0] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-dc-ink transition-colors hover:border-dc-brand disabled:opacity-60"
          >
            {busy === question.key ? "Hazırlanıyor…" : question.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-[13.5px] font-semibold text-[#C2493D]">
          {error}
        </p>
      ) : null}

      <div aria-live="polite" className="mt-5 flex flex-col gap-4">
        {turns.map((turn, index) => (
          <article key={index} className="rounded-[14px] border border-dc-line bg-white p-[22px]">
            <p className="text-[12.5px] font-semibold text-dc-ink-faint">{turn.question}</p>
            <p className="mt-2 text-[14.5px] leading-[1.7] text-dc-ink-body">{turn.text}</p>

            {turn.note ? (
              <p className="mt-3 rounded-[10px] border border-dc-line-soft bg-[#FCFDFC] px-3.5 py-2.5 text-[12.5px] text-dc-ink-muted">
                {turn.note}
              </p>
            ) : null}

            {turn.sources.length ? (
              <p className="mt-3 text-[12.5px] text-dc-ink-faint">
                Kaynak: {turn.sources.join(" · ")}
                {turn.fromModel ? "" : " · model yorumu değil"}
              </p>
            ) : null}
            {turn.nextBestActions.length ? (
              <div className="mt-4 grid gap-2">
                {turn.nextBestActions.slice(0, 2).map((action) => (
                  <a key={action.key} href={action.href} className="rounded-xl border border-dc-line-soft bg-[#FCFDFC] px-3 py-2 text-[12.5px] font-semibold text-dc-ink">
                    <span className="block">{action.title}</span>
                    {action.explanation ? <span className="mt-0.5 block text-[12px] font-normal text-dc-ink-muted">{action.explanation}</span> : null}
                  </a>
                ))}
              </div>
            ) : null}
          </article>
        ))}

        {turns.length === 0 ? (
          <p className="text-[13.5px] text-dc-ink-muted">
            Yukarıdaki sorulardan birini seçtiğinde Dino, panelindeki kendi kayıtlarını
            özetler. Yalnız bu sorular sorulabilir; Dino serbest sohbet yapmaz.
          </p>
        ) : null}
      </div>
    </div>
  );
}
