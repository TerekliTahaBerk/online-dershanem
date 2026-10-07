"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Drawer, useDrawerParam } from "@/components/panel/primitives/drawer";
import { buttonClass } from "@/components/panel/primitives";
import {
  ODK_EXAM_TEMPLATES,
  templateTotalQuestions,
} from "@/lib/odk/exam-templates";

type Series = { id: string; title: string; familyCode: string };
type Family = { code: string; name: string; legacy: boolean };

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function autoSlug(event: React.FocusEvent<HTMLInputElement>) {
  const slug = event.currentTarget.form?.elements.namedItem(
    "slug",
  ) as HTMLInputElement | null;
  if (slug && !slug.value) slug.value = slugify(event.currentTarget.value);
}

const FIELD = "grid gap-1.5 text-[13px] font-medium text-pn-text";
const INPUT =
  "min-h-10 w-full rounded-md border border-pn-border-strong bg-white px-3 text-[14px] text-pn-text outline-none focus-visible:border-pn-accent focus-visible:ring-2 focus-visible:ring-pn-accent/25 disabled:bg-pn-surface-subtle disabled:text-pn-text-muted";
const OPTIONAL = <span className="font-normal text-pn-text-muted">(isteğe bağlı)</span>;

/**
 * YENİ DENEME DİYALOĞU (docs/panel-design-roadmap.md §15.1). URL'ye bağlı yan
 * panel: `?yeni=1` deneme adımı, `?yeni=seri` aynı panel içinde "Yeni seri"
 * adımı (ikinci modal açılmaz). Taslak oluşunca çalışma alanına gidilir. Uçlar
 * (`POST /api/odk/admin/exams`, `/exam-series`) ve alan adları değişmedi.
 */
