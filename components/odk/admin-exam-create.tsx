"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OdkExamFamily } from "@prisma/client";
import { FolderPlus, Loader2, Plus } from "lucide-react";

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

  async function submit(event: React.FormEvent<HTMLFormElement>, kind: "series" | "exam") {
    event.preventDefault();
    setBusy(kind);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const family = String(data.get("family"));
    const body = kind === "series"
      ? { title: data.get("title"), slug: data.get("slug"), family, academicYear: Number(data.get("academicYear")), classLevel: data.get("classLevel") }
      : { title: data.get("title"), slug: data.get("slug"), family, seriesId: data.get("seriesId") || null, durationMinutes: Number(data.get("durationMinutes")), questionCount: Number(data.get("questionCount")) };
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
      <div className="flex items-start gap-3"><span className="panel-metric-icon panel-tone-mint"><Plus size={17} /></span><div><h2 className="text-sm font-extrabold">Yeni matematik denemesi</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Önce taslağı oluşturun; PDF, cevaplar ve kazanımlar sonraki ekranda tamamlanır.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="panel-field">Deneme adı<input name="title" required minLength={3} placeholder="Örn. LGS Matematik Denemesi 01" onBlur={autoSlug} /></label>
        <label className="panel-field">Kısa adres<input name="slug" required placeholder="lgs-matematik-denemesi-01" /></label>
        <label className="panel-field">Sınav ailesi<select name="family" defaultValue="LGS"><option>LGS</option><option>TYT</option><option>AYT</option></select></label>
        <label className="panel-field">Seri<select name="seriesId"><option value="">Serisiz</option>{series.map((item) => <option key={item.id} value={item.id}>{item.family} · {item.title}</option>)}</select></label>
        <label className="panel-field">Süre (dakika)<input name="durationMinutes" type="number" min={5} max={360} defaultValue={40} /></label>
        <label className="panel-field">Soru sayısı<input name="questionCount" type="number" min={1} max={200} defaultValue={20} /></label>
      </div>
      <button disabled={busy !== null} className="panel-primary-button mt-5">{busy === "exam" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Taslak oluştur</button>
    </form>

    <form className="panel-surface h-fit p-5 sm:p-6" onSubmit={(event) => void submit(event, "series")}>
      <div className="flex items-start gap-3"><span className="panel-metric-icon panel-tone-sky"><FolderPlus size={17} /></span><div><h2 className="text-sm font-extrabold">Yeni seri</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Aynı ailede tekrarlanan denemeleri bir seri altında toplayın.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <label className="panel-field">Seri adı<input name="title" required minLength={3} placeholder="Örn. LGS Haftalık Matematik" onBlur={autoSlug} /></label>
        <label className="panel-field">Kısa adres<input name="slug" required placeholder="lgs-haftalik-matematik" /></label>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2"><label className="panel-field">Sınav ailesi<select name="family"><option>LGS</option><option>TYT</option><option>AYT</option></select></label><label className="panel-field">Akademik yıl<input name="academicYear" type="number" min={2020} max={2100} defaultValue={new Date().getFullYear()} /></label></div>
        <label className="panel-field">Sınıf düzeyi <span className="font-medium text-[var(--site-muted)]">(isteğe bağlı)</span><input name="classLevel" placeholder="Örn. 8. Sınıf" /></label>
      </div>
      <button disabled={busy !== null} className="panel-secondary-button mt-5">{busy === "series" ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />} Seri oluştur</button>
    </form>
    {message ? <p role={message.error ? "alert" : "status"} className={`rounded-2xl p-3 text-xs font-bold xl:col-span-2 ${message.error ? "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]" : "bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"}`}>{message.text}</p> : null}
  </div>;
}
