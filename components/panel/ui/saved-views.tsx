"use client";

/**
 * SavedViewsBar — chip strip that lists saved filter presets for the current
 * scope, lets the user save the current URL filter, and lets owners delete.
 *
 * Backed by the existing `SavedView` Prisma model and the
 * `/api/panel/saved-views` REST endpoints.
 *
 * "Filter" is captured as the current `searchParams` minus a small set of
 * keys we never want to persist (page, drawer, id, tab). Restoring a view
 * replaces the URL with the persisted filter.
 *
 * Usage:
 *
 *   <SavedViewsBar
 *     scope="students"
 *     // Optional preset views always show first (system-defined).
 *     presets={[
 *       { name: "Riskli", filter: { status: "AT_RISK" } },
 *       { name: "Yeni",   filter: { status: "NEW" } },
 *     ]}
 *   />
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PanelIcon } from "@/components/panel/ui/icon";

type Filter = Record<string, string>;

type SavedView = {
  id: string;
  name: string;
  filter: Filter;
  isShared: boolean;
  isOwner: boolean;
};

type Preset = { name: string; filter: Filter };

type Props = {
  scope: string;
  /** Always-visible system presets, rendered before user views. */
  presets?: Preset[];
  /** Keys we never persist (page, drawer state). Defaults are sensible. */
  excludeKeys?: string[];
};

const DEFAULT_EXCLUDE = ["page", "drawer", "id", "tab"];

function searchParamsToFilter(params: URLSearchParams, exclude: string[]): Filter {
  const out: Filter = {};
  for (const [k, v] of params.entries()) {
    if (exclude.includes(k)) continue;
    if (v === "" || v == null) continue;
    out[k] = v;
  }
  return out;
}

function filtersEqual(a: Filter, b: Filter): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

export function SavedViewsBar({ scope, presets = [], excludeKeys }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const exclude = useMemo(() => excludeKeys ?? DEFAULT_EXCLUDE, [excludeKeys]);

  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);

  // Current URL filter (excluding "exclude" keys)
  const currentFilter = useMemo(
    () => searchParamsToFilter(new URLSearchParams(params.toString()), exclude),
    [params, exclude],
  );
  const currentFilterEmpty = Object.keys(currentFilter).length === 0;

  const fetchViews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/panel/saved-views?scope=${encodeURIComponent(scope)}`);
      if (!res.ok) { setViews([]); return; }
      const data = (await res.json()) as { views: SavedView[] };
      setViews(data.views ?? []);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { void fetchViews(); }, [fetchViews]);

  const applyFilter = (f: Filter) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) sp.set(k, v);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const saveCurrent = async () => {
    if (!draftName.trim() || currentFilterEmpty) return;
    setBusy(true);
    try {
      const res = await fetch("/api/panel/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, name: draftName.trim(), filter: currentFilter }),
      });
      if (res.ok) {
        await fetchViews();
        setSavePromptOpen(false);
        setDraftName("");
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteView = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/panel/saved-views/${id}`, { method: "DELETE" });
      if (res.ok) await fetchViews();
    } finally {
      setBusy(false);
    }
  };

  const isPresetActive = (p: Preset) => filtersEqual(p.filter, currentFilter);
  const isViewActive = (v: SavedView) => filtersEqual(v.filter, currentFilter);

  return (
    <div className="od-savedviews" role="group" aria-label="Kayıtlı görünümler">
      <button
        type="button"
        className={`od-savedviews-chip${currentFilterEmpty ? " is-active" : ""}`}
        onClick={() => applyFilter({})}
        title="Tüm filtreleri temizle"
      >
        Tümü
      </button>

      {presets.map((p) => (
        <button
          key={`preset:${p.name}`}
          type="button"
          className={`od-savedviews-chip${isPresetActive(p) ? " is-active" : ""}`}
          onClick={() => applyFilter(p.filter)}
        >
          {p.name}
        </button>
      ))}

      {loading ? (
        <span className="od-savedviews-chip" style={{ opacity: 0.5 }}>…</span>
      ) : (
        views.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`od-savedviews-chip${isViewActive(v) ? " is-active" : ""}`}
            onClick={() => applyFilter(v.filter)}
            title={v.isShared ? "Paylaşımlı görünüm" : "Kişisel görünüm"}
          >
            <span>{v.name}</span>
            {v.isOwner ? (
              <span
                className="od-savedviews-chip-x"
                role="button"
                tabIndex={0}
                aria-label={`${v.name}: sil`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`"${v.name}" görünümü silinsin mi?`)) void deleteView(v.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    if (confirm(`"${v.name}" görünümü silinsin mi?`)) void deleteView(v.id);
                  }
                }}
              >
                <PanelIcon name="x" size={10} />
              </span>
            ) : null}
          </button>
        ))
      )}

      {!savePromptOpen ? (
        <button
          type="button"
          className="od-savedviews-chip"
          onClick={() => setSavePromptOpen(true)}
          disabled={currentFilterEmpty}
          title={currentFilterEmpty ? "Önce bir filtre seç" : "Bu filtreyi kaydet"}
          style={{ opacity: currentFilterEmpty ? 0.5 : 1 }}
        >
          <PanelIcon name="plus" size={11} />
          <span>Görünüm kaydet</span>
        </button>
      ) : (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <input
            autoFocus
            type="text"
            placeholder="Görünüm adı"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveCurrent();
              if (e.key === "Escape") { setSavePromptOpen(false); setDraftName(""); }
            }}
            disabled={busy}
            style={{
              height: 26, padding: "0 8px", fontSize: 12,
              border: "1px solid var(--pd-line)", borderRadius: 6,
              background: "var(--pd-bg)", color: "var(--pd-ink)",
            }}
          />
          <button
            type="button"
            className="od-btn od-btn-sm od-btn-primary"
            onClick={() => void saveCurrent()}
            disabled={busy || !draftName.trim()}
          >
            Kaydet
          </button>
          <button
            type="button"
            className="od-btn od-btn-sm od-btn-ghost"
            onClick={() => { setSavePromptOpen(false); setDraftName(""); }}
            disabled={busy}
          >
            İptal
          </button>
        </span>
      )}
    </div>
  );
}
