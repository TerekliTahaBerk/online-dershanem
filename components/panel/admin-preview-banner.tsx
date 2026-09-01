"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { previewBannerCopy, previewNoticeMessage, type PreviewableRole, type PreviewSubjectNotice } from "@/lib/panel/preview-context";

export function AdminPreviewBanner({
  previewRole,
  subjectName,
  notices,
}: {
  previewRole: PreviewableRole;
  subjectName: string;
  notices: PreviewSubjectNotice[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const copy = previewBannerCopy({ role: previewRole, subjectName });

  function exitPreview() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/panel/admin-preview", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as { returnPath?: string; error?: string } | null;
      if (!response.ok) {
        setError(body?.error || "Önizlemeden çıkılamadı.");
        return;
      }
      router.replace(body?.returnPath || "/panel/yonetim");
      router.refresh();
    });
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] border-b border-amber-300/80 bg-amber-50 px-4 py-2.5 text-amber-950 sm:px-7"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-amber-800">{copy.title}</p>
          <p className="mt-0.5 text-[13.5px] font-semibold leading-5 text-amber-950">{copy.body}</p>
          {notices.length ? (
            <ul className="mt-1 space-y-0.5 text-[12px] text-amber-900/90">
              {notices.map((notice) => (
                <li key={notice}>{previewNoticeMessage(notice)}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-1 text-[12px] text-amber-900/80">Yönetici önizlemesinde işlem yapılamaz.</p>
          {error ? <p className="mt-1 text-[12px] font-semibold text-red-700">{error}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/panel/yonetim?onizleme=1"
            className="rounded-[10px] border border-amber-400 bg-white px-3 py-2 text-[12px] font-bold text-amber-950 transition-colors hover:border-amber-600"
          >
            {copy.switchLabel}
          </a>
          <button
            type="button"
            onClick={exitPreview}
            disabled={pending}
            className="rounded-[10px] bg-amber-900 px-3 py-2 text-[12px] font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Çıkılıyor…" : "Önizlemeden Çık"}
          </button>
        </div>
      </div>
    </div>
  );
}
