"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArchiveImpactSummary } from "@/lib/panel/archive-impact";

export function ArchiveUserAction({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const [impact, setImpact] = useState<ArchiveImpactSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || impact) return;
    setLoadingImpact(true);
    void fetch(`/api/panel/users/${userId}/archive-impact`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Etki analizi alınamadı.");
        setImpact(data as ArchiveImpactSummary);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingImpact(false));
  }, [open, impact, userId]);

  async function archive() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/panel/users/${userId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Arşivleme başarısız.");
        setPending(false);
        return;
      }
      router.refresh();
      setOpen(false);
    } catch {
      setError("Arşivleme başarısız.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[12px] border border-[var(--site-line)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--site-ink)]">Kullanıcıyı arşivle</h3>
          <p className="mt-1 text-[12.5px] text-[var(--site-muted)]">
            Hard delete son seçenektir. Önce etki analizini görün.
          </p>
        </div>
        <button
          type="button"
          className="site-btn site-btn-secondary site-btn-sm"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Gizle" : "Etki analizi"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3">
          {loadingImpact ? <p className="text-sm text-[var(--site-muted)]">Analiz yükleniyor…</p> : null}
          {impact ? (
            <>
              <p className="text-[13.5px] font-semibold text-[var(--site-ink)]">{impact.message}</p>
              <ul className="space-y-1.5 text-[13px] text-[var(--site-muted)]">
                {impact.buckets.length ? (
                  impact.buckets.map((bucket) => (
                    <li key={bucket.key}>
                      {bucket.label}: <strong className="text-[var(--site-ink)]">{bucket.count}</strong>
                    </li>
                  ))
                ) : (
                  <li>Kritik ilişki yok.</li>
                )}
              </ul>
              <button
                type="button"
                disabled={pending}
                onClick={() => void archive()}
                className="site-btn site-btn-primary site-btn-sm"
              >
                {pending ? "Arşivleniyor…" : `${userName} hesabını arşivle`}
              </button>
            </>
          ) : null}
          {error ? (
            <p className="text-sm font-semibold text-[var(--brand-danger,#b42318)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
