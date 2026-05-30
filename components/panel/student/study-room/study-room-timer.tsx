"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/panel/ui/badge";
import {
  startStudySessionAction,
  stopStudySessionAction,
} from "@/app/panel/ogrenci/calisma-odasi/_actions";

type CourseOption = { id: string; title: string; subject: string };

type Props = {
  active: {
    id: string;
    startedAt: string; // ISO
    courseTitle: string | null;
    subject: string | null;
    note: string | null;
  } | null;
  courseOptions: CourseOption[];
};

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function StudyRoomTimer({ active, courseOptions }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);

  if (active) {
    const startedMs = new Date(active.startedAt).getTime();
    const elapsed = Math.max(0, Math.floor((now - startedMs) / 1000));
    return (
      <div
        style={{
          padding: 16,
          borderRadius: 12,
          background: "var(--pd-accent-soft, rgba(59,130,246,0.08))",
          border: "1px solid var(--pd-accent, #2563eb)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Badge tone="accent">Aktif oturum</Badge>
          <span className="od-muted" style={{ fontSize: 12 }}>
            Başladı: {new Date(active.startedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div
          className="od-mono"
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "var(--pd-accent, #2563eb)",
            textAlign: "center",
            margin: "8px 0 12px",
            letterSpacing: 1,
          }}
        >
          {fmt(elapsed)}
        </div>
        <div className="od-muted" style={{ fontSize: 12, textAlign: "center", marginBottom: 12 }}>
          {active.courseTitle ?? active.subject ?? "Serbest çalışma"}
        </div>
        <form action={stopStudySessionAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input type="hidden" name="sessionId" value={active.id} />
          <textarea
            name="note"
            rows={2}
            maxLength={500}
            placeholder="Bugün ne çalıştın? (opsiyonel)"
            defaultValue={active.note ?? ""}
            className="od-input"
            style={{ resize: "vertical", minHeight: 56 }}
          />
          <button type="submit" className="od-btn od-btn-primary">
            Oturumu bitir
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: "var(--pd-soft)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
        Çalışmaya başla
      </div>
      <div className="od-muted" style={{ fontSize: 12, marginBottom: 12 }}>
        Hangi derse / konuya odaklanacağını seç. Süre otomatik tutulur.
      </div>
      <form action={startStudySessionAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span className="od-muted">Ders (opsiyonel)</span>
          <select name="courseId" className="od-input" defaultValue="">
            <option value="">— Serbest çalışma —</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} {c.subject ? `· ${c.subject}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span className="od-muted">Konu / başlık (opsiyonel)</span>
          <input
            type="text"
            name="subject"
            maxLength={60}
            placeholder="Örn. Türev — soru çözümü"
            className="od-input"
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span className="od-muted">Not (opsiyonel)</span>
          <textarea
            name="note"
            rows={2}
            maxLength={500}
            placeholder="Hedef veya plan…"
            className="od-input"
            style={{ resize: "vertical", minHeight: 48 }}
          />
        </label>
        <button type="submit" className="od-btn od-btn-primary">
          Çalışmayı başlat
        </button>
      </form>
    </div>
  );
}
