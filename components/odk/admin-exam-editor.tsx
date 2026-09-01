"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OdkExamStatus, OdkExamVersionStatus } from "@prisma/client";
import { AlertTriangle, CheckCircle2, FileUp, LockKeyhole, Save, Send } from "lucide-react";
import { OdkStatusBadge } from "@/components/odk/odk-status-badge";
import { examStatusPresentation } from "@/lib/odk/presentation";

type Outcome = { id: string; label: string };
type Question = { id: string; questionNumber: number; correctOption: "A" | "B" | "C" | "D" | "E" | null; difficulty: "EASY" | "MEDIUM" | "HARD"; bookletPage: number | null; outcomeIds: string[]; primaryOutcomeId: string | null };
type Issue = { level: "error" | "warning"; code: string; message: string; questionNumber?: number };
type Security = { fullscreenMode: "OFF" | "SUGGESTED" | "REQUIRED"; blockCopyPaste: boolean; logCopyPaste: boolean; trackVisibility: boolean; allowExtraTimeMinutes: number; autoSubmit: boolean };
type Props = {
  exam: {
    id: string;
    title: string;
    family: string;
    status: OdkExamStatus;
    startsAt: string;
    endsAt: string;
    lateEntryMinutes: number;
    meetRequired: boolean;
    meetUrl: string;
    versionStatus: OdkExamVersionStatus;
    durationMinutes: number;
    files: { id: string; type: string; fileName: string }[];
    questions: Question[];
    security: Security;
  };
  outcomes: Outcome[];
  issues: Issue[];
  resultStats: { attemptCount: number; submittedCount: number; scoredCount: number; examEnded: boolean; integrityReviewCount?: number };
};

