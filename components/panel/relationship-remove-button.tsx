"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unlink } from "lucide-react";

export function RelationshipRemoveButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("Bu veli–öğrenci bağlantısı kaldırılsın mı? İşlem geçmişte saklanır.")) return;
        setBusy(true);
        const response = await fetch(`/api/panel/relationships/${id}`, { method: "DELETE" });
        if (response.ok) router.refresh();
        else setBusy(false);
      }}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
    >
      <Unlink size={12} />
      {busy ? "Kaldırılıyor" : "Bağlantıyı kaldır"}
    </button>
  );
}
