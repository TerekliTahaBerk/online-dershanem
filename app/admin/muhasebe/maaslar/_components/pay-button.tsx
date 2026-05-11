"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { payPayrollAction } from "../../actions";

export function PayrollPayButton({ payrollId }: { payrollId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function pay() {
    if (!confirm("Bu maaşı ÖDENDİ olarak işaretle? (Otomatik gider kaydı oluşturulacak)")) return;
    setErr(null);
    start(async () => {
      try {
        await payPayrollAction({ payrollId });
        router.refresh();
      } catch (e: any) {
        setErr(e.message ?? "Hata");
      }
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button type="button" onClick={pay} disabled={pending} className="pd-btn-accent" style={{ fontSize: 11, padding: "4px 8px" }}>
        {pending ? "..." : "Ödendi İşaretle"}
      </button>
      {err && <span style={{ fontSize: 11, color: "#ef4444" }}>{err}</span>}
    </div>
  );
}
