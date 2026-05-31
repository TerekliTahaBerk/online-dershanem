"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  getImportRowStatusLabel,
  getImportRowStatusTone,
  type DryRunResult,
  type CommitResult,
  type ImportEntity,
  type ImportRowStatus,
  type ValidatedRow,
} from "@/lib/panel/imports";
import { dryRunImportAction, commitImportAction } from "./_actions";

const ENTITY_OPTIONS: ReadonlyArray<{
  value: ImportEntity;
  label: string;
  templateUrl: string;
  description: string;
}> = [
  {
    value: "students",
    label: "Öğrenciler",
    templateUrl: "/api/panel/import-templates/ogrenciler",
    description: "Telefon zorunlu (DB benzersizliği). Email opsiyonel ama davet için gerekli.",
  },
  {
    value: "parents",
    label: "Veliler",
    templateUrl: "/api/panel/import-templates/veliler",
    description: "Telefon veya Email gerekli. Çocuk linki opsiyonel; eşleşmezse atlanır.",
  },
  {
    value: "teachers",
    label: "Öğretmenler",
    templateUrl: "/api/panel/import-templates/ogretmenler",
    description: "Email + Branş zorunlu. Email Teacher tablosunda benzersiz.",
  },
];

type Phase = "select" | "uploaded" | "validated" | "committed";

function tonePill(status: ImportRowStatus) {
  const tone = getImportRowStatusTone(status);
  const label = getImportRowStatusLabel(status);
  return <Badge tone={tone}>{label}</Badge>;
}

function rowKey(r: ValidatedRow) {
  return `r-${r.rowNumber}`;
}

