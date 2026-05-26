"use client";

/**
 * Server-side pagination — URL searchParams güdümlü.
 * `?page=N&pageSize=M` standardını uygular.
 *
 * Tasarım:
 * - Toplam kayıt bilinmiyorsa (count yok), "Sonraki / Önceki" modu
 * - Toplam biliniyorsa, "N / M sayfa" + page number'lar
 * - PageSize selector (25 / 50 / 100 / 200) — opsiyonel
 *
 * Tüm sayfa numarası değişiklikleri scroll'u yukarı taşır (server replace değil push)
 * — kullanıcı geri tuşuyla önceki sayfaya dönebilsin.
 */

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useMemo } from "react";
import { PanelIcon } from "@/components/panel/ui/icon";

type Props = {
  /** Toplam kayıt sayısı (bilinmiyorsa undefined) */
  total?: number;
  /** O anki sayfa (1-based) */
  page: number;
  /** Sayfa boyutu */
  pageSize: number;
  /** Bu sayfada gerçekten kaç satır geldi (next disable için) */
  rowCount: number;
  /** PageSize seçimi etkin mi (varsayılan: açık) */
  enablePageSize?: boolean;
  /** Mevcut sayfa boyutu seçenekleri */
  pageSizeOptions?: number[];
};

const DEFAULT_OPTIONS = [25, 50, 100, 200];

export function Pagination({
  total,
  page,
  pageSize,
  rowCount,
  enablePageSize = true,
  pageSizeOptions = DEFAULT_OPTIONS,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const totalPages = useMemo(() => {
    if (typeof total !== "number") return undefined;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const goPage = (next: number) => {
    const sp = new URLSearchParams(params.toString());
    if (next <= 1) sp.delete("page"); else sp.set("page", String(next));
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`, { scroll: false });
    });
  };

  const setPageSize = (n: number) => {
    const sp = new URLSearchParams(params.toString());
    if (n === DEFAULT_OPTIONS[1]) sp.delete("pageSize");
    else sp.set("pageSize", String(n));
    sp.delete("page"); // yeni size'da ilk sayfaya dön
    startTransition(() => {
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    });
  };

  const canPrev = page > 1;
  const canNext = totalPages ? page < totalPages : rowCount >= pageSize;

  // Sayfa numarası listesi (ellipsis ile)
  const pageNumbers = useMemo<(number | "…")[]>(() => {
    if (!totalPages) return [];
    const max = 7; // toplam slot
    if (totalPages <= max) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: (number | "…")[] = [1];
    const start = Math.max(2, page - 2);
    const end = Math.min(totalPages - 1, page + 2);
    if (start > 2) out.push("…");
    for (let i = start; i <= end; i++) out.push(i);
    if (end < totalPages - 1) out.push("…");
    out.push(totalPages);
    return out;
  }, [page, totalPages]);

  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo   = total === 0 ? 0 : (page - 1) * pageSize + rowCount;

  return (
    <div className="od-pager" data-pending={pending ? "1" : undefined}>
      <div className="od-pager-info">
        {typeof total === "number" ? (
          total === 0 ? (
            <span>Kayıt yok</span>
          ) : (
            <span>
              <strong>{showingFrom.toLocaleString("tr-TR")}–{showingTo.toLocaleString("tr-TR")}</strong>
              <span className="od-muted"> / {total.toLocaleString("tr-TR")} kayıt</span>
            </span>
          )
        ) : (
          <span className="od-muted">Sayfa {page}{rowCount > 0 ? ` · ${rowCount} satır` : ""}</span>
        )}
      </div>

      <div className="od-pager-ctrl">
        {enablePageSize ? (
          <label className="od-pager-size">
            <span className="od-muted" style={{ fontSize: 12 }}>Sayfa boyutu</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="od-select"
              disabled={pending}
              aria-label="Sayfa boyutu"
            >
              {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        ) : null}

        <div className="od-pager-nav">
          <button
            type="button"
            className="od-iconbtn"
            onClick={() => goPage(1)}
            disabled={!canPrev || pending}
            aria-label="İlk sayfa"
            title="İlk sayfa"
          >
            «
          </button>
          <button
            type="button"
            className="od-iconbtn"
            onClick={() => goPage(page - 1)}
            disabled={!canPrev || pending}
            aria-label="Önceki sayfa"
            title="Önceki"
          >
            <PanelIcon name="chev" size={14} className="od-rot-180" />
          </button>

          {totalPages ? (
            <div className="od-pager-pages">
              {pageNumbers.map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} className="od-pager-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`od-pager-page${p === page ? " is-active" : ""}`}
                    onClick={() => goPage(p)}
                    disabled={pending}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p}
                  </button>
                ),
              )}
            </div>
          ) : (
            <span className="od-pager-page is-active" aria-current="page">{page}</span>
          )}

          <button
            type="button"
            className="od-iconbtn"
            onClick={() => goPage(page + 1)}
            disabled={!canNext || pending}
            aria-label="Sonraki sayfa"
            title="Sonraki"
          >
            <PanelIcon name="chev" size={14} />
          </button>
          {totalPages ? (
            <button
              type="button"
              className="od-iconbtn"
              onClick={() => goPage(totalPages)}
              disabled={!canNext || pending}
              aria-label="Son sayfa"
              title="Son sayfa"
            >
              »
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Server helper — searchParams'tan page/pageSize'ı güvenli parse etmek için
// ────────────────────────────────────────────────────────────────────────────

export type ParsedPagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

const ALLOWED_SIZES = new Set([25, 50, 100, 200]);

export function parsePagination(
  searchParams: { page?: string; pageSize?: string },
  defaults: { pageSize?: number; maxPageSize?: number } = {},
): ParsedPagination {
  const defSize = defaults.pageSize ?? 50;
  const max = defaults.maxPageSize ?? 200;

  let page = Number.parseInt(searchParams.page ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > 100000) page = 100000;

  let pageSize = Number.parseInt(searchParams.pageSize ?? String(defSize), 10);
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = defSize;
  if (!ALLOWED_SIZES.has(pageSize)) pageSize = defSize;
  if (pageSize > max) pageSize = max;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
