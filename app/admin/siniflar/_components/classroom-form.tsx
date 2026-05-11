"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ClassroomFormState } from "../actions";

type Defaults = {
  name?: string;
  branch?: string | null;
  level?: string;
  capacity?: number;
  description?: string | null;
  isActive?: boolean;
};

export function ClassroomForm({
  action,
  mode,
  defaults,
}: {
  action: (prev: ClassroomFormState, fd: FormData) => Promise<ClassroomFormState>;
  mode: "create" | "edit";
  defaults?: Defaults;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ClassroomFormState, FormData>(action, null);

  useEffect(() => {
    if (state && state.ok && mode === "create") {
      router.push(`/admin/siniflar/${state.id}`);
    }
  }, [state, mode, router]);

  return (
    <form action={formAction} className="pd-card" style={{ padding: 20, display: "grid", gap: 14, maxWidth: 720 }}>
      <label className="pd-field">
        <span className="pd-field-label">Sınıf adı *</span>
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={defaults?.name ?? ""}
          className="pd-input"
          placeholder="Örn: 12-A"
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label className="pd-field">
          <span className="pd-field-label">Şube</span>
          <input
            name="branch"
            maxLength={80}
            defaultValue={defaults?.branch ?? ""}
            className="pd-input"
            placeholder="Örn: Online / Kadıköy"
          />
        </label>

        <label className="pd-field">
          <span className="pd-field-label">Seviye</span>
          <select name="level" defaultValue={defaults?.level ?? "MIXED"} className="pd-input">
            <option value="LGS">LGS</option>
            <option value="TYT">TYT</option>
            <option value="AYT">AYT</option>
            <option value="YDT">YDT (Dil)</option>
            <option value="MIXED">Karma</option>
          </select>
        </label>
      </div>

      <label className="pd-field">
        <span className="pd-field-label">Kapasite</span>
        <input
          type="number"
          name="capacity"
          min={1}
          max={500}
          defaultValue={defaults?.capacity ?? 30}
          className="pd-input"
        />
      </label>

      <label className="pd-field">
        <span className="pd-field-label">Açıklama</span>
        <textarea
          name="description"
          maxLength={2000}
          rows={3}
          defaultValue={defaults?.description ?? ""}
          className="pd-input"
        />
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults?.isActive ?? true}
        />
        <span>Aktif</span>
      </label>

      {state && !state.ok && (
        <div style={{ color: "#ef4444", fontSize: 13 }}>{state.error}</div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="submit" disabled={pending} className="pd-btn-accent">
          {pending ? "Kaydediliyor..." : mode === "create" ? "Oluştur" : "Güncelle"}
        </button>
      </div>
    </form>
  );
}
