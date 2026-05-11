"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPayrollAction } from "../../actions";

export function PayrollCreateForm({ teachers }: { teachers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  function submit(fd: FormData) {
    setErr(null);
    start(async () => {
      try {
        await createPayrollAction({
          teacherId: String(fd.get("teacherId") ?? ""),
          periodStart: String(fd.get("periodStart") ?? ""),
          periodEnd: String(fd.get("periodEnd") ?? ""),
          amount: Math.round(Number(fd.get("amount") ?? 0) * 100),
          notes: (fd.get("notes") as string) || null,
        });
        router.refresh();
      } catch (e: any) {
        setErr(e.message ?? "Hata");
      }
    });
  }

  return (
    <form action={submit}>
      <label className="pd-field">
        <span>Öğretmen *</span>
        <select name="teacherId" className="pd-input" required>
          <option value="">— Seç —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label className="pd-field">
          <span>Dönem Başlangıç *</span>
          <input name="periodStart" type="date" className="pd-input" defaultValue={firstOfMonth} required />
        </label>
        <label className="pd-field">
          <span>Dönem Bitiş *</span>
          <input name="periodEnd" type="date" className="pd-input" defaultValue={lastOfMonth} required />
        </label>
      </div>
      <label className="pd-field">
        <span>Tutar (₺) *</span>
        <input name="amount" type="number" step="0.01" min={0.01} className="pd-input" required />
      </label>
      <label className="pd-field">
        <span>Not</span>
        <input name="notes" className="pd-input" maxLength={500} />
      </label>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
        <button type="submit" disabled={pending} className="pd-btn-accent">
          {pending ? "Kaydediliyor…" : "Maaş Kaydı Ekle"}
        </button>
        {err && <span style={{ fontSize: 12, color: "#ef4444" }}>{err}</span>}
      </div>
    </form>
  );
}
