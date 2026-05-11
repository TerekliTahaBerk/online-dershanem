"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAccountingEntryAction } from "../actions";

const INCOME_CATS = [
  { value: "PACKAGE_SALE", label: "Paket Satışı" },
  { value: "CAMP_SALE", label: "Kamp Satışı" },
  { value: "SERVICE_FEE", label: "Hizmet Ücreti" },
  { value: "OTHER_INCOME", label: "Diğer Gelir" },
];
const EXPENSE_CATS = [
  { value: "TEACHER_PAYROLL", label: "Öğretmen Maaşı" },
  { value: "MARKETING", label: "Pazarlama" },
  { value: "RENT", label: "Kira" },
  { value: "TAX", label: "Vergi" },
  { value: "OPERATIONAL", label: "Operasyonel" },
  { value: "OTHER_EXPENSE", label: "Diğer Gider" },
];

export function EntryForm({
  type,
  students,
  teachers,
}: {
  type: "INCOME" | "EXPENSE";
  students: { id: string; fullName: string }[];
  teachers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const cats = type === "INCOME" ? INCOME_CATS : EXPENSE_CATS;
  const today = new Date().toISOString().slice(0, 10);

  function submit(fd: FormData) {
    setErr(null);
    start(async () => {
      try {
        await createAccountingEntryAction({
          type,
          category: fd.get("category") as any,
          amount: Math.round(Number(fd.get("amount") ?? 0) * 100), // TL → kuruş
          occurredAt: String(fd.get("occurredAt") ?? today),
          description: (fd.get("description") as string) || null,
          studentId: (fd.get("studentId") as string) || null,
          teacherId: (fd.get("teacherId") as string) || null,
        });
        router.push("/admin/muhasebe");
      } catch (e: any) {
        setErr(e.message ?? "Hata");
      }
    });
  }

  return (
    <form action={submit} className="pd-card" style={{ padding: 20, maxWidth: 640 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <label className="pd-field">
          <span>Kategori *</span>
          <select name="category" className="pd-input" required>
            {cats.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="pd-field">
          <span>Tutar (₺) *</span>
          <input name="amount" type="number" step="0.01" min={0.01} className="pd-input" required />
        </label>
        <label className="pd-field">
          <span>Tarih *</span>
          <input name="occurredAt" type="date" className="pd-input" defaultValue={today} required />
        </label>
      </div>

      <label className="pd-field">
        <span>Açıklama</span>
        <textarea name="description" className="pd-input" rows={3} maxLength={500} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label className="pd-field">
          <span>Öğrenci (opsiyonel)</span>
          <select name="studentId" className="pd-input">
            <option value="">—</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="pd-field">
          <span>Öğretmen (opsiyonel)</span>
          <select name="teacherId" className="pd-input">
            <option value="">—</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" disabled={pending} className="pd-btn-accent">
          {pending ? "Kaydediliyor…" : `Kaydet (${type === "INCOME" ? "Gelir" : "Gider"})`}
        </button>
        {err && <span style={{ fontSize: 13, color: "#ef4444" }}>{err}</span>}
      </div>
    </form>
  );
}