export function AdminExamEditor({ exam, outcomes, issues, resultStats }: Props) {
  const router = useRouter();
  const editable = exam.status === "DRAFT" && exam.versionStatus === "DRAFT";
  const [questions, setQuestions] = useState(exam.questions);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState("");
  const errors = issues.filter((issue) => issue.level === "error").length;
  const warnings = issues.filter((issue) => issue.level === "warning").length;
  const presentation = examStatusPresentation[exam.status];

  async function json(url: string, method: string, body?: unknown, success = "Kaydedildi.") {
    setBusy(url); setMessage(null);
    try {
      const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ text: result.error || "İşlem tamamlanamadı.", error: true });
        return null;
      }
      setMessage({ text: success, error: false });
      router.refresh();
      return result;
    } catch {
      setMessage({ text: "Bağlantı kurulamadı. Değişiklik kaydedilmedi; tekrar deneyin.", error: true });
      return null;
    } finally {
      setBusy("");
    }
  }

  async function saveQuestions() { await json(`/api/odk/admin/exams/${exam.id}/questions`, "PUT", { questions }, "Cevaplar ve kazanımlar kaydedildi."); }
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("upload"); setMessage(null);
    const form = event.currentTarget;
    try {
      const response = await fetch(`/api/odk/admin/exams/${exam.id}/files`, { method: "POST", body: new FormData(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage({ text: result.error || "PDF yüklenemedi.", error: true });
      form.reset();
      setMessage({ text: "PDF özel depoya yüklendi.", error: false });
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı. PDF yüklenmedi; tekrar deneyin.", error: true });
    } finally {
      setBusy("");
    }
  }
  function patchQuestion(index: number, patch: Partial<Question>) { setQuestions((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item)); }

  function questionControls(question: Question, index: number, compact = false) {
    return <>
      <label className={compact ? "panel-field" : "contents"}>{compact ? "Doğru cevap" : <span className="sr-only">Soru {question.questionNumber} doğru cevap</span>}<select aria-label={`Soru ${question.questionNumber} doğru cevap`} disabled={!editable} className="panel-input py-2" value={question.correctOption || ""} onChange={(event) => patchQuestion(index, { correctOption: (event.target.value || null) as Question["correctOption"] })}><option value="">Seçin</option>{["A", "B", "C", "D", "E"].map((option) => <option key={option}>{option}</option>)}</select></label>
      <label className={compact ? "panel-field" : "contents"}>{compact ? "Zorluk" : <span className="sr-only">Soru {question.questionNumber} zorluk</span>}<select aria-label={`Soru ${question.questionNumber} zorluk`} disabled={!editable} className="panel-input py-2" value={question.difficulty} onChange={(event) => patchQuestion(index, { difficulty: event.target.value as Question["difficulty"] })}><option value="EASY">Kolay</option><option value="MEDIUM">Orta</option><option value="HARD">Zor</option></select></label>
      <label className={compact ? "panel-field" : "contents"}>{compact ? "PDF sayfası" : <span className="sr-only">Soru {question.questionNumber} PDF sayfası</span>}<input aria-label={`Soru ${question.questionNumber} PDF sayfası`} disabled={!editable} className="panel-input py-2" type="number" min={1} value={question.bookletPage || ""} onChange={(event) => patchQuestion(index, { bookletPage: Number(event.target.value) || null })} /></label>
      <label className={compact ? "panel-field sm:col-span-3" : "contents"}>{compact ? "Ana kazanım" : <span className="sr-only">Soru {question.questionNumber} ana kazanım</span>}<select aria-label={`Soru ${question.questionNumber} ana kazanım`} disabled={!editable} className="panel-input min-w-0 py-2" value={question.primaryOutcomeId || ""} onChange={(event) => { const primary = event.target.value || null; patchQuestion(index, { primaryOutcomeId: primary, outcomeIds: primary ? [...new Set([...question.outcomeIds, primary])] : question.outcomeIds }); }}><option value="">Kazanım seçin</option>{outcomes.map((outcome) => <option key={outcome.id} value={outcome.id}>{outcome.label}</option>)}</select></label>
    </>;
  }

  return <div className="space-y-6">
    <section className="sticky top-[76px] z-20 rounded-2xl border border-[var(--site-line)] bg-white/95 p-3 shadow-sm backdrop-blur lg:top-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><nav aria-label="Deneme hazırlama adımları" className="panel-nav-scroll flex gap-2 overflow-x-auto">{[
        ["1", "Plan", "adim-1"],
        ["2", "PDF", "adim-2"],
        ["3", "Cevaplar", "adim-3"],
        ["4", "Kazanım", "adim-json"],
        ["5", "Güvenlik", "adim-8"],
        ["6", "Öğrenci", "adim-7"],
        ["7", "Önizleme", "adim-9"],
        ["8", "Kontrol", "adim-4"],
        ["9", "Sonuç", "adim-sonuc"],
        ["10", "Integrity", "adim-integrity"],
      ].map(([index, label, href]) => <a key={href} href={`#${href}`} className="min-w-fit rounded-xl bg-[var(--site-bg-warm)] px-3 py-2 text-[11px] font-extrabold text-[var(--site-body)]"><span className="mr-1 text-[var(--brand-olive)]">{index}.</span>{label}</a>)}</nav><div className="flex items-center gap-2"><OdkStatusBadge label={presentation.label} tone={presentation.tone} pulse={exam.status === "LIVE"} />{errors ? <OdkStatusBadge label={`${errors} bloke`} tone="danger" /> : warnings ? <OdkStatusBadge label={`${warnings} uyarı`} tone="warning" /> : <OdkStatusBadge label="Kontroller hazır" tone="success" />}</div></div>
    </section>

    {message ? <p role={message.error ? "alert" : "status"} className={`rounded-2xl p-3 text-xs font-bold ${message.error ? "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]" : "bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"}`}>{message.text}</p> : null}

    <section id="adim-1" className="panel-surface scroll-mt-36 p-5 sm:p-6"><div><h2 className="text-sm font-extrabold">1. Planlama bilgileri</h2><p className="mt-1 text-xs text-[var(--site-muted)]">Saatler cihazınızın yerel saatine göre girilir; sunucu sınav anında yeniden doğrular.</p></div><form className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const starts = String(data.get("startsAt") || ""); const ends = String(data.get("endsAt") || ""); await json(`/api/odk/admin/exams/${exam.id}`, "PATCH", { title: data.get("title"), startsAt: starts ? new Date(starts).toISOString() : null, endsAt: ends ? new Date(ends).toISOString() : null, lateEntryMinutes: Number(data.get("lateEntryMinutes")), meetRequired: data.get("meetRequired") === "on", meetUrl: data.get("meetUrl") || null }, "Planlama bilgileri kaydedildi."); }}>
      <label className="panel-field">Deneme adı<input name="title" defaultValue={exam.title} required disabled={!editable && exam.status !== "READY"} /></label><label className="panel-field">Başlangıç<input name="startsAt" type="datetime-local" defaultValue={exam.startsAt} disabled={exam.status !== "DRAFT" && exam.status !== "READY"} /></label><label className="panel-field">Genel bitiş<input name="endsAt" type="datetime-local" defaultValue={exam.endsAt} disabled={exam.status !== "DRAFT" && exam.status !== "READY"} /></label><label className="panel-field">Geç giriş (dakika)<input name="lateEntryMinutes" type="number" min={0} max={120} defaultValue={exam.lateEntryMinutes} disabled={exam.status !== "DRAFT" && exam.status !== "READY"} /></label><label className="panel-field">Meet bağlantısı<input name="meetUrl" type="url" placeholder="https://meet.google.com/..." defaultValue={exam.meetUrl} disabled={exam.status !== "DRAFT" && exam.status !== "READY"} /></label><label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--site-line)] px-3 text-xs font-bold"><input name="meetRequired" type="checkbox" defaultChecked={exam.meetRequired} disabled={exam.status !== "DRAFT" && exam.status !== "READY"} className="h-4 w-4" /> Meet katılımı zorunlu</label>{exam.status === "DRAFT" || exam.status === "READY" ? <button disabled={Boolean(busy)} className="panel-primary-button md:col-span-2 xl:col-span-3"><Save size={14} /> Planı kaydet</button> : <p className="rounded-xl bg-slate-50 p-3 text-xs text-[var(--site-muted)] md:col-span-2 xl:col-span-3">Planlama kilitlendi. İçerik ve sınav kayıtları korunuyor.</p>}
    </form></section>

    <section id="adim-8" className="panel-surface scroll-mt-36 p-5 sm:p-6">
      <h2 className="text-sm font-extrabold">8. Güvenlik politikası</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Client engeller güvenlik garantisi değildir; amaç davranışsal sinyal üretmektir.</p>
      <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        await json(`/api/odk/admin/exams/${exam.id}`, "PATCH", {
          title: exam.title,
          startsAt: exam.startsAt ? new Date(exam.startsAt).toISOString() : null,
          endsAt: exam.endsAt ? new Date(exam.endsAt).toISOString() : null,
          lateEntryMinutes: exam.lateEntryMinutes,
          meetRequired: exam.meetRequired,
          meetUrl: exam.meetUrl || null,
          autoSubmit: data.get("autoSubmit") === "on",
          security: {
            fullscreenMode: String(data.get("fullscreenMode") || "SUGGESTED"),
            blockCopyPaste: data.get("blockCopyPaste") === "on",
            logCopyPaste: data.get("logCopyPaste") === "on",
            trackVisibility: data.get("trackVisibility") === "on",
            allowExtraTimeMinutes: Number(data.get("allowExtraTimeMinutes") || 0),
            autoSubmit: data.get("autoSubmit") === "on",
          },
        }, "Güvenlik politikası kaydedildi.");
      }}>
        <label className="panel-field">Tam ekran
          <select name="fullscreenMode" defaultValue={exam.security.fullscreenMode} disabled={exam.status !== "DRAFT" && exam.status !== "READY"}>
            <option value="OFF">Kapalı</option>
            <option value="SUGGESTED">Önerilir</option>
            <option value="REQUIRED">İstenir</option>
          </select>
        </label>
        <label className="panel-field">Ek süre (dk)<input name="allowExtraTimeMinutes" type="number" min={0} max={60} defaultValue={exam.security.allowExtraTimeMinutes} disabled={exam.status !== "DRAFT" && exam.status !== "READY"} /></label>
        <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--site-line)] px-3 text-xs font-bold"><input name="autoSubmit" type="checkbox" defaultChecked={exam.security.autoSubmit} disabled={exam.status !== "DRAFT" && exam.status !== "READY"} className="h-4 w-4" /> Süre bitince otomatik teslim</label>
        <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--site-line)] px-3 text-xs font-bold"><input name="blockCopyPaste" type="checkbox" defaultChecked={exam.security.blockCopyPaste} disabled={exam.status !== "DRAFT" && exam.status !== "READY"} className="h-4 w-4" /> Kopyala/yapıştır sınırla</label>
        <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--site-line)] px-3 text-xs font-bold"><input name="logCopyPaste" type="checkbox" defaultChecked={exam.security.logCopyPaste} disabled={exam.status !== "DRAFT" && exam.status !== "READY"} className="h-4 w-4" /> Kopyala denemesini logla</label>
        <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--site-line)] px-3 text-xs font-bold"><input name="trackVisibility" type="checkbox" defaultChecked={exam.security.trackVisibility} disabled={exam.status !== "DRAFT" && exam.status !== "READY"} className="h-4 w-4" /> Sekme görünürlüğünü izle</label>
        {exam.status === "DRAFT" || exam.status === "READY" ? <button disabled={Boolean(busy)} className="panel-primary-button md:col-span-2 xl:col-span-3"><Save size={14} /> Güvenliği kaydet</button> : null}
      </form>
    </section>

    <section id="adim-2" className="panel-surface scroll-mt-36 p-5 sm:p-6"><h2 className="text-sm font-extrabold">2. Özel PDF dosyaları</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Kitapçık sınav sırasında, cevap anahtarı yalnız sonuçlar açıklandıktan sonra yetkili öğrenciye sunulur.</p><div className="mt-4 flex flex-wrap gap-2">{exam.files.map((file) => <a key={file.id} href={`/api/odk/admin/files/${file.id}`} target="_blank" rel="noreferrer" className="panel-quick-action">{file.type === "BOOKLET_PDF" ? "Kitapçık" : "Cevap anahtarı"}: {file.fileName}</a>)}{!exam.files.length ? <p className="text-xs font-bold text-amber-800">Henüz PDF yüklenmedi.</p> : null}</div>{editable ? <form className="mt-4 grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-end" onSubmit={(event) => void upload(event)}><label className="panel-field">Dosya türü<select name="type"><option value="BOOKLET_PDF">Öğrenci kitapçığı</option><option value="ANSWER_KEY_PDF">Cevap anahtarı PDF</option></select></label><label className="panel-field">PDF dosyası<input name="file" type="file" accept="application/pdf,.pdf" required className="rounded-xl border border-[var(--site-line)] bg-white p-2 text-xs" /></label><button disabled={busy === "upload"} className="panel-primary-button"><FileUp size={14} /> PDF yükle</button></form> : null}</section>

    <section id="adim-3" className="panel-surface scroll-mt-36 p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-sm font-extrabold">3. Cevaplar ve kazanımlar</h2><p className="mt-1 text-xs text-[var(--site-muted)]">Her soruya doğru cevap ve ana kazanım girin.</p></div>{editable ? <button type="button" onClick={() => void saveQuestions()} disabled={Boolean(busy)} className="panel-primary-button"><Save size={14} /> Soruları kaydet</button> : null}</div>
      <div className="mt-4 space-y-3 md:hidden">{questions.map((question, index) => <article key={question.id} className="rounded-2xl border border-[var(--site-line)] bg-white p-4"><h3 className="text-sm font-extrabold">Soru {question.questionNumber}</h3><div className="mt-3 grid gap-3 sm:grid-cols-3">{questionControls(question, index, true)}</div></article>)}</div>
      <div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full min-w-[860px] text-xs"><thead><tr className="text-left text-[10px] uppercase tracking-wide text-[var(--site-muted)]"><th className="pb-2">Soru</th><th>Cevap</th><th>Zorluk</th><th>PDF sayfa</th><th>Ana kazanım</th></tr></thead><tbody>{questions.map((question, index) => <tr key={question.id} className="border-t border-[var(--site-line)]"><th className="py-2 pr-3 text-left">{question.questionNumber}</th><td className="w-28 pr-2"><select aria-label={`Soru ${question.questionNumber} doğru cevap`} disabled={!editable} className="panel-input py-2" value={question.correctOption || ""} onChange={(event) => patchQuestion(index, { correctOption: (event.target.value || null) as Question["correctOption"] })}><option value="">Seçin</option>{["A", "B", "C", "D", "E"].map((option) => <option key={option}>{option}</option>)}</select></td><td className="w-28 pr-2"><select aria-label={`Soru ${question.questionNumber} zorluk`} disabled={!editable} className="panel-input py-2" value={question.difficulty} onChange={(event) => patchQuestion(index, { difficulty: event.target.value as Question["difficulty"] })}><option value="EASY">Kolay</option><option value="MEDIUM">Orta</option><option value="HARD">Zor</option></select></td><td className="w-24 pr-2"><input aria-label={`Soru ${question.questionNumber} PDF sayfası`} disabled={!editable} className="panel-input py-2" type="number" min={1} value={question.bookletPage || ""} onChange={(event) => patchQuestion(index, { bookletPage: Number(event.target.value) || null })} /></td><td><select aria-label={`Soru ${question.questionNumber} ana kazanım`} disabled={!editable} className="panel-input min-w-80 py-2" value={question.primaryOutcomeId || ""} onChange={(event) => { const primary = event.target.value || null; patchQuestion(index, { primaryOutcomeId: primary, outcomeIds: primary ? [...new Set([...question.outcomeIds, primary])] : question.outcomeIds }); }}><option value="">Kazanım seçin</option>{outcomes.map((outcome) => <option key={outcome.id} value={outcome.id}>{outcome.label}</option>)}</select></td></tr>)}</tbody></table></div>
      {!outcomes.length ? <p className="mt-3 rounded-xl bg-[var(--pd-pastel-yellow-soft)] p-3 text-xs font-bold text-[var(--pd-pastel-yellow-ink)]">Bu sınav türü için aktif matematik kazanımı bulunamadı. Önce OD kazanım yönetiminden müfredatı etkinleştirin.</p> : null}
    </section>

    <section id="adim-4" className="panel-surface scroll-mt-36 p-5 sm:p-6"><h2 className="text-sm font-extrabold">4. Yayın kontrolleri</h2><div className="mt-3 space-y-2">{issues.map((issue, index) => <p key={`${issue.code}-${index}`} className={`flex items-start gap-2 rounded-xl p-3 text-xs font-bold ${issue.level === "error" ? "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]" : "bg-[var(--pd-pastel-yellow-soft)] text-[var(--pd-pastel-yellow-ink)]"}`}><AlertTriangle size={14} className="mt-0.5 shrink-0" />{issue.questionNumber ? `Soru ${issue.questionNumber}: ` : ""}{issue.message}</p>)}{!issues.length ? <p className="flex items-center gap-2 rounded-xl bg-[var(--pd-pastel-mint-soft)] p-3 text-xs font-bold text-[var(--pd-pastel-mint-ink)]"><CheckCircle2 size={15} /> Sürüm kilitlenmeye hazır.</p> : null}</div><div className="mt-4 flex flex-wrap gap-3">{exam.status === "DRAFT" ? <button type="button" disabled={errors > 0 || Boolean(busy)} onClick={() => { if (window.confirm("Sürüm kilitlendikten sonra cevap ve kazanımlar doğrudan değiştirilemez. Devam edilsin mi?")) void json(`/api/odk/admin/exams/${exam.id}/ready`, "POST", undefined, "Sürüm kilitlendi ve deneme hazırlandı."); }} className="panel-primary-button"><LockKeyhole size={14} /> Sürümü kilitle ve hazırla</button> : null}{exam.status === "READY" ? <button type="button" disabled={Boolean(busy)} onClick={() => { if (window.confirm("Deneme belirlenen tarih ve katılımcılar için planlansın mı?")) void json(`/api/odk/admin/exams/${exam.id}/schedule`, "POST", undefined, "Deneme planlandı."); }} className="panel-primary-button"><Send size={14} /> Denemeyi planla</button> : null}</div></section>

    <section id="adim-5" className="panel-surface scroll-mt-36 p-5 sm:p-6"><h2 className="text-sm font-extrabold">Puanlama kısayolu</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Detaylı sonuç tablosu ve yayın akışı aşağıda “Sonuç inceleme” bölümündedir.</p><div className="mt-4 grid gap-3 sm:grid-cols-4">{[["Katılım", resultStats.attemptCount], ["Teslim", resultStats.submittedCount], ["Puanlandı", resultStats.scoredCount], ["Integrity inceleme", resultStats.integrityReviewCount || 0]].map(([label, value]) => <div key={label} className="rounded-2xl bg-[var(--site-bg-warm)] p-4"><p className="text-xl font-black text-[var(--site-ink)]">{value}</p><p className="mt-1 text-xs text-[var(--site-muted)]">{label}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-3">{["SCHEDULED", "LIVE", "ENDED"].includes(exam.status) ? <button type="button" disabled={!resultStats.examEnded || Boolean(busy)} onClick={() => { if (window.confirm("Teslim edilen oturumlar kilitli cevap anahtarıyla puanlansın mı? Sonuçlar henüz öğrenciye açılmaz.")) void json(`/api/odk/admin/exams/${exam.id}/score`, "POST", undefined, "Teslimler puanlandı (yayınlanmadı)."); }} className="panel-primary-button"><CheckCircle2 size={14} /> Teslimleri puanla</button> : null}{exam.status === "SCORED" || exam.status === "ENDED" || exam.status === "RELEASED" ? <button type="button" disabled={Boolean(busy)} onClick={() => { if (window.confirm("Deneme yeniden puanlansın mı?")) void json(`/api/odk/admin/exams/${exam.id}/rescore`, "POST", { confirmPublishedChange: exam.status === "RELEASED", reason: "Admin rescore" }, "Yeniden puanlama tamamlandı."); }} className="panel-secondary-button">Yeniden puanla</button> : null}<a href="#adim-sonuc" className="panel-secondary-button"><Send size={14} /> Sonuç incelemesine git</a></div>{!resultStats.examEnded && ["SCHEDULED", "LIVE"].includes(exam.status) ? <p className="mt-3 text-xs font-bold text-amber-700">Puanlama sınavın genel bitiş saatinden sonra açılır.</p> : null}</section>
  </div>;
}
