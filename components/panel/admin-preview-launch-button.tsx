"use client";

import { AdminPreviewPicker } from "@/components/panel/admin-preview-picker";
import type { PreviewableRole } from "@/lib/panel/preview-context";

/** Deep-link CTA — Student 360 / kişi detayı. */
export function AdminPreviewLaunchButton({
  previewRole,
  previewUserId,
  label,
  returnPath,
}: {
  previewRole: PreviewableRole;
  previewUserId: string;
  label: string;
  returnPath?: string;
}) {
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const response = await fetch("/api/panel/admin-preview", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previewRole,
            previewUserId,
            returnPath: returnPath || window.location.pathname,
          }),
        });
        const body = (await response.json().catch(() => null)) as { homePath?: string; error?: string } | null;
        if (!response.ok) {
          window.alert(body?.error || "Önizleme başlatılamadı.");
          return;
        }
        window.location.assign(body?.homePath || "/panel");
      }}
    >
      <button
        type="submit"
        className="rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2 text-[12.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
      >
        {label}
      </button>
    </form>
  );
}

export function AdminPreviewPickerTrigger({
  initialRole,
  returnPath,
}: {
  initialRole?: PreviewableRole;
  returnPath?: string;
}) {
  return <AdminPreviewPicker compact initialRole={initialRole} returnPath={returnPath} />;
}
