"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

type Props = { user: { id: string; role: string; email: string; fullName: string; phone: string; classLevel: string; schoolName: string; targetGoal: string; subjects: string[]; bio: string } };

export function AdminUserProfileForm({ user }: Props) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  return <details className="panel-surface mt-5" open><summary className="cursor-pointer list-none px-5 py-4 text-sm font-extrabold text-[var(--site-ink)]">Profil bilgilerini düzenle</summary><form className="border-t border-[var(--site-line)] p-5" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setMessage(""); const data = new FormData(event.currentTarget); const response = await fetch(`/api/panel/users/${user.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), fullName: data.get("fullName"), phone: data.get("phone"), classLevel: data.get("classLevel"), schoolName: data.get("schoolName"), targetGoal: data.get("targetGoal"), subjects: String(data.get("subjects") || "").split(",").map((item) => item.trim()).filter(Boolean), bio: data.get("bio") }) }); const result = await response.json().catch(() => ({})); setBusy(false); if (!response.ok) return setMessage(result.error || "Profil güncellenemedi."); setMessage("Profil güncellendi."); router.refresh(); }}>
    <div className="grid gap-2 sm:grid-cols-3"><input name="fullName" defaultValue={user.fullName} className="panel-input" placeholder="Ad soyad" /><input name="email" type="email" required defaultValue={user.email} className="panel-input" placeholder="E-posta" /><input name="phone" defaultValue={user.phone} className="panel-input" placeholder="Telefon" /></div>
    {user.role === "STUDENT" ? <div className="mt-2 grid gap-2 sm:grid-cols-2"><input name="classLevel" defaultValue={user.classLevel} className="panel-input" placeholder="Sınıf seviyesi" /><input name="schoolName" defaultValue={user.schoolName} className="panel-input" placeholder="Okul" /><textarea name="targetGoal" defaultValue={user.targetGoal} className="panel-input min-h-24 sm:col-span-2" placeholder="Hedefi" /></div> : null}
    {user.role === "TEACHER" ? <div className="mt-2 grid gap-2"><input name="subjects" defaultValue={user.subjects.join(", ")} className="panel-input" placeholder="Branşlar (virgülle ayırın)" /><textarea name="bio" defaultValue={user.bio} className="panel-input min-h-24" placeholder="Kısa öğretmen tanıtımı" /></div> : null}
    <div className="mt-3 flex items-center justify-between gap-3"><p aria-live="polite" className="text-xs font-bold text-[var(--brand-olive)]">{message}</p><button disabled={busy} className="panel-quick-action panel-quick-action-primary"><Save size={14} /> {busy ? "Kaydediliyor" : "Profili kaydet"}</button></div>
  </form></details>;
}
