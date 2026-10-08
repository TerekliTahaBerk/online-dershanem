"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  OD_ONBOARDING_LABELS,
  OD_ONBOARDING_NEXT_ACTION,
  allowedOdOnboardingTransitions,
  type OdOnboardingStateValue,
} from "@/lib/od/onboarding-state";

type StaffOption = { id: string; name: string };

export function OdOnboardingControl({
  orderId,
  state,
  blockedFromState,
  ownerId,
  staff,
}: {
  orderId: string;
  state: OdOnboardingStateValue;
  blockedFromState?: OdOnboardingStateValue | null;
  ownerId?: string | null;
  staff: StaffOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowed = allowedOdOnboardingTransitions(state, blockedFromState);

  if (!allowed.length)
    return (
      <p className="mt-3 text-xs font-bold text-emerald-800">
        Aktivasyon tamamlandı.
      </p>
    );

  return (
    <form
      className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        const form = new FormData(event.currentTarget);
        const toState = String(form.get("toState"));
        try {
          const response = await fetch(
            `/api/panel/orders/${orderId}/onboarding`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                toState,
                ownerId: String(form.get("ownerId") || "") || null,
                blockerReason: String(form.get("blockerReason") || "") || null,
                note: String(form.get("note") || "") || null,
              }),
            },
          );
          const result = await response.json().catch(() => ({}));
          if (!response.ok) setError(result.error || "İşlem kaydedilemedi.");
          else router.refresh();
        } catch {
          setError("İşlem gönderilemedi. Lütfen tekrar deneyin.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="text-[10.5px] font-bold text-(--site-muted)">
        Sıradaki işlem sonucu
        <select
          name="toState"
          required
          defaultValue={allowed[0]}
          className="w-full rounded-md border border-pn-border-strong bg-white px-3 text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1 py-2 text-xs"
        >
          {allowed.map((next) => (
            <option key={next} value={next}>
              {OD_ONBOARDING_LABELS[next]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-[10.5px] font-bold text-(--site-muted)">
        İş sorumlusu
        <select
          name="ownerId"
          required
          defaultValue={ownerId || ""}
          className="w-full rounded-md border border-pn-border-strong bg-white px-3 text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1 py-2 text-xs"
        >
          <option value="">Sorumlu seçin…</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-[10.5px] font-bold text-(--site-muted)">
        Bloker (gerekliyse)
        <input
          name="blockerReason"
          maxLength={500}
          placeholder="Yalnız bloke / manuel inceleme geçişinde zorunlu"
          className="w-full rounded-md border border-pn-border-strong bg-white px-3 text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1 py-2 text-xs"
        />
      </label>
      <label className="text-[10.5px] font-bold text-(--site-muted)">
        Operasyon notu
        <input
          name="note"
          maxLength={500}
          placeholder={OD_ONBOARDING_NEXT_ACTION[state]}
          className="w-full rounded-md border border-pn-border-strong bg-white px-3 text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1 py-2 text-xs"
        />
      </label>
      {error ? (
        <p
          role="alert"
          className="text-xs font-bold text-rose-700 sm:col-span-2 xl:col-span-3"
        >
          {error}
        </p>
      ) : null}
      <button
        disabled={busy}
        className="rounded-xl bg-(--brand-olive) px-3 py-2 text-xs font-bold text-white disabled:opacity-60 sm:col-start-2 xl:col-start-4"
      >
        {busy ? "Kaydediliyor…" : "İşlemi kaydet"}
      </button>
    </form>
  );
}
