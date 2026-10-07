"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/panel/primitives";

type Visibility = "INTERNAL" | "STUDENT_VISIBLE" | "PARENT_VISIBLE";

const OPTIONS: Array<{ value: Visibility; label: string; hint: string }> = [
  { value: "INTERNAL", label: "İç not", hint: "yalnız koç ve yönetim" },
  { value: "STUDENT_VISIBLE", label: "Öğrenci görebilir", hint: "öğrenci" },
  { value: "PARENT_VISIBLE", label: "Veli görebilir", hint: "öğrenci ve velisi" },
];

/** Görünürlük kuralı `canViewerSeeCoachNote` ile aynıdır: veli notu öğrenciye de görünür. */
export function coachNoteAudience(visibility: Visibility, studentName: string): string {
  if (visibility === "INTERNAL") return "Bu notu yalnız koç ve yönetim görebilir.";
  if (visibility === "STUDENT_VISIBLE") return `Bu notu ${studentName} görebilir; veli göremez.`;
  return `Bu notu ${studentName} ve velisi görebilir.`;
}

/**
 * Koç notu yazma alanı (docs/panel-design-roadmap.md §10.6). Varsayılan
 * görünürlük İÇ NOT'tur (yanlış seçim veri sızıntısı yaratmasın); seçim
 * değiştikçe "kim görecek" satırı güncellenir. Yazma var olan
 * `/api/panel/kocum/notes` ucuyla yapılır; uç atanmış koçu ayrıca doğrular.
 */
export function CoachNoteComposer({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("INTERNAL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (body.trim().length < 2 || busy) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/panel/kocum/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, body: body.trim(), visibility }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const payload = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
      setMessage(payload?.error || "Not kaydedilemedi.");
      return;
    }
    setBody("");
    setVisibility("INTERNAL");
    setMessage("Not kaydedildi.");
    router.refresh();
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="grid gap-1 text-[13px] font-medium text-pn-text">
        Yeni not
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          className="panel-input min-h-24 resize-y"
        />
      </label>
      <fieldset>
        <legend className="text-[13px] font-medium text-pn-text">Kim görebilir?</legend>
        <div className="mt-1.5 inline-flex flex-wrap gap-0.5 rounded-md border border-pn-border bg-pn-surface-subtle p-0.5">
          {OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex min-h-8 cursor-pointer items-center rounded-[5px] px-3 text-[12.5px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pn-accent ${
                visibility === option.value ? "bg-white text-pn-text shadow-sm" : "text-pn-text-secondary"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={visibility === option.value}
                onChange={() => setVisibility(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-[12.5px] text-pn-text-muted" aria-live="polite">
        {coachNoteAudience(visibility, studentName)}
      </p>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || body.trim().length < 2} className={buttonClass("primary", "md")}>
          Notu kaydet
        </button>
        <span role="status" className="text-[13px] text-pn-text-secondary">
          {message}
        </span>
      </div>
    </form>
  );
}