function buildErrorCsv(entity: ImportEntity, rows: ValidatedRow[]): string {
  const failing = rows.filter((r) => r.status === "ERROR" || r.status === "WARNING");
  const headerSet = new Set<string>();
  for (const r of failing) for (const k of Object.keys(r.raw)) headerSet.add(k);
  const headers = Array.from(headerSet);
  const escapeCell = (v: string) => {
    if (v == null) return "";
    return `"${String(v).replace(/"/g, '""')}"`;
  };
  const lines: string[] = [];
  lines.push(["Satır", "Durum", "Hatalar/Uyarılar", ...headers].map(escapeCell).join(","));
  for (const r of failing) {
    const issues = [
      ...r.errors.map((e) => `[HATA${e.field ? ` ${e.field}` : ""}] ${e.message}`),
      ...r.warnings.map((w) => `[UYARI${w.field ? ` ${w.field}` : ""}] ${w.message}`),
    ].join(" | ");
    lines.push([
      String(r.rowNumber),
      getImportRowStatusLabel(r.status),
      issues,
      ...headers.map((h) => r.raw[h] ?? ""),
    ].map(escapeCell).join(","));
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ImportWizard({ initialEntity }: { initialEntity?: ImportEntity }) {
  const [entity, setEntity] = useState<ImportEntity>(initialEntity ?? "students");
  const [phase, setPhase] = useState<Phase>("select");
  const [csv, setCsv] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [dry, setDry] = useState<DryRunResult | null>(null);
  const [commit, setCommit] = useState<CommitResult | null>(null);
  const [allowWarnings, setAllowWarnings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const entityMeta = useMemo(
    () => ENTITY_OPTIONS.find((o) => o.value === entity)!,
    [entity],
  );

  function reset() {
    setPhase("select");
    setCsv("");
    setFileName("");
    setDry(null);
    setCommit(null);
    setAllowWarnings(false);
    setError(null);
  }

  async function handleFile(file: File) {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("Dosya çok büyük (>5MB). Lütfen daha küçük bir CSV yükleyin.");
      return;
    }
    const text = await file.text();
    setCsv(text);
    setFileName(file.name);
    setPhase("uploaded");
    setDry(null);
    setCommit(null);
  }

  function runDryRun() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await dryRunImportAction(entity, csv);
        setDry(r);
        setPhase("validated");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Dry-run başarısız");
      }
    });
  }

  function runCommit() {
    if (!dry) return;
    setError(null);
    if (!confirm(
      `${entity === "students" ? "Öğrenci" : entity === "parents" ? "Veli" : "Öğretmen"} içe aktarmasını onaylıyor musunuz?\n\n` +
      `Hazır: ${dry.summary.ready} / Uyarı: ${dry.summary.warning} / Hata: ${dry.summary.error} / Atlandı: ${dry.summary.skipped}\n` +
      (allowWarnings ? "Uyarılı satırlar da yazılacak.\n" : "Sadece HAZIR satırlar yazılacak.\n") +
      "Bu işlem geri alınamaz.",
    )) return;

    startTransition(async () => {
      try {
        const r = await commitImportAction(entity, csv, allowWarnings);
        setCommit(r);
        setPhase("committed");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Commit başarısız");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Step 1: pick entity */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Varlık:</span>
            {ENTITY_OPTIONS.map((opt) => {
              const active = opt.value === entity;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={pending || (phase !== "select" && phase !== "uploaded")}
                  className={
                    "rounded-md border px-3 py-1.5 text-sm transition " +
                    (active
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50") +
                    " disabled:opacity-50"
                  }
                  onClick={() => {
                    setEntity(opt.value);
                    reset();
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
            <a
              href={entityMeta.templateUrl}
              className="ml-auto rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              download
            >
              Şablonu indir (.csv)
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-500">{entityMeta.description}</p>
        </CardBody>
      </Card>

      {/* Step 2: upload */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">CSV dosyası yükle</h2>
              <p className="text-xs text-slate-500">
                UTF-8 CSV (virgül veya noktalı virgül destekli). Maks 500 satır.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = "";
                }}
              />
              {fileName ? `Dosya: ${fileName}` : "Dosya seç…"}
            </label>
          </div>
          {csv && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={runDryRun}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {pending && phase === "uploaded" ? "Doğrulanıyor…" : "Önizle (dry-run)"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={reset}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Sıfırla
              </button>
            </div>
          )}
        </CardBody>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Step 3: dry-run preview */}
      {dry && phase === "validated" && (
        <DryRunSection
          dry={dry}
          allowWarnings={allowWarnings}
          onAllowWarningsChange={setAllowWarnings}
          onCommit={runCommit}
          pending={pending}
          onDownloadErrors={() => downloadCsv(`import-${entity}-issues.csv`, buildErrorCsv(entity, dry.rows))}
        />
      )}

      {/* Step 4: commit result */}
      {commit && phase === "committed" && (
        <CommitSection commit={commit} onReset={reset} />
      )}
    </div>
  );
}

function DryRunSection({
  dry,
  allowWarnings,
  onAllowWarningsChange,
  onCommit,
  pending,
  onDownloadErrors,
}: {
  dry: DryRunResult;
  allowWarnings: boolean;
  onAllowWarningsChange: (v: boolean) => void;
  onCommit: () => void;
  pending: boolean;
  onDownloadErrors: () => void;
}) {
  const willCommit = dry.summary.ready + (allowWarnings ? dry.summary.warning : 0);
  const hasIssues = dry.rows.some((r) => r.errors.length > 0 || r.warnings.length > 0);

  return (
    <Card>
      <CardBody>
        <h2 className="text-base font-semibold text-slate-900">Önizleme</h2>
        <p className="text-xs text-slate-500">
          Doğrulama sunucu tarafında çalıştı. Aşağıdaki özet ve satır listesi karara hazır.
        </p>

        {dry.fatalErrors.length > 0 && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <strong>Genel hatalar:</strong>
            <ul className="ml-4 list-disc">
              {dry.fatalErrors.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryCard label="Toplam" value={dry.summary.total} />
          <SummaryCard label="Hazır" value={dry.summary.ready} tone="ok" />
          <SummaryCard label="Uyarı" value={dry.summary.warning} tone="warn" />
          <SummaryCard label="Hata" value={dry.summary.error} tone="bad" />
          <SummaryCard label="Atlanan" value={dry.summary.skipped} tone="neutral" />
        </div>

        {dry.rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Satır bulunamadı" description="CSV içinde işlenebilir satır yok." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2">Ad Soyad</th>
                  <th className="px-3 py-2">Telefon / Email</th>
                  <th className="px-3 py-2">Notlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dry.rows.map((r) => {
                  const fullName = r.normalized.fullName ?? r.raw["Ad Soyad"] ?? "—";
                  const phone = r.raw["Telefon"] ?? "";
                  const email = r.raw["Email"] ?? "";
                  return (
                    <tr key={rowKey(r)}>
                      <td className="px-3 py-2 align-top text-slate-500">{r.rowNumber}</td>
                      <td className="px-3 py-2 align-top">{tonePill(r.status)}</td>
                      <td className="px-3 py-2 align-top font-medium text-slate-900">{fullName}</td>
                      <td className="px-3 py-2 align-top text-slate-700">
                        <div>{phone || <span className="text-slate-400">—</span>}</div>
                        <div className="text-xs text-slate-500">{email || ""}</div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        {r.errors.map((e, i) => (
                          <div key={`e-${i}`} className="text-xs text-red-700">
                            • {e.field ? `[${e.field}] ` : ""}{e.message}
                          </div>
                        ))}
                        {r.warnings.map((w, i) => (
                          <div key={`w-${i}`} className="text-xs text-amber-700">
                            ⚠ {w.field ? `[${w.field}] ` : ""}{w.message}
                          </div>
                        ))}
                        {r.duplicates.length > 0 && r.errors.length === 0 && r.warnings.length === 0 && (
                          <div className="text-xs text-slate-500">
                            Mükerrer eşleşme: {r.duplicates.map((d) => d.existingLabel).join(", ")}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={allowWarnings}
              disabled={dry.summary.warning === 0}
              onChange={(e) => onAllowWarningsChange(e.target.checked)}
            />
            Uyarılı satırları da içe aktar ({dry.summary.warning})
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {hasIssues && (
              <button
                type="button"
                onClick={onDownloadErrors}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Sorunlu satırları indir (.csv)
              </button>
            )}
            <button
              type="button"
              onClick={onCommit}
              disabled={pending || willCommit === 0 || dry.fatalErrors.length > 0}
              className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? "Yazılıyor…" : `İçe aktar (${willCommit} satır)`}
            </button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function CommitSection({ commit, onReset }: { commit: CommitResult; onReset: () => void }) {
  return (
    <Card>
      <CardBody>
        <h2 className="text-base font-semibold text-slate-900">Sonuç</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Denenen" value={commit.summary.attempted} />
          <SummaryCard label="Oluşturulan" value={commit.summary.created} tone="ok" />
          <SummaryCard label="Atlanan" value={commit.summary.skipped} tone="neutral" />
          <SummaryCard label="Başarısız" value={commit.summary.failed} tone="bad" />
        </div>
        {commit.rows.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2">Varlık ID</th>
                  <th className="px-3 py-2">Davet / Hata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {commit.rows.map((r) => (
                  <tr key={`c-${r.rowNumber}`}>
                    <td className="px-3 py-2 text-slate-500">{r.rowNumber}</td>
                    <td className="px-3 py-2">
                      {r.ok ? <Badge tone="ok">Oluşturuldu</Badge> : <Badge tone="bad">Hata</Badge>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.entityId ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.inviteUrl && (
                        <a className="text-blue-700 underline" href={r.inviteUrl} target="_blank" rel="noreferrer">
                          {r.inviteUrl}
                        </a>
                      )}
                      {!r.ok && <span className="text-red-700">{r.error ?? "Bilinmeyen hata"}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Yeni içe aktarma
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "bad" | "neutral";
}) {
  const color =
    tone === "ok" ? "text-emerald-700"
    : tone === "warn" ? "text-amber-700"
    : tone === "bad" ? "text-red-700"
    : "text-slate-700";
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
