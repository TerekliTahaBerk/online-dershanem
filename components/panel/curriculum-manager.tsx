"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, CheckCircle2, Plus } from "lucide-react";

type Version = { id: string; code: string; title: string; exam: "LGS" | "TYT" | "AYT" | "YDT"; academicYear: number; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; subjectCount: number; outcomeCount: number };

async function mutate(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
}

export function CurriculumManager({ versions }: { versions: Version[] }) {
  const router = useRouter();
  const [versionId, setVersionId] = useState(versions.find((item) => item.status !== "ARCHIVED")?.id || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true); setMessage("");
    try { await action(); setMessage(success); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı."); } finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <form className="panel-surface p-5" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(() => mutate("/api/panel/curriculum/versions", "POST", { code: data.get("code"), title: data.get("title"), exam: data.get("exam"), academicYear: Number(data.get("academicYear")), sourceUrl: data.get("sourceUrl") }), "Müfredat sürümü oluşturuldu."); }}>
        <Plus size={19} className="text-[var(--brand-olive)]" /><h2 className="mt-3 text-sm font-extrabold">Yeni sürüm</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Resmî kaynağı ve yılı ayrı sürümleyin; eski sürümü silmek yerine arşivleyin.</p>
        <input name="code" required maxLength={40} className="panel-input mt-4" placeholder="Örn. LGS-2026-V1" />
        <input name="title" required maxLength={120} className="panel-input mt-2" placeholder="Sürüm adı" />
        <div className="mt-2 grid grid-cols-2 gap-2"><select name="exam" className="panel-input"><option>LGS</option><option>TYT</option><option>AYT</option><option>YDT</option></select><input name="academicYear" type="number" min="2024" max="2100" defaultValue={new Date().getFullYear()} className="panel-input" aria-label="Akademik yıl" /></div>
        <input name="sourceUrl" type="url" maxLength={500} className="panel-input mt-2" placeholder="Resmî kaynak URL'si" />
        <button disabled={busy} className="site-btn site-btn-primary site-btn-sm mt-4 w-full">Sürümü oluştur</button>
      </form>
      <section className="panel-surface overflow-hidden"><div className="border-b border-[var(--site-line)] p-5"><h2 className="text-sm font-extrabold">Müfredat sürümleri</h2><p className="mt-1 text-xs text-[var(--site-muted)]">Yalnız ACTIVE sürümlerin kazanımları öğretmen seçiminde görünür.</p></div><div className="divide-y divide-[var(--site-line)]">{versions.map((version) => <article key={version.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{version.code}</strong><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${version.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : version.status === "ARCHIVED" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"}`}>{version.status}</span></div><p className="mt-1 text-xs text-[var(--site-body)]">{version.title} · {version.exam} · {version.academicYear}</p><p className="mt-1 text-[10px] text-[var(--site-muted)]">{version.subjectCount} ders · {version.outcomeCount} kazanım</p></div><select aria-label={`${version.code} durumu`} value={version.status} disabled={busy} onChange={(event) => void run(() => mutate(`/api/panel/curriculum/versions/${version.id}`, "PATCH", { status: event.target.value }), "Sürüm durumu güncellendi.")} className="panel-input w-auto text-xs"><option value="DRAFT">Taslak</option><option value="ACTIVE">Aktif</option><option value="ARCHIVED">Arşiv</option></select></article>)}{!versions.length ? <p className="p-8 text-center text-sm text-[var(--site-muted)]">İlk müfredat sürümünü oluşturun.</p> : null}</div></section>
    </section>

    <form className="panel-surface p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(() => mutate("/api/panel/curriculum/outcomes", "POST", { versionId: data.get("versionId"), subjectCode: data.get("subjectCode"), subjectName: data.get("subjectName"), unitCode: data.get("unitCode"), unitName: data.get("unitName"), outcomeCode: data.get("outcomeCode"), title: data.get("title"), description: data.get("description"), skills: String(data.get("skills") || "").split(",").map((item) => item.trim()).filter(Boolean) }), "Kazanım kataloğa eklendi."); }}>
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><BookOpenCheck size={19} /></span><div><h2 className="text-sm font-extrabold">Kazanım ekle</h2><p className="mt-1 text-xs text-[var(--site-muted)]">Ders → ünite → kazanım → beceri yapısı korunur.</p></div></div>
      <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3"><select name="versionId" required value={versionId} onChange={(event) => setVersionId(event.target.value)} className="panel-input"><option value="">Sürüm seçin</option>{versions.filter((item) => item.status !== "ARCHIVED").map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select><input name="subjectCode" required className="panel-input" placeholder="Ders kodu: MAT" /><input name="subjectName" required className="panel-input" placeholder="Ders adı: Matematik" /><input name="unitCode" required className="panel-input" placeholder="Ünite kodu" /><input name="unitName" required className="panel-input" placeholder="Ünite adı" /><input name="outcomeCode" required className="panel-input" placeholder="Kazanım kodu" /><textarea name="title" required maxLength={300} className="panel-input min-h-24 md:col-span-2" placeholder="Öğretmenin ve öğrencinin anlayacağı kazanım ifadesi" /><textarea name="description" maxLength={1000} className="panel-input min-h-24" placeholder="Opsiyonel açıklama" /><input name="skills" maxLength={300} className="panel-input md:col-span-2 xl:col-span-3" placeholder="Beceriler, virgülle: problem çözme, analiz" /></div>
      <button disabled={busy || !versionId} className="site-btn site-btn-primary site-btn-sm mt-4"><CheckCircle2 size={15} /> Kazanımı ekle</button>{message ? <p aria-live="polite" className="mt-3 text-xs font-bold text-[var(--brand-olive)]">{message}</p> : null}
    </form>
  </div>;
}
