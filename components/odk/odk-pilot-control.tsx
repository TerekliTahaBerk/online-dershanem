"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePause, CirclePlay, RotateCcw, ShieldAlert, SquareCheckBig } from "lucide-react";
import { OdkStatusBadge } from "@/components/odk/odk-status-badge";
import { pilotStatusPresentation } from "@/lib/odk/presentation";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
type Run = { id: string; name: string; status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ROLLED_BACK"; version: number; memberCount: number; coverage: Record<Role, number>; createdAt: string };
type Candidate = { id: string; label: string; role: Role };
const roles: Role[] = ["ADMIN", "TEACHER", "STUDENT", "PARENT"];
const roleLabels: Record<Role, string> = { ADMIN: "Admin", TEACHER: "Öğretmen", STUDENT: "Öğrenci", PARENT: "Veli" };

export function OdkPilotControl({ candidates, runs, currentAdminId }: { candidates: Candidate[]; runs: Run[]; currentAdminId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(runs);
  const [selected, setSelected] = useState<string[]>([currentAdminId]);
  const [name, setName] = useState("ODK kontrollü pilot");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [stopReason, setStopReason] = useState("OPERATIONAL");
  useEffect(() => setRows(runs), [runs]);
  const groups = useMemo(() => roles.map((role) => ({ role, users: candidates.filter((candidate) => candidate.role === role) })), [candidates]);
  const selectedCoverage = useMemo(() => roles.reduce((coverage, role) => ({ ...coverage, [role]: candidates.filter((candidate) => candidate.role === role && selected.includes(candidate.id)).length }), { ADMIN: 0, TEACHER: 0, STUDENT: 0, PARENT: 0 } as Record<Role, number>), [candidates, selected]);
  const missingRoles = roles.filter((role) => selectedCoverage[role] === 0);
  const needsSecondStudent = selectedCoverage.STUDENT < 2;
  const hasOpenRun = rows.some((run) => ["DRAFT", "ACTIVE", "PAUSED"].includes(run.status));

  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  async function create() {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/odk/admin/pilot-runs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, userIds: selected, requestKey: crypto.randomUUID() }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage({ text: body.error || "ODK pilot taslağı oluşturulamadı.", error: true });
      const run = body.run;
      const coverage = run.members.reduce((counts: Record<Role, number>, member: { role: Role }) => ({ ...counts, [member.role]: counts[member.role] + 1 }), { ADMIN: 0, TEACHER: 0, STUDENT: 0, PARENT: 0 });
      setRows((current) => [{ id: run.id, name: run.name, status: run.status, version: run.version, memberCount: run.members.length, coverage, createdAt: run.createdAt }, ...current]);
      setMessage({ text: "ODK pilot taslağı oluşturuldu; yayın kapıları geçmeden erişim açılmaz.", error: false });
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı. Pilot taslağı oluşturulmadı; tekrar deneyin.", error: true });
    } finally {
      setBusy(false);
    }
  }
  async function transition(run: Run, action: "ACTIVATE" | "PAUSE" | "RESUME" | "COMPLETE" | "ROLLBACK") {
    const confirmations: Partial<Record<typeof action, string>> = {
      ACTIVATE: "Tüm yayın kapıları sunucuda yeniden doğrulanacak ve seçili katılımcıların ODK erişimi açılacak. Devam edilsin mi?",
      PAUSE: "Pilot erişimi duraklatılacak. Sınav ve cevap verileri korunacak. Devam edilsin mi?",
      COMPLETE: "Pilot tamamlanacak ve tekrar açılamayacak. Audit kayıtları korunacak. Devam edilsin mi?",
      ROLLBACK: "Pilot geri alınacak ve terminal duruma geçecek. Sonuçlar açıklanmayacak; veriler korunacak. Devam edilsin mi?",
    };
    if (confirmations[action] && !window.confirm(confirmations[action])) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/odk/admin/pilot-runs/${run.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, expectedVersion: run.version, stopReason: ["PAUSE", "ROLLBACK"].includes(action) ? stopReason : undefined }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage({ text: body.error || "Pilot durumu güncellenemedi.", error: true });
      setRows((current) => current.map((item) => item.id === run.id ? { ...item, status: body.run.status, version: body.run.version } : item));
      setMessage({ text: action === "ACTIVATE" || action === "RESUME" ? "ODK pilot erişimi açıldı." : action === "COMPLETE" ? "Pilot tamamlandı; audit kayıtları korundu." : "ODK pilot erişimi durduruldu; sınav verileri korundu.", error: false });
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı. Pilot durumu değiştirilmedi; tekrar deneyin.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
    <section className="panel-surface h-fit p-5 sm:p-6"><h2 className="text-sm font-extrabold">Açık katılımcı listesi</h2><p className="mt-2 text-xs leading-5 text-[var(--site-muted)]">Her rol bilinçli seçilir. Öğrenci ve veliler için aktif ODK ürün erişimi zorunludur.</p><label className="panel-field mt-4">Pilot adı<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label>
      <div className="mt-4 grid grid-cols-4 gap-1.5">{roles.map((role) => <div key={role} className={`rounded-xl p-2 text-center ${selectedCoverage[role] ? "bg-[var(--pd-pastel-mint-soft)] text-[var(--pd-pastel-mint-ink)]" : "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]"}`}><strong className="block text-sm">{selectedCoverage[role]}</strong><span className="text-[9px] font-bold">{roleLabels[role]}</span></div>)}</div>
      <div className="mt-4 max-h-[430px] space-y-4 overflow-y-auto pr-1">{groups.map((group) => <fieldset key={group.role}><legend className="text-[11px] font-extrabold uppercase text-[var(--brand-olive)]">{roleLabels[group.role]} · {group.users.length}</legend><div className="mt-2 space-y-1">{group.users.map((user) => <label key={user.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--site-line)] px-3 py-2 text-xs"><input type="checkbox" checked={selected.includes(user.id)} disabled={user.id === currentAdminId} onChange={() => toggle(user.id)} className="h-4 w-4" /><span className="truncate">{user.label}</span></label>)}{!group.users.length ? <p className="text-[11px] text-rose-700">Uygun hesap yok.</p> : null}</div></fieldset>)}</div>
      {missingRoles.length || needsSecondStudent ? <p role="status" className="mt-3 rounded-xl bg-[var(--pd-pastel-blush-soft)] p-3 text-[10px] font-bold text-[var(--pd-pastel-blush-ink)]">{missingRoles.length ? `Eksik roller: ${missingRoles.map((role) => roleLabels[role]).join(", ")}. ` : ""}{needsSecondStudent ? "Pilot için en az iki öğrenci seçin." : ""}</p> : null}{hasOpenRun ? <p role="status" className="mt-3 rounded-xl bg-[var(--pd-pastel-yellow-soft)] p-3 text-[10px] font-bold text-[var(--pd-pastel-yellow-ink)]">Yeni taslak için mevcut açık koşuyu tamamlayın veya geri alın.</p> : null}<button type="button" disabled={busy || hasOpenRun || name.trim().length < 3 || missingRoles.length > 0 || needsSecondStudent} onClick={() => void create()} className="panel-primary-button mt-4 w-full">Pilot taslağı oluştur</button><p className="mt-3 text-[10px] leading-4 text-[var(--site-muted)]">Seçim tek başına erişim açmaz. Aktivasyon env, restore, özel PDF deposu ve hazır deneme kapılarından geçer; canlı kabul, güvenlik ve operasyon onayları yalnız gerçek tur kanıtından sonra genişlemeyi açar.</p>
    </section>

    <section><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-sm font-extrabold">ODK yayın yaşam döngüsü</h2><p className="mt-1 text-xs text-[var(--site-muted)]">Aynı anda yalnız bir açık pilot koşusu bulunabilir.</p></div><label className="panel-field">Durdurma nedeni<select className="w-auto" value={stopReason} onChange={(event) => setStopReason(event.target.value)}><option value="OPERATIONAL">Operasyon</option><option value="GUARDRAIL_BREACH">Guardrail ihlali</option><option value="SECURITY_INCIDENT">Güvenlik olayı</option><option value="DATA_QUALITY">Veri kalitesi</option></select></label></div>
      {message ? <p role={message.error ? "alert" : "status"} className={`mt-3 rounded-2xl p-3 text-xs font-bold ${message.error ? "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]" : "bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"}`}>{message.text}</p> : null}
      <div className="mt-3 space-y-3">{rows.map((run) => { const presentation = pilotStatusPresentation[run.status]; return <article key={run.id} className="panel-surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="text-sm font-extrabold">{run.name}</h3><OdkStatusBadge label={presentation.label} tone={presentation.tone} /></div><p className="mt-2 text-xs text-[var(--site-muted)]">{run.memberCount} kişi · Admin {run.coverage.ADMIN} · Öğretmen {run.coverage.TEACHER} · Öğrenci {run.coverage.STUDENT} · Veli {run.coverage.PARENT} · v{run.version}</p></div><div className="flex flex-wrap gap-2">{run.status === "DRAFT" ? <button disabled={busy} className="panel-quick-action panel-quick-action-primary" onClick={() => void transition(run, "ACTIVATE")}><CirclePlay size={14} /> Aktive et</button> : null}{run.status === "ACTIVE" ? <><button disabled={busy} className="panel-quick-action" onClick={() => void transition(run, "PAUSE")}><CirclePause size={14} /> Duraklat</button><button disabled={busy} className="panel-quick-action" onClick={() => void transition(run, "COMPLETE")}><SquareCheckBig size={14} /> Tamamla</button><button disabled={busy} className="panel-quick-action text-rose-700" onClick={() => void transition(run, "ROLLBACK")}><ShieldAlert size={14} /> Geri al</button></> : null}{run.status === "PAUSED" ? <><button disabled={busy} className="panel-quick-action panel-quick-action-primary" onClick={() => void transition(run, "RESUME")}><RotateCcw size={14} /> Sürdür</button><button disabled={busy} className="panel-quick-action text-rose-700" onClick={() => void transition(run, "ROLLBACK")}><ShieldAlert size={14} /> Geri al</button></> : null}</div></div></article>; })}{!rows.length ? <p className="rounded-2xl border border-dashed border-[var(--site-line)] p-8 text-center text-sm text-[var(--site-muted)]">Henüz ODK pilot koşusu yok.</p> : null}</div>
    </section>
  </div>;
}
