"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OdkExamFamily } from "@prisma/client";
import { Loader2, Plus } from "lucide-react";

type Series = { id: string; title: string; family: OdkExamFamily };
const field = "panel-input";
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ö/g, "o").replace(/ü/g, "u").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function AdminExamCreate({ series }: { series: Series[] }) {
  const router = useRouter(); const [busy, setBusy] = useState<"series" | "exam" | null>(null); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>, kind: "series" | "exam") {
    event.preventDefault(); setBusy(kind); setMessage(""); const data = new FormData(event.currentTarget); const family = String(data.get("family"));
    const body = kind === "series" ? { title: data.get("title"), slug: data.get("slug"), family, academicYear: Number(data.get("academicYear")), classLevel: data.get("classLevel") } : { title: data.get("title"), slug: data.get("slug"), family, seriesId: data.get("seriesId") || null, durationMinutes: Number(data.get("durationMinutes")), questionCount: Number(data.get("questionCount")) };
    const response = await fetch(kind === "series" ? "/api/odk/admin/exam-series" : "/api/odk/admin/exams", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json().catch(() => ({})); setBusy(null);
    if (!response.ok) return setMessage(result.error || "Kayıt oluşturulamadı.");
    if (kind === "exam") router.push(`/panel/odk/yonetim/sinavlar/${result.exam.id}`); else { setMessage("Seri oluşturuldu."); router.refresh(); }
  }
  return <div className="grid gap-5 xl:grid-cols-2"><form className="panel-surface p-5" onSubmit={(event) => void submit(event, "series")}><h2 className="text-sm font-extrabold">Yeni seri</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input name="title" required minLength={3} placeholder="Örn. LGS Haftalık Matematik" className={field} onBlur={(event) => { const slug = event.currentTarget.form?.elements.namedItem("slug") as HTMLInputElement; if (slug && !slug.value) slug.value = slugify(event.currentTarget.value); }} /><input name="slug" required placeholder="lgs-haftalik-matematik" className={field} /><select name="family" className={field}><option>LGS</option><option>TYT</option><option>AYT</option></select><input name="academicYear" type="number" min={2020} max={2100} defaultValue={new Date().getFullYear()} className={field} /><input name="classLevel" placeholder="Sınıf (isteğe bağlı)" className={field} /></div><button disabled={busy !== null} className="panel-primary-button mt-4">{busy === "series" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Seri oluştur</button></form>
    <form className="panel-surface p-5" onSubmit={(event) => void submit(event, "exam")}><h2 className="text-sm font-extrabold">Yeni matematik denemesi</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input name="title" required minLength={3} placeholder="Deneme adı" className={field} onBlur={(event) => { const slug = event.currentTarget.form?.elements.namedItem("slug") as HTMLInputElement; if (slug && !slug.value) slug.value = slugify(event.currentTarget.value); }} /><input name="slug" required placeholder="deneme-adresi" className={field} /><select name="family" className={field} defaultValue="LGS"><option>LGS</option><option>TYT</option><option>AYT</option></select><select name="seriesId" className={field}><option value="">Serisiz</option>{series.map((item) => <option key={item.id} value={item.id}>{item.family} · {item.title}</option>)}</select><input name="durationMinutes" type="number" min={5} max={360} defaultValue={40} className={field} /><input name="questionCount" type="number" min={1} max={200} defaultValue={20} className={field} /></div><button disabled={busy !== null} className="panel-primary-button mt-4">{busy === "exam" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Taslak oluştur</button></form>{message ? <p role="status" className="text-xs font-bold text-[var(--brand-olive)] xl:col-span-2">{message}</p> : null}</div>;
}
