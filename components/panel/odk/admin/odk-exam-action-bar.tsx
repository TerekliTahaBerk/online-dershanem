"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  getOdkExamStatusLabel,
  type OdkExamReadiness,
} from "@/lib/panel/odk-admin-display";
import type { OdkExamStatus } from "@prisma/client";

/**
 * Phase 2 / Session 15 — admin-only lifecycle actions for an ODK exam.
 *
 * Wraps the existing endpoints (NOT new ones for publish/unpublish):
 *   POST   /api/v1/odk/admin/exams/[id]/publish    → DRAFT → PUBLISHED
 *   DELETE /api/v1/odk/admin/exams/[id]/publish    → PUBLISHED → DRAFT
 *   POST   /api/v1/odk/admin/exams/[id]/archive    → any → ARCHIVED   (NEW)
 *   DELETE /api/v1/odk/admin/exams/[id]/archive    → ARCHIVED → DRAFT (NEW)
 *
 * Disabled-state matrix:
 *   - Publish:   shown only when status=DRAFT; disabled if !readiness.publishAllowed
 *   - Unpublish: shown only when status=PUBLISHED
 *   - Archive:   always shown; disabled when status=ARCHIVED
 *   - Unarchive: shown only when status=ARCHIVED
 *
 * Confirmations are intentional but light. The publish gate runs server-side
 * regardless — UI disablement is a courtesy, not a security boundary.
 */
export function OdkExamActionBar({
  examId,
  status,
  readiness,
}: {
  examId: string;
  status: OdkExamStatus;
  readiness: OdkExamReadiness;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(
    label: string,
    method: "POST" | "DELETE",
    path: string,
    confirmMsg?: string,
  ) {
    if (confirmMsg && typeof window !== "undefined" && !window.confirm(confirmMsg)) {
      return;
    }
    setError(null);
    setBusy(label);
    try {
      const res = await fetch(path, { method });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; issues?: string[] }
        | null;
      if (!res.ok || (json && json.ok === false)) {
        const issues = json?.issues?.join(" · ");
        setError(json?.error ?? `İşlem başarısız (${res.status})${issues ? ` — ${issues}` : ""}`);
        return;
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Beklenmeyen hata.");
    } finally {
      setBusy(null);
    }
  }

  const disabled = isPending || busy !== null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "stretch",
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="od-muted" style={{ fontSize: 12 }}>
          Mevcut durum: <strong>{getOdkExamStatusLabel(status)}</strong>
        </span>

        {status === "DRAFT" ? (
          <button
            type="button"
            className="od-btn od-btn-primary"
            disabled={disabled || !readiness.publishAllowed}
            title={
              readiness.publishAllowed
                ? "Denemeyi yayına al"
                : "Önce yayın hazırlığı eksiklerini tamamlayın"
            }
            onClick={() =>
              call(
                "publish",
                "POST",
                `/api/v1/odk/admin/exams/${examId}/publish`,
                "Bu denemeyi yayına almak istediğinize emin misiniz? Öğrenciler erişebilir olacak.",
              )
            }
          >
            {busy === "publish" ? "Yayına alınıyor…" : "Yayına al"}
          </button>
        ) : null}

        {status === "PUBLISHED" ? (
          <button
            type="button"
            className="od-btn od-btn-ghost"
            disabled={disabled}
            onClick={() =>
              call(
                "unpublish",
                "DELETE",
                `/api/v1/odk/admin/exams/${examId}/publish`,
                "Yayından kaldırmak istediğinize emin misiniz? Mevcut çözümler silinmez.",
              )
            }
          >
            {busy === "unpublish" ? "Kaldırılıyor…" : "Yayından kaldır"}
          </button>
        ) : null}

        {status !== "ARCHIVED" ? (
          <button
            type="button"
            className="od-btn od-btn-ghost"
            disabled={disabled}
            onClick={() =>
              call(
                "archive",
                "POST",
                `/api/v1/odk/admin/exams/${examId}/archive`,
                "Bu denemeyi arşivlemek istediğinize emin misiniz? Öğrenciler artık göremez ama mevcut çözümler korunur.",
              )
            }
          >
            {busy === "archive" ? "Arşivleniyor…" : "Arşivle"}
          </button>
        ) : null}

        {status === "ARCHIVED" ? (
          <button
            type="button"
            className="od-btn od-btn-ghost"
            disabled={disabled}
            onClick={() =>
              call(
                "unarchive",
                "DELETE",
                `/api/v1/odk/admin/exams/${examId}/archive`,
                "Arşivden çıkarılsın mı? Deneme taslak (DRAFT) durumuna dönecek.",
              )
            }
          >
            {busy === "unarchive" ? "Geri alınıyor…" : "Arşivden çıkar"}
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
