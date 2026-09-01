"use client";

import { useId, useState } from "react";

type DinoAnswerPayload = {
  answer?: {
    answer?: { text?: string };
    sourceRefs?: Array<{ label?: string }>;
    provider?: string;
    fallbackReason?: string | null;
  };
  error?: string;
};

const FALLBACK_NOTE: Record<string, string> = {
  PROVIDER_DISABLED: "Dino açıklamayı şu anda hazırlayamadı. Dayanakları yine de görebilirsin.",
  EXTERNAL_TRANSFER_NOT_READY: "Dino açıklamayı şu anda hazırlayamadı. Dayanakları yine de görebilirsin.",
  COST_CONFIG_MISSING: "Dino açıklama yapılandırması eksik. Dayanakları yine de görebilirsin.",
  DAILY_QUOTA: "Bugünkü Dino açıklama hakkını kullandın.",
  NO_SOURCE_DATA: "Bu konuda açıklama yapmak için yeterli dayanak yok.",
  PROMPT_INJECTION: "Kayıtlarda beklenmedik içerik bulundu; güvenlik için yorum üretilmedi.",
};

export function DinoExplanationAction({
  deterministicReason,
  questionKey,
  audience = "STUDENT",
  studentId,
  openLabel = "Bu neden öneriliyor?",
  prepareLabel = "Dino açıklamasını hazırla",
}: {
  deterministicReason: string;
  questionKey: string;
  audience?: "STUDENT" | "PARENT" | "TEACHER";
  studentId?: string;
  openLabel?: string;
  prepareLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const disclosureId = useId();

  async function explainWithDino() {
    if (loading || text) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/panel/dino", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audience,
          questionKey,
          requestKey: crypto.randomUUID(),
          ...(studentId ? { studentId } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as DinoAnswerPayload | null;
      if (!response.ok || !payload?.answer) {
        setError(payload?.error || "Dino açıklamayı şu anda hazırlayamadı.");
        return;
      }
      const answerText = payload.answer.answer?.text?.trim() || "";
      const labels = (payload.answer.sourceRefs || []).map((item) => item.label || "").filter(Boolean);
      const fallbackReason = payload.answer.fallbackReason || null;
      setText(answerText || "Bu konuda açıklama yapmak için yeterli dayanak yok.");
      setSources(labels);
      setNote(fallbackReason ? (FALLBACK_NOTE[fallbackReason] ?? "Bu açıklama model tarafından üretilmedi.") : null);
    } catch {
      setError("Dino açıklamayı şu anda hazırlayamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={disclosureId}
        className="text-[12.5px] font-semibold text-dc-ink-muted underline underline-offset-2"
      >
        {openLabel}
      </button>
      {open ? (
        <div id={disclosureId} className="mt-2 rounded-xl border border-dc-line-soft bg-[#FCFDFC] p-3">
          <p className="text-[13px] text-dc-ink-body">{deterministicReason}</p>
          <p className="mt-1 text-[12px] text-dc-ink-faint">
            Ana bilgi kaynağı yukarıdaki özetdir. Dino isteğe bağlı bir açıklama katmanıdır.
          </p>
          <button
            type="button"
            onClick={() => void explainWithDino()}
            disabled={loading || Boolean(text)}
            className="mt-2 text-[12.5px] font-semibold text-dc-brand-strong disabled:opacity-70"
          >
            {loading
              ? "Dino açıklamayı hazırlıyor…"
              : text
                ? "Dino açıklaması hazır"
                : error
                  ? "Tekrar dene"
                  : prepareLabel}
          </button>
          {error ? <p className="mt-2 text-[12.5px] font-semibold text-[#C2493D]">{error}</p> : null}
          {text ? (
            <div aria-live="polite" className="mt-2">
              <p className="text-[12px] font-semibold text-dc-ink-faint">Dino açıklaması</p>
              <p className="mt-1 text-[13px] leading-6 text-dc-ink-body">{text}</p>
            </div>
          ) : null}
          {note ? <p className="mt-2 text-[12px] text-dc-ink-muted">{note}</p> : null}
          {sources.length ? (
            <div className="mt-2">
              <p className="text-[12px] font-semibold text-dc-ink-faint">Dayanaklar</p>
              <p className="mt-1 text-[12px] text-dc-ink-faint">{sources.join(" · ")}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
