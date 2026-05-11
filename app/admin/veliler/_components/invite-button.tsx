"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { inviteParent } from "../actions";

export function InviteButton({ parentId, hasUser, hasEmail }: { parentId: string; hasUser: boolean; hasEmail: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string; password?: string } | null>(null);

  const click = () => {
    setResult(null);
    const fd = new FormData();
    fd.append("parentId", parentId);
    start(async () => {
      const r = await inviteParent(fd);
      setResult(r);
      router.refresh();
    });
  };

  if (!hasEmail) return <span style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>E-posta yok — davet gönderilemiyor.</span>;

  return (
    <div>
      <button type="button" onClick={click} disabled={pending} className="pd-btn-accent">
        <Send size={13} /> {hasUser ? "Davet'i tekrar gönder" : "Veliyi davet et"}
      </button>
      {result?.ok && result.password && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#10b981" }}>
          Davet gönderildi. Geçici şifre: <code>{result.password}</code>
        </div>
      )}
      {result?.ok && !result.password && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#10b981" }}>
          Davet işlendi (kullanıcı zaten mevcut).
        </div>
      )}
      {result && !result.ok && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#ef4444" }}>{result.error}</div>
      )}
    </div>
  );
}
