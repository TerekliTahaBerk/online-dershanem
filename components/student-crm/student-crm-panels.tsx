"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Lock, Star } from "lucide-react";

type Note = {
  id: string;
  content: string;
  isPrivate: boolean;
  createdAt: Date;
  author: { id: string; name: string | null; email: string | null } | null;
};

export function StudentNotesPanel({
  studentId,
  notes,
  canMarkPrivate,
  onAdd,
  onDelete,
}: {
  studentId: string;
  notes: Note[];
  canMarkPrivate: boolean;
  onAdd: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [pending, start] = useTransition();

  const submit = () => {
    if (!content.trim()) return;
    const fd = new FormData();
    fd.append("studentId", studentId);
    fd.append("content", content);
    if (isPrivate) fd.append("isPrivate", "on");
    start(async () => {
      await onAdd(fd);
      setContent("");
      setIsPrivate(false);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    const fd = new FormData();
    fd.append("id", id);
    start(async () => { await onDelete(fd); router.refresh(); });
  };

  return (
    <div>
      <div className="pd-card" style={{ padding: 12, marginBottom: 12, display: "grid", gap: 8 }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Yeni not ekle…"
          className="pd-input"
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {canMarkPrivate && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              <Lock size={12} /> Sadece admin görsün
            </label>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={submit} disabled={pending || !content.trim()} className="pd-btn-accent">
            Not ekle
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)", textAlign: "center" }}>
          Henüz not yok.
        </div>
      ) : (
        <div className="pd-card" style={{ padding: 0 }}>
          {notes.map((n) => (
            <div key={n.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--pd-border)" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>{n.author?.name ?? n.author?.email ?? "—"}</strong>
                {n.isPrivate && (
                  <span className="pd-chip" style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b" }}>
                    <Lock size={10} /> Özel
                  </span>
                )}
                <span style={{ fontSize: 11, color: "var(--pd-muted-2)" }}>
                  {new Date(n.createdAt).toLocaleString("tr-TR")}
                </span>
                <span style={{ flex: 1 }} />
                <button type="button" onClick={() => remove(n.id)} className="pd-btn-ghost" style={{ color: "#ef4444" }} title="Sil">
                  <Trash2 size={12} />
                </button>
              </div>
              <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{n.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Comment = {
  id: string;
  content: string;
  rating: number | null;
  visibleToParent: boolean;
  createdAt: Date;
  teacher: { id: string; user: { name: string | null } } | null;
};

export function StudentCommentsPanel({
  studentId,
  comments,
  onAdd,
  onDelete,
}: {
  studentId: string;
  comments: Comment[];
  onAdd: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [vis, setVis] = useState(true);
  const [pending, start] = useTransition();

  const submit = () => {
    if (!content.trim()) return;
    const fd = new FormData();
    fd.append("studentId", studentId);
    fd.append("content", content);
    if (rating !== "") fd.append("rating", String(rating));
    if (vis) fd.append("visibleToParent", "on");
    start(async () => {
      await onAdd(fd);
      setContent(""); setRating(""); setVis(true);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    const fd = new FormData();
    fd.append("id", id);
    start(async () => { await onDelete(fd); router.refresh(); });
  };

  return (
    <div>
      <div className="pd-card" style={{ padding: 12, marginBottom: 12, display: "grid", gap: 8 }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Öğrenci hakkında değerlendirme…"
          className="pd-input"
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <Star size={12} /> Puan (1-10):
            <input
              type="number" min={1} max={10}
              value={rating}
              onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))}
              className="pd-input"
              style={{ width: 60 }}
            />
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <input type="checkbox" checked={vis} onChange={(e) => setVis(e.target.checked)} />
            Veliye göster
          </label>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={submit} disabled={pending || !content.trim()} className="pd-btn-accent">
            Yorum ekle
          </button>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)", textAlign: "center" }}>
          Henüz yorum yok.
        </div>
      ) : (
        <div className="pd-card" style={{ padding: 0 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--pd-border)" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>{c.teacher?.user?.name ?? "—"}</strong>
                {c.rating !== null && (
                  <span className="pd-chip" style={{ fontSize: 11, background: "#fef3c7" }}>
                    <Star size={10} /> {c.rating}/10
                  </span>
                )}
                {!c.visibleToParent && (
                  <span className="pd-chip" style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b" }}>
                    Veliye gizli
                  </span>
                )}
                <span style={{ fontSize: 11, color: "var(--pd-muted-2)" }}>
                  {new Date(c.createdAt).toLocaleString("tr-TR")}
                </span>
                <span style={{ flex: 1 }} />
                <button type="button" onClick={() => remove(c.id)} className="pd-btn-ghost" style={{ color: "#ef4444" }}>
                  <Trash2 size={12} />
                </button>
              </div>
              <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{c.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type FileItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  byteSize: number;
  mimeType: string | null;
  description: string | null;
  createdAt: Date;
  uploadedBy: { name: string | null; email: string | null } | null;
};

export function StudentFilesPanel({
  studentId,
  files,
  onAdd,
  onDelete,
}: {
  studentId: string;
  files: FileItem[];
  onAdd: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const submitForm = (fd: FormData) => {
    fd.append("studentId", studentId);
    start(async () => { await onAdd(fd); router.refresh(); });
  };

  const remove = (id: string) => {
    const fd = new FormData();
    fd.append("id", id);
    start(async () => { await onDelete(fd); router.refresh(); });
  };

  return (
    <div>
      <form
        action={submitForm}
        className="pd-card"
        style={{ padding: 12, marginBottom: 12, display: "grid", gap: 8 }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <input name="fileName" required placeholder="Dosya adı" className="pd-input" />
          <input name="fileUrl" type="url" required placeholder="https://… (Vercel Blob / Drive)" className="pd-input" />
        </div>
        <input name="description" placeholder="Açıklama (opsiyonel)" className="pd-input" />
        <div style={{ display: "flex", gap: 8 }}>
          <input name="mimeType" placeholder="Mime (application/pdf)" className="pd-input" style={{ flex: 1 }} />
          <input name="byteSize" type="number" min={0} placeholder="Boyut (bytes)" className="pd-input" style={{ width: 160 }} />
          <button type="submit" disabled={pending} className="pd-btn-accent">Ekle</button>
        </div>
      </form>

      {files.length === 0 ? (
        <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)", textAlign: "center" }}>
          Henüz dosya yok.
        </div>
      ) : (
        <div className="pd-card" style={{ padding: 0 }}>
          {files.map((f) => (
            <div key={f.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--pd-border)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="pd-link" style={{ fontSize: 13, fontWeight: 500 }}>
                  {f.fileName}
                </a>
                {f.description && (
                  <div style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>{f.description}</div>
                )}
                <div style={{ fontSize: 11, color: "var(--pd-muted-2)" }}>
                  {f.uploadedBy?.name ?? "—"} · {new Date(f.createdAt).toLocaleDateString("tr-TR")}
                  {f.byteSize > 0 && ` · ${(f.byteSize / 1024).toFixed(1)} KB`}
                </div>
              </div>
              <button type="button" onClick={() => remove(f.id)} className="pd-btn-ghost" style={{ color: "#ef4444" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
