"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, ShieldAlert } from "lucide-react";

type HistoryRow = {
  id: string;
  productCode: string;
  role: string;
  source: string;
  grantedAt: string;
  grantedBy: string | null;
  grantReason: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  lastHolder: boolean;
};

const PRODUCT_LABEL: Record<string, string> = {
  OD: "onlinedershanem.",
  OK: "Yön Koçluk",
  ODK: "Deneme Ligi",
};

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Ders öğretmeni",
  COACH: "Yön koçu",
  EXAM_EDITOR: "Deneme editörü",
  EXAM_OPERATOR: "Deneme operatörü",
  RESULT_PUBLISHER: "Sonuç yayıncısı",
  REPORT_VIEWER: "Rapor okuyucu",
  PRODUCT_MANAGER: "Ürün yöneticisi",
};

/** Geçerli (ürün, rol) çiftleri — sunucudaki matrisle aynı; sunucu ayrıca doğrular. */
const OPTIONS: Array<{ product: string; role: string }> = [
  { product: "OD", role: "TEACHER" },
  { product: "OD", role: "PRODUCT_MANAGER" },
  { product: "OK", role: "COACH" },
  { product: "OK", role: "PRODUCT_MANAGER" },
  { product: "ODK", role: "REPORT_VIEWER" },
  { product: "ODK", role: "EXAM_EDITOR" },
  { product: "ODK", role: "EXAM_OPERATOR" },
  { product: "ODK", role: "RESULT_PUBLISHER" },
  { product: "ODK", role: "PRODUCT_MANAGER" },
];

const DATE = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

/**
 * Erişim Merkezi · ürün sorumlulukları. Platform rolü değişmez; her işlem
 * gerekçe ve taze step-up ister, geçmiş satırları silinmez.
 */
