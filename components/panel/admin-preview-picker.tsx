"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Search, X } from "lucide-react";
import {
  PREVIEWABLE_ROLES,
  previewBannerCopy,
  type PreviewableRole,
} from "@/lib/panel/preview-context";

type Candidate = {
  userId: string;
  fullName: string | null;
  email: string;
  status: string;
  detail: string | null;
  invitePending: boolean;
};

const ROLE_OPTIONS: { role: PreviewableRole; label: string }[] = [
  { role: "STUDENT", label: "Öğrenci" },
  { role: "PARENT", label: "Veli" },
  { role: "TEACHER", label: "Öğretmen" },
];

export function AdminPreviewPicker({
  open: openProp,
  onOpenChange,
  initialRole,
  returnPath,
  compact = false,
  hideTrigger = false,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialRole?: PreviewableRole;
  returnPath?: string;
  compact?: boolean;
  hideTrigger?: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [role, setRole] = useState<PreviewableRole>(initialRole ?? "STUDENT");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialRole && PREVIEWABLE_ROLES.includes(initialRole)) setRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ role, q: debounced });
    fetch(`/api/panel/admin-preview/candidates?${params}`, { credentials: "same-origin" })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { candidates?: Candidate[]; error?: string } | null;
        if (!response.ok) throw new Error(body?.error || "Arama başarısız.");
        if (!cancelled) {
          setCandidates(body?.candidates ?? []);
          setSelectedId(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Arama başarısız.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, role, debounced]);

  const selected = useMemo(
    () => candidates.find((item) => item.userId === selectedId) ?? null,
    [candidates, selectedId],
  );
  const cta = previewBannerCopy({
    role,
    subjectName: selected?.fullName || selected?.email || "kullanıcı",
  }).ctaLabel;

  function startPreview() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/panel/admin-preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previewRole: role,
          previewUserId: selected.userId,
          returnPath: returnPath || window.location.pathname,
        }),
      });
      const body = (await response.json().catch(() => null)) as { homePath?: string; error?: string } | null;
      if (!response.ok) {
        setError(body?.error || "Önizleme başlatılamadı.");
        return;
      }
      setOpen(false);
      router.push(body?.homePath || "/panel");
      router.refresh();
    });
  }

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            compact
              ? "inline-flex items-center gap-1.5 rounded-[10px] border border-dc-line bg-white px-2.5 py-1.5 text-[12px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
              : "inline-flex items-center gap-1.5 rounded-[10px] border border-dc-line bg-white px-3 py-2 text-[12.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
          }
        >
          <Eye size={14} aria-hidden="true" />
          Paneli Görüntüle
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-3 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-[16px] border border-dc-line bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-dc-line-soft px-4 py-3.5">
              <div>
                <h2 id={titleId} className="text-[16px] font-extrabold text-dc-ink">
                  Paneli görüntüle
                </h2>
                <p className="mt-1 text-[13px] text-dc-ink-muted">
                  Oturumunuz yönetici olarak kalır. Önizleme salt okunurdur.
                </p>
              </div>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-dc-ink-muted hover:bg-dc-surface-muted hover:text-dc-ink"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-4 py-4">
              <fieldset>
                <legend className="text-[12px] font-bold uppercase tracking-[0.06em] text-dc-ink-ghost">
                  Rol seç
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.role}
                      type="button"
                      onClick={() => setRole(option.role)}
                      aria-pressed={role === option.role}
                      className={`rounded-full px-3 py-1.5 text-[12.5px] font-bold ${
                        role === option.role
                          ? "bg-dc-brand text-white"
                          : "border border-dc-line bg-white text-dc-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-dc-ink-ghost">
                  Kullanıcı ara
                </span>
                <span className="relative mt-2 block">
                  <Search
                    size={14}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dc-ink-ghost"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      role === "STUDENT"
                        ? "Ad, e-posta, öğrenci ID, grup…"
                        : role === "PARENT"
                          ? "Ad, e-posta, bağlı öğrenci…"
                          : "Ad, e-posta, ders/grup…"
                    }
                    className="panel-input w-full pl-9"
                  />
                </span>
              </label>

              <div className="max-h-64 overflow-y-auto rounded-[12px] border border-dc-line-soft">
                {loading ? (
                  <p className="px-3 py-4 text-[13px] text-dc-ink-muted">Aranıyor…</p>
                ) : candidates.length === 0 ? (
                  <p className="px-3 py-4 text-[13px] text-dc-ink-muted">Sonuç bulunamadı.</p>
                ) : (
                  <ul className="divide-y divide-dc-line-soft">
                    {candidates.map((item) => {
                      const active = item.userId === selectedId;
                      return (
                        <li key={item.userId}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(item.userId)}
                            className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors ${
                              active ? "bg-dc-brand-soft" : "hover:bg-dc-surface-muted"
                            }`}
                          >
                            <span className="text-[13.5px] font-bold text-dc-ink">
                              {item.fullName || item.email}
                            </span>
                            <span className="text-[12px] text-dc-ink-muted">{item.email}</span>
                            {item.detail ? (
                              <span className="text-[11.5px] text-dc-ink-faint">{item.detail}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {error ? <p className="text-[12.5px] font-semibold text-red-700">{error}</p> : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-dc-line-soft px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[10px] border border-dc-line bg-white px-3 py-2 text-[12.5px] font-bold text-dc-ink"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={!selected || pending}
                onClick={startPreview}
                className="rounded-[10px] bg-dc-brand px-3 py-2 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Açılıyor…" : cta}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
