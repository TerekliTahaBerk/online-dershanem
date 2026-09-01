"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OdkExamFamily } from "@prisma/client";
import { FolderPlus, Loader2, Plus } from "lucide-react";
import { ODK_EXAM_TEMPLATES, templateTotalQuestions } from "@/lib/odk/exam-templates";

type Series = { id: string; title: string; family: OdkExamFamily };

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ö/g, "o").replace(/ü/g, "u").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function autoSlug(event: React.FocusEvent<HTMLInputElement>) {
  const slug = event.currentTarget.form?.elements.namedItem("slug") as HTMLInputElement | null;
  if (slug && !slug.value) slug.value = slugify(event.currentTarget.value);
}

export function AdminExamCreate({ series }: { series: Series[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"series" | "exam" | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [family, setFamily] = useState<OdkExamFamily>("TYT");
  const [structureMode, setStructureMode] = useState<"FULL_TEMPLATE" | "MATH_ONLY">("FULL_TEMPLATE");

  const templateCode = structureMode === "MATH_ONLY" ? `${family}_MATH` : `${family}_FULL`;
  const template = ODK_EXAM_TEMPLATES[templateCode];
  const sectionPreview = useMemo(() => template?.sections.map((section) => `${section.title} (${section.questionCount})`).join(" · ") || "", [template]);

  async function submit(event: React.FormEvent<HTMLFormElement>, kind: "series" | "exam") {
    event.preventDefault();
    setBusy(kind);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const selectedFamily = String(data.get("family")) as OdkExamFamily;
    const body = kind === "series"
      ? { title: data.get("title"), slug: data.get("slug"), family: selectedFamily, academicYear: Number(data.get("academicYear")), classLevel: data.get("classLevel") }
      : {
          title: data.get("title"),
          slug: data.get("slug"),
          family: selectedFamily,
          seriesId: data.get("seriesId") || null,
          durationMinutes: Number(data.get("durationMinutes")),
          questionCount: structureMode === "MATH_ONLY" ? Number(data.get("questionCount")) : undefined,
          structureMode: String(data.get("structureMode") || "FULL_TEMPLATE"),
          templateCode: String(data.get("templateCode") || templateCode),
          description: data.get("description") || null,
          internalCode: data.get("internalCode") || null,
          academicYear: data.get("academicYear") ? Number(data.get("academicYear")) : null,
          publisher: data.get("publisher") || null,
        };
    try {
      const response = await fetch(kind === "series" ? "/api/odk/admin/exam-series" : "/api/odk/admin/exams", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage({ text: result.error || "Kayıt oluşturulamadı.", error: true });
      if (kind === "exam") router.push(`/panel/odk/yonetim/sinavlar/${result.exam.id}`);
      else {
        setMessage({ text: "Seri oluşturuldu.", error: false });
        router.refresh();
      }
    } catch {
      setMessage({ text: "Bağlantı kurulamadı. Kayıt oluşturulmadı; tekrar deneyin.", error: true });
    } finally {
      setBusy(null);
    }
  }

  return <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
    <form className="panel-surface p-5 sm:p-6" onSubmit={(event) => void submit(event, "exam")}>
      <div className="flex items-start gap-3">
        <span className="panel-metric-icon panel-tone-mint"><Plus size={17} /></span>
        <div>
          <h2 className="text-sm font-extrabold">Yeni deneme</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">TYT / AYT / LGS şablonundan yapı oluşturulur. Cevap anahtarı ve kazanımlar sonraki adımlarda JSON veya form ile eklenir.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="panel-field">Deneme adı<input name="title" required minLength={3} placeholder="Örn. TYT Denemesi 01" onBlur={autoSlug} /></label>
        <label className="panel-field">Kısa adres<input name="slug" required placeholder="tyt-denemesi-01" /></label>
        <label className="panel-field">Sınav türü
          <select name="family" value={family} onChange={(event) => setFamily(event.target.value as OdkExamFamily)}>
            <option>LGS</option><option>TYT</option><option>AYT</option>
          </select>
        </label>
        <label className="panel-field">Yapı
          <select name="structureMode" value={structureMode} onChange={(event) => setStructureMode(event.target.value as "FULL_TEMPLATE" | "MATH_ONLY")}>
            <option value="FULL_TEMPLATE">Tam deneme şablonu</option>
            <option value="MATH_ONLY">Yalnız matematik</option>
          </select>
        </label>
        <input type="hidden" name="templateCode" value={templateCode} />
        <label className="panel-field">Seri
          <select name="seriesId"><option value="">Serisiz</option>{series.map((item) => <option key={item.id} value={item.id}>{item.family} · {item.title}</option>)}</select>
        </label>
        <label className="panel-field">Süre (dakika)<input name="durationMinutes" type="number" min={5} max={360} defaultValue={template?.durationMinutes || 165} key={`${templateCode}-duration`} /></label>
        {structureMode === "MATH_ONLY" ? <label className="panel-field">Soru sayısı<input name="questionCount" type="number" min={1} max={200} defaultValue={template?.sections[0]?.questionCount || 40} /></label> : null}
        <label className="panel-field">İç kod <span className="font-medium text-[var(--site-muted)]">(isteğe bağlı)</span><input name="internalCode" placeholder="ODK-TYT-2026-01" /></label>
        <label className="panel-field">Yayın / yayıncı <span className="font-medium text-[var(--site-muted)]">(isteğe bağlı)</span><input name="publisher" placeholder="Online Dershanem" /></label>
        <label className="panel-field sm:col-span-2">Açıklama <span className="font-medium text-[var(--site-muted)]">(isteğe bağlı)</span><textarea name="description" rows={2} className="panel-input" placeholder="Öğrenciye gösterilmeyen kısa iç not" /></label>
      </div>
      {template ? <p className="mt-3 rounded-xl bg-[var(--site-bg-warm)] p-3 text-xs text-[var(--site-body)]"><span className="font-extrabold text-[var(--brand-olive)]">{template.label}</span> · {templateTotalQuestions(template)} soru · {sectionPreview}</p> : null}
      <button disabled={busy !== null} className="panel-primary-button mt-5">{busy === "exam" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Taslak oluştur</button>
    </form>

    <form className="panel-surface h-fit p-5 sm:p-6" onSubmit={(event) => void submit(event, "series")}>
      <div className="flex items-start gap-3"><span className="panel-metric-icon panel-tone-sky"><FolderPlus size={17} /></span><div><h2 className="text-sm font-extrabold">Yeni seri</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Aynı ailede tekrarlanan denemeleri bir seri altında toplayın.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <label className="panel-field">Seri adı<input name="title" required minLength={3} placeholder="Örn. TYT Haftalık" onBlur={autoSlug} /></label>
        <label className="panel-field">Kısa adres<input name="slug" required placeholder="tyt-haftalik" /></label>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2"><label className="panel-field">Sınav ailesi<select name="family"><option>LGS</option><option>TYT</option><option>AYT</option></select></label><label className="panel-field">Akademik yıl<input name="academicYear" type="number" min={2020} max={2100} defaultValue={new Date().getFullYear()} /></label></div>
        <label className="panel-field">Sınıf düzeyi <span className="font-medium text-[var(--site-muted)]">(isteğe bağlı)</span><input name="classLevel" placeholder="Örn. 12. Sınıf" /></label>
      </div>
      <button disabled={busy !== null} className="panel-secondary-button mt-5">{busy === "series" ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />} Seri oluştur</button>
    </form>
    {message ? <p role={message.error ? "alert" : "status"} className={`rounded-2xl p-3 text-xs font-bold xl:col-span-2 ${message.error ? "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]" : "bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"}`}>{message.text}</p> : null}
  </div>;
}
