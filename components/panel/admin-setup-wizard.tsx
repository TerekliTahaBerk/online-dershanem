"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Rocket, UsersRound } from "lucide-react";
import { DEFAULT_GROUP_CAPACITY } from "@/lib/panel-group-capacity";

type Person = { id: string; name: string };
type SetupRole = "TEACHER" | "STUDENT" | "PARENT";
type Invitation = { name: string; email: string; inviteUrl: string; inviteExpiresAt: string; role: SetupRole };

export function AdminSetupWizard({ teachers, students, parents }: { teachers: Person[]; students: Person[]; parents: Person[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [people, setPeople] = useState({ teachers, students, parents });
  const [selected, setSelected] = useState<string[]>([]);
  const [parentByStudent, setParentByStudent] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  return <section id="hizli-kurulum" className="panel-surface scroll-mt-24 overflow-hidden">
    <div className="flex flex-col gap-4 border-b border-[var(--site-line)] bg-[linear-gradient(135deg,#f0f5ec,#fff_60%,#fff7d7)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.08em] text-[var(--brand-olive)]"><Rocket size={15} /> Hızlı kurulum</p><h2 className="mt-2 text-xl font-semibold tracking-[-.04em] text-[var(--site-ink)]">Bir grubu üç adımda canlıya alın.</h2><p className="mt-1 text-xs text-[var(--site-muted)]">Hesapları burada açın; grup, veli bağlantıları ve haftalık dersleri aynı akışta hazırlayın.</p></div><div className="flex gap-2">{[1,2,3].map((item) => <span key={item} className={`grid h-8 w-8 place-items-center rounded-full text-xs font-extrabold ${item <= step ? "bg-[var(--brand-olive)] text-white" : "bg-white text-[var(--site-muted)]"}`}>{item}</span>)}</div></div>

    <div className="border-b border-[var(--site-line)] bg-[var(--site-soft)] p-5 sm:p-6">
      <div className="mb-3"><h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--site-ink)]"><Plus size={15} /> Bu kurulum için yeni hesap aç</h3><p className="mt-1 text-xs text-[var(--site-muted)]">Hesap anında aşağıdaki seçimlere eklenir. Mevcut hesaplarla devam edecekseniz bu alanı atlayın.</p></div>
      <form className="grid gap-2 md:grid-cols-[150px_1fr_1fr_auto]" onSubmit={async (event) => {
        event.preventDefault(); setAccountBusy(true); setAccountMessage(""); const form = event.currentTarget; const data = new FormData(form); const role = String(data.get("role")) as SetupRole;
        const products = role === "TEACHER" ? ["OD", "OK", "ODK"] : ["OD"];
        const response = await fetch("/api/panel/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role, fullName: data.get("fullName"), email: data.get("email"), products }) });
        const result = await response.json().catch(() => ({})); setAccountBusy(false);
        if (!response.ok) return setAccountMessage(result.error || "Hesap açılamadı.");
        const person = { id: role === "STUDENT" ? result.user.studentProfileId : result.user.id, name: result.user.fullName || result.user.email };
        if (!person.id) return setAccountMessage("Öğrenci profili oluşturulamadı.");
        setPeople((current) => role === "TEACHER" ? { ...current, teachers: [...current.teachers, person] } : role === "STUDENT" ? { ...current, students: [...current.students, person] } : { ...current, parents: [...current.parents, person] });
        if (role === "STUDENT") setSelected((current) => current.length < DEFAULT_GROUP_CAPACITY ? [...current, person.id] : current);
        if (!result.invite?.url || !result.invite?.expiresAt) return setAccountMessage("Davet bağlantısı üretilemedi.");
        setInvitations((current) => [
          ...current,
          {
            name: person.name,
            email: result.user.email,
            inviteUrl: result.invite.url,
            inviteExpiresAt: result.invite.expiresAt,
            role,
          },
        ]);
        setAccountMessage(`${person.name} hesabı hazır ve seçimlere eklendi.`); form.reset();
      }}>
        <select name="role" className="panel-input" defaultValue="STUDENT"><option value="STUDENT">Öğrenci</option><option value="PARENT">Veli</option><option value="TEACHER">Öğretmen</option></select>
        <input name="fullName" required className="panel-input" placeholder="Ad soyad" />
        <input name="email" type="email" required className="panel-input" placeholder="E-posta" />
        <button disabled={accountBusy} className="panel-quick-action panel-quick-action-primary justify-center">{accountBusy ? "Açılıyor" : "Hesabı ekle"}</button>
      </form>
      <p aria-live="polite" className="mt-2 text-xs font-bold text-[var(--brand-olive)]">{accountMessage}</p>
      {invitations.length ? <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3"><p className="text-[10.5px] font-extrabold uppercase tracking-wide text-amber-800">Davet bağlantılarını şimdi iletin · süre sonunda yenilemeniz gerekir</p><div className="mt-2 grid gap-2 md:grid-cols-2">{invitations.map((item) => <div key={item.email} className="rounded-xl bg-white px-3 py-2 text-xs text-[var(--site-body)]"><strong>{item.name}</strong><br />{item.email}<br /><a className="font-semibold text-[var(--brand-olive)] underline" href={item.inviteUrl} target="_blank" rel="noreferrer noopener">Davet bağlantısını aç</a></div>)}</div></div> : null}
    </div>

    <form noValidate className="p-5 sm:p-6" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setMessage(""); if (step === 1 && (!data.get("name") || !data.get("subject") || !data.get("teacherId"))) return setMessage("Grup adı, ders ve öğretmen zorunlu."); if (step === 2 && !selected.length) return setMessage("En az bir öğrenci seçin."); if (step < 3) return setStep(step + 1); if (!data.get("lessonTitle") || !data.get("startsAt")) return setMessage("Ders başlığı ve ilk ders zamanı zorunlu."); setBusy(true); const response = await fetch("/api/panel/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: data.get("name"), subject: data.get("subject"), level: data.get("level"), teacherId: data.get("teacherId"), studentIds: selected, parentLinks: selected.filter((id) => parentByStudent[id]).map((studentId) => ({ studentId, parentId: parentByStudent[studentId] })), lessonTitle: data.get("lessonTitle"), startsAt: new Date(String(data.get("startsAt"))).toISOString(), repeatWeeks: Number(data.get("repeatWeeks")), meetingUrl: data.get("meetingUrl") }) }); const result = await response.json().catch(() => ({})); setBusy(false); if (!response.ok) return setMessage(result.error || "Kurulum tamamlanamadı."); setMessage(`${result.lessonCount} haftalık dersle grup hazır.`); router.refresh(); }}>
      <div className={step === 1 ? "grid gap-3 sm:grid-cols-2" : "hidden"}><label><span className="panel-label">Grup adı</span><input name="name" required className="panel-input mt-2" placeholder="LGS Matematik A" /></label><label><span className="panel-label">Öğretmen</span><select name="teacherId" required className="panel-input mt-2"><option value="">Öğretmen seçin</option>{people.teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span className="panel-label">Ders</span><input name="subject" required className="panel-input mt-2" placeholder="Matematik" /></label><label><span className="panel-label">Seviye</span><input name="level" className="panel-input mt-2" placeholder="8. Sınıf" /></label></div>
      <div className={step === 2 ? "grid gap-3 md:grid-cols-2" : "hidden"}>{people.students.map((student) => { const active = selected.includes(student.id); return <div key={student.id} className={`rounded-2xl border p-3 ${active ? "border-[var(--brand-olive)] bg-[var(--brand-olive-soft)]" : "border-[var(--site-line)]"}`}><label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-[var(--site-ink)]"><input type="checkbox" checked={active} onChange={() => setSelected((current) => active ? current.filter((id) => id !== student.id) : current.length < DEFAULT_GROUP_CAPACITY ? [...current, student.id] : current)} />{student.name}</label>{active ? <select aria-label={`${student.name} velisi`} value={parentByStudent[student.id] || ""} onChange={(event) => setParentByStudent({ ...parentByStudent, [student.id]: event.target.value })} className="panel-input mt-3"><option value="">Veli sonra bağlanacak</option>{people.parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select> : null}</div>; })}<p className="md:col-span-2 text-xs text-[var(--site-muted)]"><UsersRound size={13} className="mr-1 inline" /> {selected.length}/{DEFAULT_GROUP_CAPACITY} öğrenci seçildi</p></div>
      <div className={step === 3 ? "grid gap-3 sm:grid-cols-2" : "hidden"}><label><span className="panel-label">Ders başlığı</span><input name="lessonTitle" required className="panel-input mt-2" placeholder="Haftalık Matematik Dersi" /></label><label><span className="panel-label">İlk ders</span><input name="startsAt" type="datetime-local" required className="panel-input mt-2" /></label><label><span className="panel-label">Program</span><select name="repeatWeeks" defaultValue="8" className="panel-input mt-2"><option value="4">4 hafta</option><option value="8">8 hafta</option><option value="12">12 hafta</option></select></label><label><span className="panel-label">Canlı ders bağlantısı</span><input name="meetingUrl" type="url" className="panel-input mt-2" placeholder="https://..." /></label></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="flex items-center gap-2 text-xs font-bold text-[var(--brand-olive)]">{message ? <><CheckCircle2 size={14} />{message}</> : step === 2 && !selected.length ? "En az bir öğrenci seçin." : ""}</p><div className="flex gap-2">{step > 1 ? <button type="button" onClick={() => setStep(step - 1)} className="panel-quick-action">Geri</button> : null}<button disabled={busy || (step === 2 && !selected.length)} className="panel-quick-action panel-quick-action-primary">{step < 3 ? "Devam" : busy ? "Hazırlanıyor" : "Kurulumu tamamla"}</button></div></div>
    </form>
  </section>;
}