export function AdminExamCreate({
  series,
  families,
}: {
  series: Series[];
  families: Family[];
}) {
  const router = useRouter();
  const [step, setStep] = useDrawerParam("yeni");
  const [busy, setBusy] = useState<"series" | "exam" | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [createdSeries, setCreatedSeries] = useState<Series[]>([]);
  const [selectedSeries, setSelectedSeries] = useState("");
  const [family, setFamily] = useState<string>(
    families.some((item) => item.code === "TYT") ? "TYT" : families[0]?.code ?? "TYT",
  );
  const [structureMode, setStructureMode] = useState<"FULL_TEMPLATE" | "MATH_ONLY">("FULL_TEMPLATE");

  const selectedFamily = families.find((item) => item.code === family);
  const isLegacyFamily = selectedFamily?.legacy ?? false;
  const effectiveStructureMode = isLegacyFamily ? structureMode : "FULL_TEMPLATE";
  const templateCode = isLegacyFamily
    ? effectiveStructureMode === "MATH_ONLY"
      ? `${family}_MATH`
      : `${family}_FULL`
    : "";
  const template = ODK_EXAM_TEMPLATES[templateCode];
  const sectionPreview = useMemo(
    () => template?.sections.map((section) => `${section.title} (${section.questionCount})`).join(" · ") || "",
    [template],
  );
  // Seri listesi seçili türe göre süzülür (uç da eşleşmeyi doğrular).
  const familySeries = useMemo(() => {
    const all = [...series, ...createdSeries.filter((item) => !series.some((existing) => existing.id === item.id))];
    return all.filter((item) => item.familyCode === family);
  }, [series, createdSeries, family]);

  const open = step === "1" || step === "seri";
  const onSeriesStep = step === "seri";

  async function submit(event: React.FormEvent<HTMLFormElement>, kind: "series" | "exam") {
    event.preventDefault();
    setBusy(kind);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const selectedFamilyCode = String(data.get("family"));
    const legacyFamily = families.find((item) => item.code === selectedFamilyCode)?.legacy ? selectedFamilyCode : null;
    const body =
      kind === "series"
        ? {
            title: data.get("title"),
            slug: data.get("slug"),
            family: legacyFamily,
            examFamilyCode: selectedFamilyCode,
            academicYear: Number(data.get("academicYear")),
            classLevel: data.get("classLevel"),
          }
        : {
            title: data.get("title"),
            slug: data.get("slug"),
            family: legacyFamily,
            examFamilyCode: selectedFamilyCode,
            seriesId: data.get("seriesId") || null,
            durationMinutes: Number(data.get("durationMinutes")),
            questionCount: effectiveStructureMode === "MATH_ONLY" ? Number(data.get("questionCount")) : undefined,
            structureMode: effectiveStructureMode,
            templateCode: templateCode || null,
            description: data.get("description") || null,
            internalCode: data.get("internalCode") || null,
            academicYear: data.get("academicYear") ? Number(data.get("academicYear")) : null,
            publisher: data.get("publisher") || null,
          };
    try {
      const response = await fetch(kind === "series" ? "/api/odk/admin/exam-series" : "/api/odk/admin/exams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage({ text: result.error || "Kayıt oluşturulamadı.", error: true });
      if (kind === "exam") {
        router.push(`/panel/odk/yonetim/sinavlar/${result.exam.id}`);
        return;
      }
      const created: Series = result.series;
      setCreatedSeries((current) => [...current, created]);
      setFamily(created.familyCode);
      setSelectedSeries(created.id);
      setMessage({ text: `“${created.title}” serisi oluşturuldu ve seçildi.`, error: false });
      setStep("1");
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı. Kayıt oluşturulmadı; tekrar deneyin.", error: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setMessage(null); setStep("1"); }} className={buttonClass("primary", "md")}>
        Yeni deneme
      </button>
      <Drawer
        open={open}
        onClose={() => setStep(null)}
        title={onSeriesStep ? "Yeni seri" : "Yeni deneme"}
        description={
          onSeriesStep
            ? "Aynı türde tekrarlanan denemeleri bir seri altında toplayın."
            : "Taslak oluşturulur; içerik, sorular ve zamanlama çalışma alanında tamamlanır."
        }
      >
        {message ? (
          <p
            role={message.error ? "alert" : "status"}
            className={`mb-4 rounded-md px-3 py-2 text-[13px] font-medium ${message.error ? "bg-(--pn-tone-critical-soft) text-(--pn-tone-critical)" : "bg-(--pn-tone-success-soft) text-(--pn-tone-success)"}`}
          >
            {message.text}
          </p>
        ) : null}

        {onSeriesStep ? (
          <form key="series" className="grid gap-4" onSubmit={(event) => void submit(event, "series")}>
            <label className={FIELD}>
              Seri adı
              <input name="title" required minLength={3} placeholder="Örn. TYT Haftalık" onBlur={autoSlug} className={INPUT} />
            </label>
            <label className={FIELD}>
              Kısa adres
              <input name="slug" required placeholder="tyt-haftalik" className={INPUT} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={FIELD}>
                Sınav türü
                <select name="family" defaultValue={family} className={INPUT}>
                  {families.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={FIELD}>
                Eğitim yılı
                <input name="academicYear" type="number" min={2020} max={2100} defaultValue={new Date().getFullYear()} className={INPUT} />
              </label>
            </div>
            <label className={FIELD}>
              <span>Sınıf düzeyi {OPTIONAL}</span>
              <input name="classLevel" placeholder="Örn. 12. Sınıf" className={INPUT} />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button disabled={busy !== null} className={buttonClass("primary", "md")}>
                {busy === "series" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                Seri oluştur
              </button>
              <button type="button" onClick={() => setStep("1")} className={buttonClass("ghost", "md")}>
                Denemeye dön
              </button>
            </div>
          </form>
        ) : (
          <form key="exam" className="grid gap-4" onSubmit={(event) => void submit(event, "exam")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={FIELD}>
                Tür
                <select name="family" value={family} onChange={(event) => setFamily(event.target.value)} className={INPUT}>
                  {families.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={FIELD}>
                Şablon
                <select
                  name="structureMode"
                  value={effectiveStructureMode}
                  disabled={!isLegacyFamily}
                  onChange={(event) => setStructureMode(event.target.value as "FULL_TEMPLATE" | "MATH_ONLY")}
                  className={INPUT}
                >
                  <option value="FULL_TEMPLATE">Tam deneme şablonu</option>
                  <option value="MATH_ONLY">Yalnız matematik</option>
                </select>
              </label>
            </div>
            <input type="hidden" name="templateCode" value={templateCode} />
            {template ? (
              <p className="rounded-md bg-pn-surface-subtle px-3 py-2 text-[13px] text-pn-text-secondary">
                <span className="font-semibold text-pn-text">{template.label}</span> · {templateTotalQuestions(template)} soru · {sectionPreview}
              </p>
            ) : !isLegacyFamily ? (
              <p className="rounded-md bg-pn-surface-subtle px-3 py-2 text-[13px] text-pn-text-secondary">
                Katalog türlerinde bölümler müfredattan oluşturulur.
              </p>
            ) : null}
            <div className={FIELD}>
              <label htmlFor="yeni-deneme-seri">
                Seri {OPTIONAL}
              </label>
              <div className="flex gap-2">
                <select
                  id="yeni-deneme-seri"
                  name="seriesId"
                  value={selectedSeries}
                  onChange={(event) => setSelectedSeries(event.target.value)}
                  className={INPUT}
                >
                  <option value="">Serisiz</option>
                  {familySeries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => { setMessage(null); setStep("seri"); }} className={buttonClass("secondary", "md", "shrink-0")}>
                  Yeni seri
                </button>
              </div>
            </div>
            <label className={FIELD}>
              Ad
              <input name="title" required minLength={3} placeholder="Örn. TYT Denemesi 01" onBlur={autoSlug} className={INPUT} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={FIELD}>
                Kısa adres
                <input name="slug" required placeholder="tyt-denemesi-01" className={INPUT} />
              </label>
              <label className={FIELD}>
                <span>Eğitim yılı {OPTIONAL}</span>
                <input name="academicYear" type="number" min={2020} max={2100} defaultValue={new Date().getFullYear()} className={INPUT} />
              </label>
              <label className={FIELD}>
                Süre (dakika)
                <input
                  name="durationMinutes"
                  type="number"
                  min={5}
                  max={360}
                  defaultValue={template?.durationMinutes || 165}
                  key={`${templateCode}-duration`}
                  className={INPUT}
                />
              </label>
              {effectiveStructureMode === "MATH_ONLY" ? (
                <label className={FIELD}>
                  Soru sayısı
                  <input name="questionCount" type="number" min={1} max={200} defaultValue={template?.sections[0]?.questionCount || 40} className={INPUT} />
                </label>
              ) : null}
            </div>
            <details className="rounded-md border border-pn-border px-3 py-2">
              <summary className="cursor-pointer text-[13px] font-medium text-pn-text-secondary">Ek bilgiler</summary>
              <div className="mt-3 grid gap-4">
                <label className={FIELD}>
                  <span>İç kod {OPTIONAL}</span>
                  <input name="internalCode" placeholder="ODK-TYT-2026-01" className={INPUT} />
                </label>
                <label className={FIELD}>
                  <span>Yayın / yayıncı {OPTIONAL}</span>
                  <input name="publisher" placeholder="onlinedershanem." className={INPUT} />
                </label>
                <label className={FIELD}>
                  <span>Açıklama {OPTIONAL}</span>
                  <textarea name="description" rows={2} placeholder="Öğrenciye gösterilmeyen kısa iç not" className={`${INPUT} py-2`} />
                </label>
              </div>
            </details>
            <div className="pt-1">
              <button disabled={busy !== null} className={buttonClass("primary", "md")}>
                {busy === "exam" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                Taslak oluştur
              </button>
            </div>
          </form>
        )}
      </Drawer>
    </>
  );
}
