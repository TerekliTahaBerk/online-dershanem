"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

type Option = "A" | "B" | "C" | "D" | "E";
type Question = { id: string; sectionCode: string; sectionTitle: string; questionNumber: number; correctOption: Option | null; isActive: boolean };
type Change = { questionId: string; action: "SET_ANSWER"; correctOption: Option } | { questionId: string; action: "CANCEL" };
type Revision = {
  id: string;
  revisionNumber: number;
  reason: string;
  actor: string;
  createdAt: string;
  rescore: "COMPLETED" | "PENDING" | "NOT_NEEDED";
  changes: Array<{ label: string; previous: string | null; next: string | null }>;
};
type Impact = {
  changedAttemptCount: number;
  publishedChangedCount: number;
  publishedResultsWillChange: boolean;
  changedAttempts: Array<{ attemptId: string; published: boolean; netBefore: number; netAfter: number }>;
};
type Preview = { answerKeyHash: string; requiresRescore: boolean; impact: Impact | null };

const OPTIONS: Option[] = ["A", "B", "C", "D", "E"];
const DATE_TIME = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const NET = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Kilitli denemede cevap anahtarı revizyonu (Faz 6, P0-2'nin arayüzü):
 * değişiklik listesi + gerekçe → etki önizlemesi (öğrenci başı net farkı) →
 * yayınlanmış sonuç değişiyorsa açık onay → uygula (step-up; puanlanmışsa
 * yeniden puanlanır ve neti değişen öğrenci bilgilendirilir). Önceki cevaplar
 * revizyon kaydında saklanır; geçmiş aşağıda listelenir.
 */
export function AdminAnswerKeyRevisionPanel({
  examId,
  questions,
  revisions,
  studentNames,
}: {
  examId: string;
  questions: Question[];
  revisions: Revision[];
  /** attemptId → öğrenci adı (etki tablosu için). */
  studentNames: Record<string, string>;
}) {
  const router = useRouter();
  const active = useMemo(() => questions.filter((question) => question.isActive), [questions]);
  const [questionId, setQuestionId] = useState(active[0]?.id ?? "");
  const [action, setAction] = useState<"SET_ANSWER" | "CANCEL">("SET_ANSWER");
  const [option, setOption] = useState<Option>("A");
  const [changes, setChanges] = useState<Change[]>([]);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean; stepUp?: boolean } | null>(null);
  const byId = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const label = (id: string) => {
    const question = byId.get(id);
    return question ? `${question.sectionCode} ${question.questionNumber}` : id;
  };

  function resetPreview() {
    setPreview(null);
    setConfirmed(false);
  }

  function addChange() {
    if (!questionId) return;
    const next: Change = action === "CANCEL" ? { questionId, action } : { questionId, action, correctOption: option };
    setChanges((current) => [...current.filter((item) => item.questionId !== questionId), next]);
    resetPreview();
  }

  async function request(method: "POST" | "PUT") {
    setBusy(true);
    setMessage(null);
    try {
      const body = method === "POST" ? { changes } : { changes, reason, expectedAnswerKeyHash: preview?.answerKeyHash, confirmPublishedChange: confirmed || undefined };
      const response = await fetch(`/api/odk/admin/exams/${examId}/answer-key-revisions`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 428) {
        setMessage({ text: result.error || "Bu işlem için kimliğinizi yeniden doğrulayın.", error: true, stepUp: true });
        return;
      }
      if (!response.ok) {
        if (result.code === "REVISION_STALE") resetPreview();
        setMessage({ text: result.error || "İşlem şu an tamamlanamadı. Lütfen tekrar dener misiniz?", error: true });
        return;
      }
      if (method === "POST") {
        setPreview(result);
        return;
      }
      setMessage({ text: result.rescored ? "Revizyon uygulandı ve deneme yeniden puanlandı." : result.rescore ? "Revizyon kaydedildi; yeniden puanlama tamamlanamadı, Puanlama'dan tekrar deneyin." : "Revizyon kaydedildi. Deneme puanlanınca yeni anahtar kullanılır.", error: !result.rescored && Boolean(result.rescore) });
      setChanges([]);
      setReason("");
      resetPreview();
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı. Hiçbir değişiklik uygulanmadı.", error: true });
    } finally {
      setBusy(false);
    }
  }

  const impact = preview?.impact ?? null;
  const needsConfirm = Boolean(impact?.publishedResultsWillChange);
  const canApply = Boolean(preview) && reason.trim().length >= 10 && (!needsConfirm || confirmed) && !busy;
  const field = "rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[13.5px] text-pn-text focus:border-pn-accent focus:outline-none";

  return (
    <section aria-labelledby="anahtar-revizyonu" className="rounded-[10px] border border-pn-border bg-white p-5 sm:p-6">
      <h2 id="anahtar-revizyonu" className="text-[15px] font-semibold text-pn-text">
        Cevap anahtarı revizyonu
      </h2>
      <p className="mt-1 text-[13px] leading-5 text-pn-text-muted">
        Kilitli denemede anahtar doğrudan değiştirilmez. Değişikliği ve gerekçesini girin, etkiyi önizleyin, onaylayın. İptal edilen soru tüm öğrenciler için değerlendirme dışı bırakılır. Önceki cevaplar revizyon kaydında saklanır.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[12.5px] font-medium text-pn-text-secondary">
          Soru
          <select value={questionId} aria-label="Soru" onChange={(event) => setQuestionId(event.target.value)} className={field}>
            {active.map((question) => (
              <option key={question.id} value={question.id}>
                {question.sectionCode} {question.questionNumber} · anahtar {question.correctOption ?? "—"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-medium text-pn-text-secondary">
          İşlem
          <select value={action} aria-label="İşlem" onChange={(event) => setAction(event.target.value as "SET_ANSWER" | "CANCEL")} className={field}>
            <option value="SET_ANSWER">Doğru cevabı değiştir</option>
            <option value="CANCEL">Soruyu iptal et</option>
          </select>
        </label>
        {action === "SET_ANSWER" ? (
          <label className="flex flex-col gap-1 text-[12.5px] font-medium text-pn-text-secondary">
            Yeni cevap
            <select value={option} aria-label="Yeni cevap" onChange={(event) => setOption(event.target.value as Option)} className={field}>
              {OPTIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="button" onClick={addChange} disabled={!questionId} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-pn-border-strong bg-white px-3 text-[13.5px] font-semibold hover:bg-pn-hover disabled:opacity-50">
          <Plus size={14} aria-hidden="true" /> Listeye ekle
        </button>
      </div>

      {changes.length ? (
        <ul aria-label="Revizyon değişiklikleri" className="mt-3 divide-y divide-pn-border-subtle rounded-md border border-pn-border text-[13.5px]">
          {changes.map((change) => {
            const question = byId.get(change.questionId);
            return (
              <li key={change.questionId} className="flex items-center justify-between gap-3 px-3 py-2">
                <span>
                  <span className="font-mono">{label(change.questionId)}</span>: {question?.correctOption ?? "—"} →{" "}
                  <strong>{change.action === "CANCEL" ? "İPTAL" : change.correctOption}</strong>
                </span>
                <button type="button" aria-label={`${label(change.questionId)} değişikliğini kaldır`} onClick={() => { setChanges((current) => current.filter((item) => item.questionId !== change.questionId)); resetPreview(); }} className="grid h-8 w-8 place-items-center rounded-md text-pn-text-muted hover:bg-pn-hover">
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <label className="mt-3 block text-[12.5px] font-medium text-pn-text-secondary">
        Gerekçe (en az 10 karakter; öğrenci/veli bildirimine ve denetim kaydına girer)
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} className={`mt-1 w-full ${field}`} />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void request("POST")} disabled={busy || !changes.length} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-pn-border-strong bg-white px-3.5 text-[13.5px] font-semibold hover:bg-pn-hover disabled:opacity-50">
          {busy && !preview ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null} Etkiyi önizle
        </button>
        <button type="button" onClick={() => void request("PUT")} disabled={!canApply} className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-dc-ink px-3.5 text-[13.5px] font-semibold text-white hover:bg-black disabled:opacity-50">
          {busy && preview ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null} Revizyonu uygula
        </button>
      </div>

      {preview ? (
        <div role="status" className="mt-3 rounded-md border border-pn-border px-3 py-2.5 text-[13.5px] text-pn-text">
          {impact ? (
            <>
              <p>
                <strong>{impact.changedAttemptCount}</strong> öğrencinin neti değişecek
                {impact.publishedChangedCount ? `; ${impact.publishedChangedCount} tanesi yayınlanmış sonuç` : ""}. Uygulayınca deneme yeniden puanlanır.
              </p>
              {impact.changedAttempts.length ? (
                <table className="mt-2 w-full text-[13px]">
                  <caption className="sr-only">Net değişimi</caption>
                  <thead>
                    <tr className="text-left text-pn-text-muted">
                      <th scope="col" className="py-1 font-medium">Öğrenci</th>
                      <th scope="col" className="py-1 font-medium">Önce</th>
                      <th scope="col" className="py-1 font-medium">Sonra</th>
                      <th scope="col" className="py-1 font-medium">Yayında</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impact.changedAttempts.slice(0, 50).map((row) => (
                      <tr key={row.attemptId} className="border-t border-pn-border-subtle">
                        <td className="py-1">{studentNames[row.attemptId] ?? "Öğrenci"}</td>
                        <td className="py-1 tabular-nums">{NET.format(row.netBefore)}</td>
                        <td className="py-1 font-semibold tabular-nums">{NET.format(row.netAfter)}</td>
                        <td className="py-1">{row.published ? "Evet" : "Hayır"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </>
          ) : (
            <p>Deneme henüz puanlanmadı: öğrenci neti etkilenmez, puanlama yeni anahtarla yapılır.</p>
          )}
          {needsConfirm ? (
            <label className="mt-2 flex items-start gap-2 font-semibold">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
              Yayınlanmış sonuçlar değişecek; neti değişen öğrenciler ve veliler bilgilendirilecek. Onaylıyorum.
            </label>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <p role={message.error ? "alert" : "status"} className={`mt-3 rounded-md px-3 py-2 text-[13px] font-semibold ${message.error ? "bg-(--pd-pastel-blush-soft) text-(--pd-pastel-blush-ink)" : "bg-pn-surface-subtle text-pn-text"}`}>
          {message.text}
          {message.stepUp ? (
            <a href="/panel/guvenlik" className="ml-2 underline underline-offset-2">
              Kimliği doğrula
            </a>
          ) : null}
        </p>
      ) : null}

      <h3 className="mt-6 text-[13.5px] font-semibold text-pn-text">Revizyon geçmişi</h3>
      {revisions.length ? (
        <ol aria-label="Revizyon geçmişi" className="mt-2 divide-y divide-pn-border-subtle rounded-md border border-pn-border text-[13px]">
          {revisions.map((revision) => (
            <li key={revision.id} className="px-3 py-2">
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-pn-text">
                  #{revision.revisionNumber} · {revision.actor}
                </span>
                <time dateTime={revision.createdAt} className="font-mono text-[12px] text-pn-text-muted">
                  {DATE_TIME.format(new Date(revision.createdAt))}
                </time>
              </p>
              <p className="mt-0.5 text-pn-text">
                {revision.changes.map((change) => `${change.label}: ${change.previous ?? "—"} → ${change.next === "CANCELLED" ? "İPTAL" : change.next ?? "—"}`).join(" · ")}
              </p>
              <p className="mt-0.5 text-pn-text-secondary">
                {revision.reason} · {revision.rescore === "COMPLETED" ? "yeniden puanlandı" : revision.rescore === "PENDING" ? "yeniden puanlama bekliyor" : "puanlama öncesi"}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-[13px] text-pn-text-muted">Bu sürümde revizyon yok.</p>
      )}
    </section>
  );
}
