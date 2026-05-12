"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Input, Textarea, Select } from "@/components/panel/ui/form";

const FAMILIES = ["TYT", "AYT", "LGS", "KPSS", "ALES"] as const;
type Family = (typeof FAMILIES)[number];

type SectionInput = { title: string; questionCount: number };

const PRESETS: Record<Family, SectionInput[]> = {
  TYT: [
    { title: "Türkçe", questionCount: 40 },
    { title: "Sosyal Bilimler", questionCount: 20 },
    { title: "Temel Matematik", questionCount: 40 },
    { title: "Fen Bilimleri", questionCount: 20 },
  ],
  AYT: [
    { title: "Matematik", questionCount: 40 },
    { title: "Fizik", questionCount: 14 },
    { title: "Kimya", questionCount: 13 },
    { title: "Biyoloji", questionCount: 13 },
  ],
  LGS: [
    { title: "Sözel Bölüm", questionCount: 50 },
    { title: "Sayısal Bölüm", questionCount: 40 },
  ],
  KPSS: [{ title: "Genel Yetenek", questionCount: 60 }, { title: "Genel Kültür", questionCount: 60 }],
  ALES: [{ title: "Sayısal", questionCount: 50 }, { title: "Sözel", questionCount: 50 }],
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

export function ExamWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0: Genel
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [family, setFamily] = useState<Family>("TYT");
  const [classLevel, setClassLevel] = useState("");
  const [duration, setDuration] = useState(135);
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionInput[]>(PRESETS.TYT);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };
  const handleFamilyChange = (v: Family) => {
    setFamily(v);
    setSections(PRESETS[v]);
    if (v === "TYT" && duration === 180) setDuration(135);
    if (v === "AYT" && duration === 135) setDuration(180);
  };

  const totalQuestions = sections.reduce((a, s) => a + (s.questionCount || 0), 0);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/odk/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          description: description || null,
          cadenceFamily: family,
          classLevel: classLevel || null,
          durationMinutes: duration,
          sections,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error ?? "Kayıt başarısız.");
      }
      router.push(`/panel/admin/odk/denemeler/${json.data.exam.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata.");
      setSubmitting(false);
    }
  };

  const canNext = title.trim().length >= 3 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && totalQuestions > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <ol style={{ display: "flex", gap: 8, listStyle: "none", padding: 0, margin: 0, fontSize: 12, color: "var(--pd-ink-3)" }}>
        <li style={{ fontWeight: 600, color: step === 0 ? "var(--pd-ink-1)" : undefined }}>1 · Genel</li>
        <li>›</li>
        <li>2 · PDF</li>
        <li>›</li>
        <li>3 · Cevap & Kazanım</li>
        <li>›</li>
        <li>4 · Erişim & Yayın</li>
      </ol>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Deneme adı">
          <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="2026 TYT Deneme #1" />
        </Field>
        <Field label="Slug" hint="URL'de kullanılır. a-z, 0-9, tire.">
          <Input
            value={slug}
            onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true); }}
            placeholder="2026-tyt-deneme-1"
          />
        </Field>
        <Field label="Sınav türü">
          <Select value={family} onChange={(e) => handleFamilyChange(e.target.value as Family)}>
            {FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
        </Field>
        <Field label="Sınıf seviyesi (opsiyonel)" hint="Örn. 12, 11, mezun, 8.">
          <Input value={classLevel} onChange={(e) => setClassLevel(e.target.value)} placeholder="12" />
        </Field>
        <Field label="Süre (dakika)">
          <Input type="number" min={5} max={360} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 0)} />
        </Field>
        <div />
      </div>

      <Field label="Açıklama (opsiyonel)">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bu denemenin amacı, kapsadığı konular vb." />
      </Field>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Bölümler ({totalQuestions} soru)</span>
          <button
            type="button"
            className="od-btn od-btn-ghost"
            onClick={() => setSections((s) => [...s, { title: "", questionCount: 10 }])}
          >
            + Bölüm ekle
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 32px", gap: 8 }}>
              <Input
                value={s.title}
                placeholder={`Bölüm ${i + 1} adı`}
                onChange={(e) => setSections((arr) => arr.map((it, idx) => idx === i ? { ...it, title: e.target.value } : it))}
              />
              <Input
                type="number"
                min={1}
                max={200}
                value={s.questionCount}
                onChange={(e) => setSections((arr) => arr.map((it, idx) => idx === i ? { ...it, questionCount: Number(e.target.value) || 0 } : it))}
              />
              <button
                type="button"
                className="od-iconbtn"
                aria-label="Bölümü sil"
                onClick={() => setSections((arr) => arr.filter((_, idx) => idx !== i))}
                disabled={sections.length <= 1}
              >×</button>
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 12px", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <Link href="/panel/admin/odk/denemeler" className="od-btn od-btn-ghost">İptal</Link>
        <button
          type="button"
          className="od-btn od-btn-primary"
          disabled={!canNext || submitting}
          onClick={onSubmit}
        >
          {submitting ? "Oluşturuluyor…" : "Taslak oluştur ve devam et"}
        </button>
      </div>

      <p className="od-muted" style={{ fontSize: 11 }}>
        İlk adımı kaydettikten sonra deneme detay sayfasında PDF, cevap anahtarı, kazanım JSON ve erişim taglarını yöneterek yayınlayabilirsiniz.
      </p>
    </div>
  );
}
