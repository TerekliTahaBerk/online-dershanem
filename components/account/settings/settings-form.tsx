"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { initialSettingsState, type SettingsActionState } from "@/lib/account/settings-schema";

/**
 * Ayar formu kabuğu: server action + durum mesajı + kaydet düğmesi.
 * Mesaj `aria-live` ile duyurulur; hata ve başarı aynı yerde görünür.
 */
export function SettingsForm({
  action,
  children,
  submitLabel = "Kaydet",
  variant = "primary",
  className = "",
}: {
  action: (state: SettingsActionState, formData: FormData) => Promise<SettingsActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  variant?: "primary" | "danger";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialSettingsState);
  return (
    <form action={formAction} className={`flex flex-col gap-4 ${className}`}>
      <fieldset disabled={pending} className="flex flex-col gap-4">
        {children}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={
            variant === "danger"
              ? "inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-rose-700 disabled:opacity-60"
              : "inline-flex items-center gap-2 rounded-lg bg-dc-brand-strong px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-dc-brand-hover disabled:opacity-60"
          }
        >
          {pending ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {submitLabel}
        </button>
        <p aria-live="polite" role={state.ok ? "status" : state.message ? "alert" : undefined} className={`text-[13px] ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>
          {state.message}
        </p>
      </div>
    </form>
  );
}

export const settingsInputClass =
  "w-full rounded-lg border border-[#DDE4E0] bg-white px-3 py-2.5 text-[14px] text-dc-ink outline-none transition-colors placeholder:text-dc-ink-ghost focus-visible:border-dc-brand-strong focus-visible:ring-2 focus-visible:ring-dc-brand-strong";

export function SettingsField({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12.5px] font-semibold text-dc-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[12px] text-dc-ink-faint">{hint}</p> : null}
    </div>
  );
}
