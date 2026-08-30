"use client";

import { useState } from "react";

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
  PROVIDER_DISABLED: "Dino şu anda kapalı; yalnız kayıtlar gösteriliyor.",
  EXTERNAL_TRANSFER_NOT_READY: "Dino henüz yapılandırılmadı; yalnız kayıtlar gösteriliyor.",
  COST_CONFIG_MISSING: "Dino yapılandırması eksik; yalnız kayıtlar gösteriliyor.",
  DAILY_QUOTA: "Bugünkü Dino hakkın doldu; yalnız kayıtlar gösteriliyor.",
  NO_SOURCE_DATA: "Bu sinyal için henüz kayıtlı veri yok.",
  PROMPT_INJECTION: "Kayıtlarda beklenmedik içerik bulundu; güvenlik için yorum üretilmedi.",
};

export function DinoExplanationAction({
  deterministicReason,
  questionKey,
}: {
  deterministicReason: string;
  questionKey: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [fromModel, setFromModel] = useState(false);

  async function explainWithDino() {
    if (loading || text) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/panel/dino", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audience: "STUDENT",
          questionKey,
          requestKey: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as DinoAnswerPayload | null;
      if (!response.ok || !payload?.answer) {
        setError(payload?.error || "Dino şu anda açıklama üretemedi.");
        return;
      }
      const answerText = payload.answer.answer?.text?.trim() || "";
      const labels = (payload.answer.sourceRefs || []).map((item) => item.label || "").filter(Boolean);
      const fallbackReason = payload.answer.fallbackReason || null;
      setText(answerText || "Dino bu sinyal için açıklama üretemedi.");
      setSources(labels);
      setFromModel(payload.answer.provider === "GEMINI" || payload.answer.provider === "OPENAI");
      setNote(fallbackReason ? (FALLBACK_NOTE[fallbackReason] ?? "Bu açıklama model tarafından üretilmedi.") : null);
    } catch {
      setError("Bağlantı kurulamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="text-[12.5px] font-semibold text-dc-ink-muted underline underline-offset-2"
      >
        Neden bunu öneriyoruz?
      </button>
      {open ? (
        <div className="mt-2 rounded-xl border border-dc-line-soft bg-[#FCFDFC] p-3">
          <p className="text-[13px] text-dc-ink-body">{deterministicReason}</p>
          <button
            type="button"
            onClick={() => void explainWithDino()}
            disabled={loading || Boolean(text)}
            className="mt-2 text-[12.5px] font-semibold text-dc-brand-strong disabled:opacity-70"
          >
            {loading ? "Dino açıklıyor…" : text ? "Dino açıklaması alındı" : "Dino ile açıkla"}
          </button>
          {error ? <p className="mt-2 text-[12.5px] font-semibold text-[#C2493D]">{error}</p> : null}
          {text ? <p className="mt-2 text-[13px] leading-6 text-dc-ink-body">{text}</p> : null}
          {note ? <p className="mt-2 text-[12px] text-dc-ink-muted">{note}</p> : null}
          {sources.length ? (
            <p className="mt-2 text-[12px] text-dc-ink-faint">
              Kaynak: {sources.join(" · ")}
              {fromModel ? "" : " · model yorumu değil"}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

