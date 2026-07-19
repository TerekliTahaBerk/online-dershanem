"use client";

import { useMemo, useState } from "react";
import { Search, Star, X } from "lucide-react";

export type OutcomeOption = { id: string; code: string; title: string; subject: string; unit: string; skills: string[]; favorite: boolean; recent: boolean };
export type SelectedOutcome = { outcomeId: string; evidenceType: "TAUGHT" | "OBSERVED" | "INDEPENDENT" | "NEEDS_REVIEW" };

const evidenceLabels = { TAUGHT: "İşlendi", OBSERVED: "Gözlendi", INDEPENDENT: "Bağımsız uyguladı", NEEDS_REVIEW: "Tekrar gerekli" } as const;

export function OutcomePicker({ outcomes, value, onChange, withEvidence = false }: { outcomes: OutcomeOption[]; value: SelectedOutcome[]; onChange: (value: SelectedOutcome[]) => void; withEvidence?: boolean }) {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(() => new Set(outcomes.filter((item) => item.favorite).map((item) => item.id)));
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  const results = useMemo(() => outcomes.filter((item) => !value.some((selected) => selected.outcomeId === item.id) && (!normalized || `${item.code} ${item.title} ${item.subject} ${item.unit} ${item.skills.join(" ")}`.toLocaleLowerCase("tr-TR").includes(normalized))).sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || Number(b.recent) - Number(a.recent)).slice(0, 8), [favorites, normalized, outcomes, value]);

  async function toggleFavorite(outcomeId: string) {
    const favorite = !favorites.has(outcomeId);
    setFavorites((current) => { const next = new Set(current); if (favorite) next.add(outcomeId); else next.delete(outcomeId); return next; });
    await fetch("/api/panel/teacher/outcome-favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ outcomeId, favorite }) }).catch(() => undefined);
  }

  return <div className="rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold text-[var(--site-ink)]">Kazanım kanıtı</p><p className="mt-1 text-[10.5px] text-[var(--site-muted)]">En fazla 3 kazanım; seçmeden devam edebilirsiniz.</p></div><span className="text-[10px] font-bold text-[var(--site-muted)]">{value.length}/3</span></div>
    <div className="mt-3 space-y-2">{value.map((selected) => { const outcome = outcomes.find((item) => item.id === selected.outcomeId); if (!outcome) return null; return <div key={selected.outcomeId} className="rounded-xl border border-[var(--site-line)] bg-white p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><span className="text-[9px] font-extrabold text-[var(--brand-olive)]">{outcome.code} · {outcome.unit}</span><p className="mt-1 text-xs font-bold leading-5 text-[var(--site-ink)]">{outcome.title}</p></div><button type="button" aria-label={`${outcome.code} kazanımını kaldır`} onClick={() => onChange(value.filter((item) => item.outcomeId !== selected.outcomeId))} className="p-1 text-[var(--site-muted)]"><X size={14} /></button></div>{withEvidence ? <select aria-label={`${outcome.code} kanıt türü`} value={selected.evidenceType} onChange={(event) => onChange(value.map((item) => item.outcomeId === selected.outcomeId ? { ...item, evidenceType: event.target.value as SelectedOutcome["evidenceType"] } : item))} className="panel-input mt-2 py-2 text-xs">{Object.entries(evidenceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : null}</div>; })}</div>
    {value.length < 3 ? <><label className="relative mt-3 block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--site-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="panel-input pl-9 text-xs" placeholder="Kod, konu veya beceri ara" aria-label="Kazanım ara" /></label>{query || outcomes.length <= 8 ? <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">{results.map((outcome) => <div key={outcome.id} className="flex items-start gap-2 rounded-xl bg-white p-2.5"><button type="button" onClick={() => { onChange([...value, { outcomeId: outcome.id, evidenceType: "TAUGHT" }]); setQuery(""); }} className="min-w-0 flex-1 text-left"><span className="text-[9px] font-extrabold text-[var(--brand-olive)]">{outcome.code} · {outcome.subject} / {outcome.unit}</span><span className="mt-1 block text-xs font-bold leading-5">{outcome.title}</span>{outcome.skills.length ? <span className="mt-1 block text-[9.5px] text-[var(--site-muted)]">{outcome.skills.join(" · ")}</span> : null}</button><button type="button" aria-label={`${outcome.code} favori`} aria-pressed={favorites.has(outcome.id)} onClick={() => void toggleFavorite(outcome.id)} className={favorites.has(outcome.id) ? "text-amber-600" : "text-slate-300"}><Star size={15} fill={favorites.has(outcome.id) ? "currentColor" : "none"} /></button></div>)}{!results.length ? <p className="p-3 text-center text-xs text-[var(--site-muted)]">Eşleşen aktif kazanım yok.</p> : null}</div> : <p className="mt-2 text-[10px] text-[var(--site-muted)]">Aramaya başlayın; favoriler ve son kullanılanlar önce gösterilir.</p>}</> : null}
  </div>;
}
