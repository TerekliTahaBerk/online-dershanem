"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ParentFormState } from "../actions";

type Defaults = {
  fullName?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

export function ParentForm({
  action,
  mode,
  defaults,
}: {
  action: (prev: ParentFormState, fd: FormData) => Promise<ParentFormState>;
  mode: "create" | "edit";
  defaults?: Defaults;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ParentFormState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok && mode === "create") {
      router.push(`/admin/veliler/${state.id}`);
    } else if (state?.ok && mode === "edit") {
      router.refresh();
    }
  }, [state, mode, router]);

  return (
    <form action={formAction} className="pd-card" style={{ padding: 20, display: "grid", gap: 14, maxWidth: 720 }}>
      <label className="pd-field">
        <span className="pd-field-label">Adı Soyadı *</span>
        <input name="fullName" required maxLength={120} defaultValue={defaults?.fullName ?? ""} className="pd-input" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label className="pd-field">
          <span className="pd-field-label">E-posta</span>
          <input type="email" name="email" maxLength={160} defaultValue={defaults?.email ?? ""} className="pd-input" />
        </label>
        <label className="pd-field">
          <span className="pd-field-label">Telefon</span>
          <input name="phone" maxLength={40} defaultValue={defaults?.phone ?? ""} className="pd-input" />
        </label>
      </div>
      <label className="pd-field">
        <span className="pd-field-label">Notlar</span>
        <textarea name="notes" rows={3} maxLength={2000} defaultValue={defaults?.notes ?? ""} className="pd-input" />
      </label>
      {state && !state.ok && <div style={{ color: "#ef4444", fontSize: 13 }}>{state.error}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="submit" disabled={pending} className="pd-btn-accent">
          {pending ? "Kaydediliyor..." : mode === "create" ? "Oluştur" : "Güncelle"}
        </button>
      </div>
    </form>
  );
}
