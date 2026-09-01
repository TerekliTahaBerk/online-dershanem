"use client";
import { useState } from "react";
import { CheckCircle2, HeartHandshake, MessageCircleQuestion, Sparkles } from "lucide-react";
import { sendPanelEvent } from "@/lib/panel-event-client";

type Digest = {
  id: string;
  goodThingOne: string;
  goodThingTwo: string;
  supportArea: string;
  homeQuestion: string;
  dataThrough: string;
  trendBand: string;
  feedback: { helpful: boolean | null; anxietyPulse: number | null } | null;
};

export function CalmDigestCard({
  digest,
  viewerRole,
}: {
  digest: Digest;
  viewerRole: "STUDENT" | "PARENT";
}) {
  const [helpful, setHelpful] = useState<boolean | null>(digest.feedback?.helpful ?? null);
  const [anxietyPulse, setAnxietyPulse] = useState<number | null>(digest.feedback?.anxietyPulse ?? null);
  const [message, setMessage] = useState("");

  function trackParentAction(reasonCode: "HELPFUL" | "NOT_HELPFUL" | "ANXIETY_PULSE") {
    if (viewerRole !== "PARENT") return;
    sendPanelEvent({
      name: "parent_action_clicked",
      properties: {
        product: "PARENT",
        actionKind: "DIGEST_FEEDBACK",
        reasonCode,
        ageBand: "NA",
        evidenceBand: "NA",
        role: "PARENT",
      },
    });
  }

  async function save(nextHelpful = helpful, nextPulse = anxietyPulse) {
    const response = await fetch(`/api/panel/weekly-digests/${digest.id}/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ helpful: nextHelpful, anxietyPulse: nextPulse }),
    });
    setMessage(response.ok ? "Geri bildirimin kaydedildi." : "Geri bildirim kaydedilemedi.");
  }

  const goodTitle = viewerRole === "PARENT" ? "Neler iyi gidiyor?" : "İyi giden noktalar";
  const supportTitle =
    viewerRole === "PARENT" ? "Nerede destek gerekiyor?" : "Destek gereken tek küçük alan";
  const nextTitle =
    viewerRole === "PARENT" ? "Önümüzdeki hafta ne var?" : viewerRole === "STUDENT" ? "Ailenle paylaşabileceğin soru" : "Evde sorulabilecek bir soru";

  return (
    <section className="panel-surface overflow-hidden">
      <div className="bg-[linear-gradient(135deg,#f6f8ed,#fff_55%,#fff8dc)] p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.08em] text-[var(--brand-olive)]">
          <HeartHandshake size={16} /> Bu hafta, sakin bir bakış
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-.04em]">
          {viewerRole === "PARENT"
            ? "Öğretmenin yayınladığı haftalık özet"
            : "İki iyi giden nokta, bir küçük destek."}
        </h2>
        <p className="mt-2 text-xs text-[var(--site-muted)]">
          Veriler{" "}
          {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(
            new Date(digest.dataThrough),
          )}{" "}
          tarihine kadar güncel. Tek bir gün üzerinden kesin yargı kurulmaz.
        </p>
      </div>
      <div className="grid gap-4 p-5 sm:p-7 md:grid-cols-2">
        <article className="rounded-2xl bg-emerald-50 p-5 md:col-span-2">
          <CheckCircle2 size={18} className="text-emerald-700" />
          <p className="mt-3 text-xs font-extrabold uppercase tracking-[.06em] text-emerald-800">
            {goodTitle}
          </p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-emerald-950">
            <li>{digest.goodThingOne}</li>
            <li>{digest.goodThingTwo}</li>
          </ul>
        </article>
        <article className="rounded-2xl bg-[#fff9dc] p-5 md:col-span-2">
          <Sparkles size={18} className="text-amber-800" />
          <p className="mt-3 text-xs font-extrabold uppercase tracking-[.06em] text-amber-800">
            {supportTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-950">{digest.supportArea}</p>
        </article>
        <article className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 md:col-span-2">
          <MessageCircleQuestion size={18} className="text-violet-700" />
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[.06em] text-violet-800">
            {nextTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-violet-950">{digest.homeQuestion}</p>
        </article>
      </div>
      <div className="border-t border-[var(--site-line)] p-5 sm:p-7">
        <p className="text-xs font-bold">Bu özet size nasıl hissettirdi?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={helpful === true}
            onClick={() => {
              setHelpful(true);
              trackParentAction("HELPFUL");
              void save(true, anxietyPulse);
            }}
            className="panel-quick-action"
          >
            Yararlıydı
          </button>
          <button
            type="button"
            aria-pressed={helpful === false}
            onClick={() => {
              setHelpful(false);
              trackParentAction("NOT_HELPFUL");
              void save(false, anxietyPulse);
            }}
            className="panel-quick-action"
          >
            Yararlı değildi
          </button>
          <select
            aria-label="Özet kaygı düzeyi"
            value={anxietyPulse || ""}
            onChange={(event) => {
              const value = event.target.value ? Number(event.target.value) : null;
              setAnxietyPulse(value);
              if (value) {
                trackParentAction("ANXIETY_PULSE");
                void save(helpful, value);
              }
            }}
            className="panel-input max-w-56"
          >
            <option value="">Kaygı düzeyi (isteğe bağlı)</option>
            <option value="1">Hiç kaygı yaratmadı</option>
            <option value="2">Çok az</option>
            <option value="3">Dengeli</option>
            <option value="4">Biraz kaygı yarattı</option>
            <option value="5">Kaygı yarattı</option>
          </select>
        </div>
        <p aria-live="polite" className="mt-2 text-xs font-bold text-[var(--brand-olive)]">
          {message}
        </p>
      </div>
    </section>
  );
}
