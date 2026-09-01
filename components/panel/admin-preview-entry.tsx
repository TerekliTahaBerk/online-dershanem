"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminPreviewPicker } from "@/components/panel/admin-preview-picker";

/** Admin ana sayfa: ?onizleme=1 ile seçiciyi topbar düğmesi olmadan açar. */
export function AdminPreviewEntry({ returnPath }: { returnPath?: string }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("onizleme") === "1") setOpen(true);
  }, [searchParams]);

  if (!open) return null;

  return (
    <AdminPreviewPicker
      hideTrigger
      open={open}
      onOpenChange={setOpen}
      returnPath={returnPath}
    />
  );
}
