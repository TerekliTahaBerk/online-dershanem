"use client";
import { useState, useTransition } from "react";
import { submitAssignmentAction } from "@/app/ogretmen/odevler/actions";

export function SubmitForm({
  assignmentId,
  initialContent,
  initialUrl,
}: {
  assignmentId: string;
  initialContent: string | null;
  initialUrl: string | null;
}) {
  const [content, setContent] = useState(initialContent ?? "");
  const [url, setUrl] = useState(initialUrl ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    setMsg(null);
    start(async () => {
      try {
        await submitAssignmentAction({
          assignmentId,
          content: content || null,
          attachmentUrl: url || null,
        });
        setMsg("✓ Teslim edildi");
      } catch (e: any) {
        setMsg(e.message ?? "Hata");
      }
    });
  }

  return (
    <div style={{ marginTop: 8 }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="pd-input"
        placeholder="Cevabınız (opsiyonel)"
        rows={3}
        style={{ width: "100%", fontSize: 13, marginBottom: 6 }}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="pd-input"
        type="url"
        placeholder="Dosya URL (Drive/Dropbox vb.)"
        style={{ width: "100%", fontSize: 12, marginBottom: 6 }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={submit} disabled={pending} className="pd-btn-accent" style={{ fontSize: 12 }}>
          {pending ? "Gönderiliyor…" : "Teslim Et"}
        </button>
        {msg && <span style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>{msg}</span>}
      </div>
    </div>
  );
}
