"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { Textarea } from "@/components/panel/ui/form";

type Tab = "files" | "answer-key" | "outcomes" | "access" | "publish";

type FileInfo = { url: string; name: string; byteSize: number };

type ExamProps = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  totalSlots: number;
  officialAnswerCount: number;
  kazanimReady: number;
  kazanimMissingCount: number;
  bookletFile: FileInfo | null;
  answerKeyFile: FileInfo | null;
};

type TagInfo = { id: string; key: string; title: string; description: string | null };

type Props = {
  exam: ExamProps;
  availableTags: TagInfo[];
  linkedTagIds: string[];
};

const ANSWER_KEY_EXAMPLE = `[
  {
    "questionNumber": 1,
    "correctAnswer": "A",
    "subject": "Matematik",
    "topic": "Problemler",
    "learningOutcome": "Sayı problemlerini çözer"
  },
  {
    "questionNumber": 2,
    "correctAnswer": "C",
    "subject": "Türkçe",
    "topic": "Paragraf",
    "learningOutcome": "Paragrafta ana düşünceyi belirler"
  }
]`;

const OUTCOMES_EXAMPLE = `[
  {
    "questionNumber": 1,
    "examType": "TYT",
    "lesson": "Matematik",
    "unit": "Problemler",
    "topic": "Yaş Problemleri",
    "learningOutcomeCode": "TYT.MAT.01",
    "learningOutcome": "Yaş problemlerini denklem kurarak çözer",
    "difficulty": "medium"
  }
]`;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function ExamDetailEditor({ exam, availableTags, linkedTagIds: initialLinkedTagIds }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("files");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const bookletInputRef = useRef<HTMLInputElement | null>(null);
  const answerKeyPdfInputRef = useRef<HTMLInputElement | null>(null);

  const [answerKeyText, setAnswerKeyText] = useState("");
  const [outcomesText, setOutcomesText] = useState("");
  const [linkedTagIds, setLinkedTagIds] = useState<string[]>(initialLinkedTagIds);

  const showMsg = (kind: "ok" | "err", text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg((m) => (m?.text === text ? null : m)), 5000);
  };

  const uploadPdf = async (file: File, fileType: "BOOKLET_PDF" | "ANSWER_KEY_PDF") => {
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fileType", fileType);
      const res = await fetch(`/api/v1/odk/admin/exams/${exam.id}/files`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error ?? "Yükleme başarısız.");
      showMsg("ok", "Dosya yüklendi.");
      router.refresh();
    } catch (err) {
      showMsg("err", err instanceof Error ? err.message : "Hata.");
    } finally {
      setBusy(false);
    }
  };

  const submitAnswerKey = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const payload = JSON.parse(answerKeyText);
      const res = await fetch(`/api/v1/odk/admin/exams/${exam.id}/answer-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerKey: payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error ?? "Yükleme başarısız.");
      showMsg("ok", `Cevap anahtarı yüklendi (${json.data.inserted} soru).`);
      router.refresh();
    } catch (err) {
      showMsg("err", err instanceof Error ? err.message : "Hata.");
    } finally {
      setBusy(false);
    }
  };

  const submitOutcomes = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const payload = JSON.parse(outcomesText);
      const res = await fetch(`/api/v1/odk/admin/exams/${exam.id}/learning-outcomes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomes: payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error ?? "Yükleme başarısız.");
      showMsg("ok", `Kazanımlar güncellendi (${json.data.updated} soru).`);
      router.refresh();
    } catch (err) {
      showMsg("err", err instanceof Error ? err.message : "Hata.");
    } finally {
      setBusy(false);
    }
  };

  const saveTags = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/odk/admin/exams/${exam.id}/access-tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: linkedTagIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error ?? "Kaydedilemedi.");
      showMsg("ok", "Erişim tagları kaydedildi.");
      router.refresh();
    } catch (err) {
      showMsg("err", err instanceof Error ? err.message : "Hata.");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!confirm("Bu denemeyi yayına almak istediğine emin misin? Yayında olan denemenin bölümleri değiştirilemez.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/odk/admin/exams/${exam.id}/publish`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const issues = json?.details?.issues as string[] | undefined;
        throw new Error((json?.error ?? "Yayın başarısız.") + (issues ? `\n• ${issues.join("\n• ")}` : ""));
      }
      showMsg("ok", "Deneme yayında!");
      router.refresh();
    } catch (err) {
      showMsg("err", err instanceof Error ? err.message : "Hata.");
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    if (!confirm("Yayını durdurmak istediğine emin misin? (Mevcut çözümler etkilenmez)")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/odk/admin/exams/${exam.id}/publish`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error ?? "Hata.");
      showMsg("ok", "Yayın durduruldu, deneme tekrar TASLAK.");
      router.refresh();
    } catch (err) {
      showMsg("err", err instanceof Error ? err.message : "Hata.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Deneme yapılandırması"
        right={
          <div role="tablist" style={{ display: "flex", gap: 4 }}>
            {([
              ["files", "PDF"],
              ["answer-key", "Cevap Anahtarı"],
              ["outcomes", "Kazanım"],
              ["access", "Erişim"],
              ["publish", "Yayın"],
            ] as [Tab, string][]).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`od-btn ${tab === k ? "od-btn-primary" : "od-btn-ghost"}`}
                style={{ padding: "6px 10px", fontSize: 12 }}
              >{label}</button>
            ))}
          </div>
        }
      />
      <CardBody>
        {msg ? (
          <div style={{
            background: msg.kind === "ok" ? "#dcfce7" : "#fee2e2",
            color: msg.kind === "ok" ? "#166534" : "#991b1b",
            padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12,
            whiteSpace: "pre-wrap",
          }}>{msg.text}</div>
        ) : null}

        {/* PDF tab */}
        {tab === "files" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FileSlot
              title="Deneme PDF'i"
              description="Öğrencilerin sınav sırasında göreceği soru kitapçığı (zorunlu)."
              file={exam.bookletFile}
              onPick={() => bookletInputRef.current?.click()}
              busy={busy}
            />
            <input
              ref={bookletInputRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPdf(f, "BOOKLET_PDF");
                e.target.value = "";
              }}
            />

            <FileSlot
              title="Cevap Anahtarı PDF (opsiyonel)"
              description="Sınav sonrası göstermek için cevap çözüm dokümanı."
              file={exam.answerKeyFile}
              onPick={() => answerKeyPdfInputRef.current?.click()}
              busy={busy}
            />
            <input
              ref={answerKeyPdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPdf(f, "ANSWER_KEY_PDF");
                e.target.value = "";
              }}
            />
          </div>
        ) : null}

        {/* Cevap anahtarı tab */}
        {tab === "answer-key" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, color: "var(--pd-ink-2)", margin: 0 }}>
              Bölümlerin soru toplamı <strong>{exam.totalSlots}</strong>. Aynı sayıda sıralı cevap anahtarı yükleyin.
              Şu an kayıtlı cevap anahtarı sayısı: <strong>{exam.officialAnswerCount}</strong>.
            </p>
            <details>
              <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--pd-ink-3)" }}>Örnek formatı göster</summary>
              <pre style={{ background: "var(--pd-bg-subtle)", padding: 12, borderRadius: 8, fontSize: 12, overflow: "auto" }}>{ANSWER_KEY_EXAMPLE}</pre>
            </details>
            <Textarea
              value={answerKeyText}
              onChange={(e) => setAnswerKeyText(e.target.value)}
              placeholder="JSON yapıştırın…"
              style={{ minHeight: 220, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="od-btn od-btn-primary" onClick={submitAnswerKey} disabled={busy || !answerKeyText.trim()}>
                {busy ? "Yükleniyor…" : "Cevap anahtarını kaydet"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Kazanım tab */}
        {tab === "outcomes" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, color: "var(--pd-ink-2)", margin: 0 }}>
              Cevap anahtarı yüklenmeli ki kazanımlar eşleşebilsin. Kazanım yüklenen soru sayısı: <strong>{exam.kazanimReady}</strong> ·
              eksik: <strong>{exam.kazanimMissingCount}</strong>
            </p>
            <details>
              <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--pd-ink-3)" }}>Örnek formatı göster</summary>
              <pre style={{ background: "var(--pd-bg-subtle)", padding: 12, borderRadius: 8, fontSize: 12, overflow: "auto" }}>{OUTCOMES_EXAMPLE}</pre>
            </details>
            <Textarea
              value={outcomesText}
              onChange={(e) => setOutcomesText(e.target.value)}
              placeholder="Kazanım JSON'unu yapıştırın…"
              style={{ minHeight: 220, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="od-btn od-btn-primary" onClick={submitOutcomes} disabled={busy || !outcomesText.trim()}>
                {busy ? "Yükleniyor…" : "Kazanımları kaydet"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Erişim tab */}
        {tab === "access" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, color: "var(--pd-ink-2)", margin: 0 }}>
              Bu denemeyi sadece aşağıda işaretli erişim taglarına sahip öğrenciler çözebilir.
            </p>
            {availableTags.length === 0 ? (
              <p className="od-muted" style={{ fontSize: 13 }}>
                Henüz aktif ODK tagı yok. Önce <a href="/panel/admin/odk/erisim/yeni">yeni bir tag oluşturun</a>.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {availableTags.map((t) => {
                  const checked = linkedTagIds.includes(t.id);
                  return (
                    <label key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", border: "1px solid var(--pd-line)", borderRadius: 8, cursor: "pointer", background: checked ? "var(--pd-soft)" : "transparent" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setLinkedTagIds((arr) => e.target.checked ? Array.from(new Set([...arr, t.id])) : arr.filter((x) => x !== t.id));
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title} <span className="od-mono od-muted" style={{ fontSize: 11 }}>({t.key})</span></div>
                        {t.description ? <div className="od-muted" style={{ fontSize: 11 }}>{t.description}</div> : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="od-btn od-btn-primary" onClick={saveTags} disabled={busy}>
                {busy ? "Kaydediliyor…" : "Erişimi kaydet"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Yayın tab */}
        {tab === "publish" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Badge tone={exam.status === "PUBLISHED" ? "ok" : exam.status === "DRAFT" ? "warn" : "neutral"}>
                Mevcut durum: {exam.status}
              </Badge>
            </div>
            {exam.status === "DRAFT" ? (
              <button type="button" className="od-btn od-btn-primary" onClick={publish} disabled={busy}>
                {busy ? "Yayınlanıyor…" : "Denemeyi yayına al"}
              </button>
            ) : exam.status === "PUBLISHED" ? (
              <button type="button" className="od-btn od-btn-ghost" onClick={unpublish} disabled={busy}>
                {busy ? "Durduruluyor…" : "Yayını durdur (taslağa al)"}
              </button>
            ) : (
              <p className="od-muted" style={{ fontSize: 13 }}>Arşivlenmiş denemeler yayına alınamaz.</p>
            )}
            <p className="od-muted" style={{ fontSize: 12 }}>
              Yayın koşulları sağlanmazsa sistem hata ayrıntısı gösterir. (PDF, cevap anahtarı, kazanımlar ve en az 1 erişim tagı gerekli.)
            </p>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function FileSlot({
  title, description, file, onPick, busy,
}: {
  title: string; description: string; file: FileInfo | null; onPick: () => void; busy: boolean;
}) {
  return (
    <div style={{ border: "1px solid var(--pd-line)", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
          <div className="od-muted" style={{ fontSize: 12 }}>{description}</div>
        </div>
        <button type="button" className="od-btn od-btn-ghost" onClick={onPick} disabled={busy}>
          {file ? "Değiştir" : "PDF yükle"}
        </button>
      </div>
      {file ? (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <a href={file.url} target="_blank" rel="noreferrer" className="od-mono">{file.name}</a>
          <span className="od-muted">· {fmtBytes(file.byteSize)}</span>
        </div>
      ) : (
        <div className="od-muted" style={{ marginTop: 8, fontSize: 12 }}>Henüz dosya yüklenmedi.</div>
      )}
    </div>
  );
}
