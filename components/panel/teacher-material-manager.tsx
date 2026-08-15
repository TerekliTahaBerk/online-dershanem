"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ExternalLink, FileText, Link2, Upload, Video } from "lucide-react";

type Group = { id: string; name: string; subject: string };
type Material = { id: string; title: string; description: string; url: string; kind: "LINK" | "PDF" | "VIDEO"; groupName: string; isActive: boolean; captionsAvailable?: boolean; transcript?: string };

export function TeacherMaterialManager({ groups, materials }: { groups: Group[]; materials: Material[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState<string | null>(null);
  const [items, setItems] = useState(materials);
  const [source, setSource] = useState<"LINK" | "FILE">("LINK");
  const icons = { LINK: Link2, PDF: FileText, VIDEO: Video };
  async function archive(id: string) { if (archiveBusy) return; setArchiveBusy(id); const response = await fetch(`/api/panel/materials/${id}`, { method: "PATCH" }); if (response.ok) { setItems((current) => current.map((item) => item.id === id ? { ...item, isActive: false } : item)); router.refresh(); } else setMessage("Materyal arşivlenemedi."); setArchiveBusy(null); }

  return <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
    <form className="panel-surface h-fit p-5" onSubmit={async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      setBusy(true); setMessage("");
      const data = new FormData(formElement);
      const response = source === "FILE"
        ? await fetch("/api/panel/materials/upload", { method: "POST", body: data })
        : await fetch("/api/panel/materials", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ groupId: data.get("groupId"), title: data.get("title"), description: data.get("description"), url: data.get("url"), kind: data.get("kind"), captionsAvailable: data.get("captionsAvailable") === "on", transcript: data.get("transcript") }) });
      const result = await response.json().catch(() => ({}));
      if (response.ok) { setItems((current) => [result.material as Material, ...current]); formElement.reset(); setMessage("Materyal öğrencilere açıldı."); setBusy(false); router.refresh(); } else { setMessage(result.error || "Paylaşılamadı."); setBusy(false); }
    }}>
      <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Yeni materyal</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">PDF, video veya güvenilir bir kaynak bağlantısı paylaşın.</p>
      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-[var(--site-soft)] p-1">
        <button type="button" onClick={() => setSource("LINK")} className={`rounded-xl px-3 py-2 text-xs font-extrabold ${source === "LINK" ? "bg-white text-[var(--brand-olive)] shadow-sm" : "text-[var(--site-muted)]"}`}><Link2 size={13} className="mr-1 inline" /> Bağlantı</button>
        <button type="button" onClick={() => setSource("FILE")} className={`rounded-xl px-3 py-2 text-xs font-extrabold ${source === "FILE" ? "bg-white text-[var(--brand-olive)] shadow-sm" : "text-[var(--site-muted)]"}`}><Upload size={13} className="mr-1 inline" /> Dosya yükle</button>
      </div>
      <select name="groupId" required className="panel-input mt-4"><option value="">Grup seçin</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.subject}</option>)}</select>
      {source === "LINK" ? <select name="kind" defaultValue="LINK" className="panel-input mt-2"><option value="LINK">Bağlantı</option><option value="PDF">PDF bağlantısı</option><option value="VIDEO">Video bağlantısı</option></select> : null}
      <input name="title" required className="panel-input mt-2" placeholder="Materyal başlığı" />
      {source === "LINK" ? <input name="url" type="url" required className="panel-input mt-2" placeholder="https://..." /> : <><input name="file" type="file" accept="application/pdf,video/mp4,.pdf,.mp4" required className="panel-input mt-2 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-olive-soft)] file:px-3 file:py-1 file:text-xs file:font-bold file:text-[var(--brand-olive)]" /><p className="mt-2 text-[10.5px] leading-4 text-[var(--site-muted)]">PDF veya MP4 · en fazla 4 MB · dosya yalnızca yetkili grup üyelerine açılır.</p></>}
      <textarea name="description" className="panel-input mt-2 min-h-24" placeholder="Kısa kullanım yönlendirmesi" />
      <label className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--site-line)] p-3 text-xs font-bold"><input name="captionsAvailable" type="checkbox" /> Video altyazı içeriyor</label>
      <textarea name="transcript" className="panel-input mt-2 min-h-28" maxLength={8000} placeholder="İsteğe bağlı metin dökümü / erişilebilir metin alternatifi" />
      <button disabled={busy} className="site-btn site-btn-primary site-btn-sm mt-4 w-full">{busy ? "Paylaşılıyor" : source === "FILE" ? "Dosyayı yükle ve paylaş" : "Materyali paylaş"}</button>
      <p aria-live="polite" className="mt-3 text-xs font-bold text-[var(--brand-olive)]">{message}</p>
    </form>
    <section><h2 className="text-sm font-extrabold text-[var(--site-ink)]">Paylaşılan kaynaklar</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{items.map((material) => {
      const Icon = icons[material.kind];
      return <article key={material.id} className={`rounded-[14px] border border-[var(--site-line)] bg-white p-5 ${material.isActive ? "" : "opacity-55"}`}><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><Icon size={17} /></span><div className="min-w-0 flex-1"><span className="text-[10px] font-bold text-[var(--site-muted)]">{material.groupName}</span><h3 className="mt-1 text-sm font-extrabold text-[var(--site-ink)]">{material.title}</h3><p className="mt-1 text-xs leading-5 text-[var(--site-body)]">{material.description || "Açıklama eklenmedi."}</p><div className="mt-2 flex flex-wrap gap-1">{material.captionsAvailable ? <span className="rounded-full bg-sky-50 px-2 py-1 text-[9px] font-bold text-sky-800">Altyazı</span> : null}{material.transcript ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-800">Metin dökümü</span> : null}</div></div></div><div className="mt-4 flex justify-between"><a href={material.url} target="_blank" rel="noreferrer" className="panel-text-link">Kaynağı aç <ExternalLink size={13} /></a>{material.isActive ? <button type="button" disabled={archiveBusy !== null} onClick={() => void archive(material.id)} className="text-[10.5px] font-bold text-[var(--site-muted)]"><Archive size={12} className="mr-1 inline" />Arşivle</button> : null}</div></article>;
    })}{!items.length ? <p className="text-sm text-[var(--site-muted)]">Henüz materyal paylaşılmadı.</p> : null}</div></section>
  </div>;
}
