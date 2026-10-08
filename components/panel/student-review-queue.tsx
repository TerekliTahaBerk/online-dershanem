"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { sendPanelEvent } from "@/lib/panel-event-client";

export type StudentReviewItemView = {
  id: string;
  title: string;
  sourceReference: string;
  solutionNote: string;
  stage: number;
  dueAt: string;
  sourceType: "MOCK_EXAM_SECTION" | "LESSON_OUTCOME" | "TEACHER_REFERENCE";
};
function band(count: number) {
  return count === 0
    ? ("0" as const)
    : count <= 5
      ? ("1-5" as const)
      : count <= 20
        ? ("6-20" as const)
        : ("21+" as const);
}

export function StudentReviewQueue({
  initialItems,
  activeCount,
  masteredCount,
}: {
  initialItems: StudentReviewItemView[];
  activeCount: number;
  masteredCount: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(
      initialItems.map((item) => [item.id, item.solutionNote]),
    ),
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    sendPanelEvent({
      name: "review_queue_viewed",
      properties: {
        actorRole: "STUDENT",
        dueCountBand: band(initialItems.length),
        activeCountBand: band(activeCount),
      },
    });
  }, [activeCount, initialItems.length]);
  async function respond(
    item: StudentReviewItemView,
    response: "WRONG" | "UNSURE" | "CORRECT",
  ) {
    setBusy(item.id);
    setMessage("");
    const idempotencyKey = `review_${item.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      const result = await fetch(`/api/panel/review-queue/${item.id}/respond`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          response,
          solutionNote: notes[item.id],
          idempotencyKey,
        }),
      });
      const body = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(body.error || "Tekrar kaydedilemedi.");
      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
      setMessage(
        body.status === "MASTERED"
          ? "Bu çalışma 30 günlük geri çağırmayı da tamamladı. Geçmişin korunuyor."
          : response === "CORRECT"
            ? "Güzel; bir sonraki dönüş daha ileri bir tarihe yerleşti."
            : response === "UNSURE"
              ? "Emin olmamak normal; daha yakın bir tarihte yeniden bakacağız."
              : "Bu işaret yalnız daha yakın tekrar planlar; ilerlemen silinmedi.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Tekrar kaydedilemedi.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function defer(item: StudentReviewItemView) {
    setBusy(item.id);
    const result = await fetch(`/api/panel/review-queue/${item.id}/defer`, {
      method: "POST",
    });
    if (result.ok) {
      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
      setMessage("Bugünlük ertelendi; yarın yeniden görebilirsin.");
    } else
      setMessage(
        (await result.json().catch(() => ({}))).error || "Erteleme yapılamadı.",
      );
    setBusy(null);
  }
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="panel-metric-card">
          <RotateCcw size={18} className="text-(--brand-olive)" />
          <p className="mt-4 text-3xl font-extrabold">{items.length}</p>
          <p className="mt-1 text-xs text-(--site-muted)">
            Bugünkü küçük tekrar
          </p>
        </article>
        <article className="panel-metric-card">
          <CalendarClock size={18} className="text-sky-700" />
          <p className="mt-4 text-3xl font-extrabold">{activeCount}</p>
          <p className="mt-1 text-xs text-(--site-muted)">
            Zamana yayılmış aktif öğe
          </p>
        </article>
        <article className="panel-metric-card">
          <CheckCircle2 size={18} className="text-emerald-700" />
          <p className="mt-4 text-3xl font-extrabold">{masteredCount}</p>
          <p className="mt-1 text-xs text-(--site-muted)">
            30 günlük dönüşü tamamlanan
          </p>
        </article>
      </section>
      {message ? (
        <p
          role="status"
          className="rounded-2xl bg-(--brand-olive-soft) p-4 text-xs font-bold leading-5 text-(--brand-olive)"
        >
          {message}
        </p>
      ) : null}
      <section className="space-y-4">
        {items.map((item, index) => (
          <article key={item.id} className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-(--brand-olive)">
                  Bugünün {index + 1}. tekrarı ·{" "}
                  {item.sourceType === "MOCK_EXAM_SECTION"
                    ? "Deneme dönüşü"
                    : item.sourceType === "LESSON_OUTCOME"
                      ? "Ders dönüşü"
                      : "Öğretmen kaynağı"}
                </span>
                <h2 className="mt-2 text-sm font-extrabold leading-6">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs text-(--site-muted)">
                  Kaynak: {item.sourceReference}
                </p>
              </div>
              <HelpCircle
                size={18}
                className="shrink-0 text-(--brand-olive)"
              />
            </div>
            <label className="pn-field mt-4">
              Kritik çözüm adımım (isteğe bağlı)
              <textarea
                value={notes[item.id] || ""}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                maxLength={500}
                placeholder="Cevabı değil, bir sonraki denemede hatırlamak istediğin adımı yaz."
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                disabled={busy === item.id}
                onClick={() => void respond(item, "WRONG")}
                className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover min-h-10 px-3.5 text-[13.5px]"
              >
                Henüz oturmadı
              </button>
              <button
                disabled={busy === item.id}
                onClick={() => void respond(item, "UNSURE")}
                className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover min-h-10 px-3.5 text-[13.5px]"
              >
                Emin değilim
              </button>
              <button
                disabled={busy === item.id}
                onClick={() => void respond(item, "CORRECT")}
                className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-[13.5px]"
              >
                Doğru hatırladım
              </button>
              <button
                disabled={busy === item.id}
                onClick={() => void defer(item)}
                className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover min-h-10 px-3.5 text-[13.5px]"
              >
                Bugün ertele
              </button>
            </div>
          </article>
        ))}
        {!items.length ? (
          <article className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-8 text-center">
            <CheckCircle2 size={25} className="mx-auto text-emerald-600" />
            <h2 className="mt-3 text-sm font-extrabold">
              Bugünün küçük tekrarları tamam.
            </h2>
            <p className="mt-2 text-xs leading-5 text-(--site-muted)">
              Yeni bir öğe zamanı geldiğinde burada en fazla beş çalışma
              göreceksin.
            </p>
          </article>
        ) : null}
      </section>
    </div>
  );
}
