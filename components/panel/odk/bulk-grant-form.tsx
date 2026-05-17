"use client";

import { useState, useTransition } from "react";
import {
  bulkGrantOdkAccessAction,
  type BulkValidationResult,
} from "@/app/panel/admin/odk/erisim/bulk/_actions";

export function BulkGrantForm() {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<(BulkValidationResult & { applied?: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(mode: "dry-run" | "apply") {
    setError(null);
    if (!csv.trim()) { setError("CSV boş."); return; }
    const fd = new FormData();
    fd.set("csv", csv);
    fd.set("mode", mode);
    startTransition(async () => {
      try {
        const res = await bulkGrantOdkAccessAction(fd);
        setResult(res);
      } catch (e) {
        setError((e as Error).message ?? "Hata");
      }
    });
  }

  async function onFile(file: File) {
    const text = await file.text();
    setCsv(text);
    setResult(null);
  }

  return (
    <>
      <div className="od-card" style={{ padding: 16 }}>
        <h3 style={{ margin: "0 0 12px" }}>CSV girdisi</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            disabled={pending}
          />
          <span className="od-muted" style={{ fontSize: 12 }}>
            ya da aşağıya yapıştırın
          </span>
        </div>
        <textarea
          value={csv}
          onChange={(e) => { setCsv(e.target.value); setResult(null); }}
          rows={10}
          placeholder="email,phone,accessTagKey,expiresAt&#10;..."
          className="od-mono"
          style={{ width: "100%", fontSize: 12, padding: 10, borderRadius: 8, border: "1px solid var(--pd-border, #e5e0d8)" }}
          disabled={pending}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={() => submit("dry-run")}
            className="od-btn od-btn-ghost"
            disabled={pending}
          >
            {pending ? "Doğrulanıyor…" : "Kuru çalıştırma (dry-run)"}
          </button>
          <button
            type="button"
            onClick={() => submit("apply")}
            className="od-btn od-btn-primary"
            disabled={pending || !result || result.validCount === 0}
            title={!result ? "Önce dry-run çalıştırın" : ""}
          >
            {pending ? "Uygulanıyor…" : `Uygula (${result?.validCount ?? 0} kayıt)`}
          </button>
          {error ? <span style={{ color: "var(--pd-danger, #b94a48)", fontSize: 13 }}>{error}</span> : null}
        </div>
      </div>

      {result ? (
        <div className="od-card" style={{ padding: 16, marginTop: 16 }}>
          <h3 style={{ margin: "0 0 12px" }}>
            Sonuç
            {result.applied !== undefined ? (
              <span style={{ marginLeft: 8, fontSize: 13, color: "var(--pd-success, #2e7d32)" }}>
                · {result.applied} kayıt uygulandı
              </span>
            ) : null}
          </h3>
          <div className="od-kpi-grid" style={{ marginBottom: 12 }}>
            <div className="od-kpi"><span>Toplam satır</span><strong>{result.totalRows}</strong></div>
            <div className="od-kpi"><span>Geçerli</span><strong style={{ color: "var(--pd-success, #2e7d32)" }}>{result.validCount}</strong></div>
            <div className="od-kpi"><span>Hatalı</span><strong style={{ color: "var(--pd-danger, #b94a48)" }}>{result.errorCount}</strong></div>
          </div>
          {result.rows.length === 0 ? (
            <p className="od-muted">Hiç satır bulunamadı.</p>
          ) : (
            <table className="od-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Kullanıcı</th>
                  <th>Tag</th>
                  <th>Bitiş</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.line}>
                    <td className="od-mono od-muted">{r.line}</td>
                    <td>
                      {r.userLabel ?? <span className="od-muted">—</span>}
                      <div className="od-muted" style={{ fontSize: 11 }}>{r.email ?? r.phone}</div>
                    </td>
                    <td>
                      {r.accessTagLabel ?? <span className="od-muted">—</span>}
                      <div className="od-muted" style={{ fontSize: 11 }}>{r.accessTagKey}</div>
                    </td>
                    <td className="od-mono od-muted">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("tr-TR") : "süresiz"}</td>
                    <td>
                      {r.willGrant ? (
                        <span style={{ background: "var(--pd-success-bg, #e6f4ea)", color: "var(--pd-success, #2e7d32)", padding: "2px 8px", borderRadius: 6, fontSize: 11 }}>OK</span>
                      ) : (
                        <span style={{ background: "var(--pd-danger-bg, #fdecea)", color: "var(--pd-danger, #b94a48)", padding: "2px 8px", borderRadius: 6, fontSize: 11 }}>
                          {r.errors.join("; ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </>
  );
}