export function AdminStaffResponsibilitiesForm({
  userId,
  history,
  coachCapacity,
  mfaPending,
}: {
  userId: string;
  history: HistoryRow[];
  coachCapacity: number | null;
  /** Ayrıcalıklı rolü olup henüz MFA kurmamış hesap. */
  mfaPending: boolean;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState(`${OPTIONS[0]!.product}:${OPTIONS[0]!.role}`);
  const [reason, setReason] = useState("");
  const [capacity, setCapacity] = useState(coachCapacity === null ? "" : String(coachCapacity));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; stepUp?: boolean; error?: boolean } | null>(null);

  const active = history.filter((row) => !row.revokedAt);
  const past = history.filter((row) => row.revokedAt);
  const isCoach = active.some((row) => row.productCode === "OK" && row.role === "COACH");

  async function call(method: "POST" | "DELETE" | "PATCH", url: string, body: unknown, success: string) {
    setBusy(true);
    setMessage(null);
    const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await response.json().catch(() => ({}))) as { error?: string; code?: string; lastHolderWarning?: boolean };
    setBusy(false);
    if (!response.ok) {
      setMessage({ text: data.error || "İşlem tamamlanamadı.", stepUp: data.code === "STEP_UP_REQUIRED", error: true });
      return false;
    }
    setMessage({
      text: data.lastHolderWarning
        ? `${success} Bu rolü taşıyan başka personel kalmadı; bu işi artık yalnız yöneticiler yapabilir.`
        : success,
    });
    router.refresh();
    return true;
  }

  async function grant(event: React.FormEvent) {
    event.preventDefault();
    const [product, role] = choice.split(":");
    if (reason.trim().length < 3) return setMessage({ text: "Gerekçe en az 3 karakter olmalı.", error: true });
    if (await call("POST", `/api/panel/users/${userId}/staff-roles`, { product, role, reason }, "Sorumluluk verildi.")) setReason("");
  }

  async function revoke(row: HistoryRow) {
    const warning = row.lastHolder
      ? "\n\nUyarı: bu rolü taşıyan başka personel yok; işlem engellenmez ama bu iş yalnız yöneticilere kalır."
      : "";
    const revokeReason = window.prompt(`${PRODUCT_LABEL[row.productCode] ?? row.productCode} · ${ROLE_LABEL[row.role] ?? row.role} iptal gerekçesi:${warning}`);
    if (!revokeReason || revokeReason.trim().length < 3) return;
    await call("DELETE", `/api/panel/users/${userId}/staff-roles`, { assignmentId: row.id, reason: revokeReason }, "Sorumluluk iptal edildi.");
  }

  async function saveCapacity(event: React.FormEvent) {
    event.preventDefault();
    const value = capacity.trim() === "" ? null : Number(capacity);
    if (value !== null && (!Number.isInteger(value) || value < 1)) return setMessage({ text: "Kapasite pozitif bir tam sayı olmalı.", error: true });
    await call("PATCH", `/api/panel/users/${userId}/coach-profile`, { coachCapacity: value }, "Koç kapasitesi kaydedildi.");
  }

  return (
    <section className="panel-surface mt-5 p-5">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-(--site-ink)">
        <BadgeCheck size={16} aria-hidden="true" /> Ürün sorumlulukları
      </h2>
      <p className="mt-1 text-xs leading-5 text-(--site-muted)">
        Platform rolü (Öğretmen) değişmez. Hangi üründe hangi işi yapacağı buradan verilir; her değişiklik gerekçe ve
        kimlik doğrulaması ister ve geçmişte kalır.
      </p>

      {mfaPending ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-(--pd-pastel-yellow-soft) p-3 text-xs font-bold text-(--pd-pastel-yellow-ink)">
          <ShieldAlert size={14} aria-hidden="true" /> MFA kurulumu bekleniyor: bu personel bir sonraki girişte ikinci faktör kuracak.
        </p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-2" aria-label="Aktif sorumluluklar">
        {active.length === 0 ? <li className="text-xs text-(--site-muted)">Aktif ürün sorumluluğu yok.</li> : null}
        {active.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(--site-line) bg-white px-3 py-2 text-xs">
            <span>
              <strong>{PRODUCT_LABEL[row.productCode] ?? row.productCode}</strong> · {ROLE_LABEL[row.role] ?? row.role}
              <span className="ml-2 text-(--site-muted)">
                {DATE.format(new Date(row.grantedAt))}
                {row.grantedBy ? ` · ${row.grantedBy}` : row.source === "LEGACY_BACKFILL" ? " · geçiş" : ""}
              </span>
            </span>
            <button type="button" disabled={busy} onClick={() => void revoke(row)} className="panel-secondary-button">
              İptal et
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={grant} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-bold">
          Sorumluluk
          <select value={choice} onChange={(event) => setChoice(event.target.value)} className="rounded-xl border border-(--site-line) bg-white px-3 py-2">
            {OPTIONS.map((option) => (
              <option key={`${option.product}:${option.role}`} value={`${option.product}:${option.role}`}>
                {PRODUCT_LABEL[option.product]} · {ROLE_LABEL[option.role]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-bold">
          Gerekçe
          <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className="rounded-xl border border-(--site-line) bg-white px-3 py-2" />
        </label>
        <button type="submit" disabled={busy} className="panel-primary-button">
          Ver
        </button>
      </form>

      {isCoach ? (
        <form onSubmit={saveCapacity} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-bold">
            Koç kapasitesi (öğrenci)
            <input inputMode="numeric" value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="Tanımsız" className="w-32 rounded-xl border border-(--site-line) bg-white px-3 py-2" />
          </label>
          <button type="submit" disabled={busy} className="panel-secondary-button">
            Kaydet
          </button>
        </form>
      ) : null}

      {message ? (
        <p role={message.error ? "alert" : "status"} className="mt-3 text-xs font-bold">
          {message.text}{" "}
          {message.stepUp ? (
            <Link href="/panel/guvenlik" className="panel-text-link">
              Kimliği doğrula
            </Link>
          ) : null}
        </p>
      ) : null}

      {past.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-bold">Geçmiş ({past.length})</summary>
          <ul className="mt-2 flex flex-col gap-1.5 text-xs text-(--site-muted)">
            {past.map((row) => (
              <li key={row.id}>
                {PRODUCT_LABEL[row.productCode] ?? row.productCode} · {ROLE_LABEL[row.role] ?? row.role}: {DATE.format(new Date(row.grantedAt))}
                {row.grantedBy ? ` (${row.grantedBy})` : ""} → {row.revokedAt ? DATE.format(new Date(row.revokedAt)) : ""}
                {row.revokedBy ? ` (${row.revokedBy})` : ""}
                {row.revokeReason ? ` · ${row.revokeReason}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
