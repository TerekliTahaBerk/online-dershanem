"use client";

/**
 * Phase 3 / Session 6 — Tiny client wrappers for the enrollment detail
 * lifecycle buttons. Each wraps a server action with a confirm() dialog
 * for the destructive transitions.
 */

import { useTransition } from "react";
import {
  pauseEnrollmentAction,
  resumeEnrollmentAction,
  completeEnrollmentAction,
  cancelEnrollmentAction,
} from "@/app/panel/admin/kayitlar/_actions";

type Kind = "pause" | "resume" | "complete" | "cancel" | "reactivate";

const LABELS: Record<Kind, { label: string; confirm?: string; tone: "ghost" | "dark" | "danger" }> = {
  pause: { label: "Duraklat", confirm: "Bu kaydı duraklatmak istediğinize emin misiniz?", tone: "ghost" },
  resume: { label: "Devam ettir", tone: "dark" },
  complete: {
    label: "Tamamla",
    confirm: "Kaydı tamamlandı olarak işaretlemek istediğinize emin misiniz? Bu işlem ödeme planını değiştirmez.",
    tone: "ghost",
  },
  cancel: {
    label: "İptal et",
    confirm:
      "Kaydı iptal etmek istediğinize emin misiniz? Mevcut ödeme planı satırları olduğu gibi kalır; gerekirse Vadeler sayfasından ayrıca iptal edebilirsiniz.",
    tone: "danger",
  },
  reactivate: {
    label: "Yeniden aktif et",
    confirm: "Tamamlanan/iptal edilen kaydı yeniden aktif yapmak istiyor musunuz?",
    tone: "dark",
  },
};

export function EnrollmentTransitionButton({
  enrollmentId,
  kind,
}: {
  enrollmentId: string;
  kind: Kind;
}) {
  const [pending, start] = useTransition();
  const meta = LABELS[kind];
  return (
    <button
      type="button"
      className={`od-btn ${meta.tone === "danger" ? "ghost" : meta.tone} sm`}
      disabled={pending}
      onClick={() => {
        if (meta.confirm && !window.confirm(meta.confirm)) return;
        start(async () => {
          if (kind === "pause") await pauseEnrollmentAction(enrollmentId);
          else if (kind === "resume" || kind === "reactivate")
            await resumeEnrollmentAction(enrollmentId);
          else if (kind === "complete") await completeEnrollmentAction(enrollmentId);
          else if (kind === "cancel") await cancelEnrollmentAction(enrollmentId);
        });
      }}
      style={meta.tone === "danger" ? { color: "var(--pd-danger)" } : undefined}
    >
      {pending ? "…" : meta.label}
    </button>
  );
}
