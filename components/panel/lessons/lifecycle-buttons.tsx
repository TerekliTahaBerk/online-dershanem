"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Sprint 6 — Öğretmen için "Başlat / Bitir / İptal" buton paneli.
 * Server action URL'leri yerine doğrudan API endpoint'leri çağırır
 * (revalidatePath action içinden çalışıyor, refresh tetiklenir).
 */
export function LessonLifecycleButtons(props: {
  lessonId: string;
  status: string;
  hostUrl?: string | null;
  joinUrl?: string | null;
  meetingHref?: string;
}) {
  const { lessonId, status, hostUrl, joinUrl, meetingHref } = props;
  const router = useRouter();
  const [pending, start] = useTransition();

  async function call(path: string, body?: Record<string, unknown>) {
    start(async () => {
      try {
        const res = await fetch(`/api/v1/panel/lessons/${lessonId}/${path}`, {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data?.error?.message ?? "Bir hata oluştu.");
          return;
        }
        if (path === "join") {
          const url = data.hostUrl ?? data.joinUrl;
          if (url) window.open(url, "_blank", "noopener");
        }
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Hata");
      }
    });
  }

  const canStart = status === "SCHEDULED";
  const canEnd = status === "LIVE";
  const canCancel = status === "SCHEDULED" || status === "LIVE";
  const liveUrl = hostUrl ?? joinUrl ?? null;
  const isTerminal = status === "ENDED" || status === "COMPLETED" || status === "CANCELLED" || status === "MISSED";

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {canStart && (
        <button
          type="button"
          className="od-btn od-btn-primary"
          onClick={() => call("start")}
          disabled={pending}
          aria-disabled={pending}
          title="Dersi başlat (öğrenciler için 'Katıl' butonu aktifleşir)"
        >
          {pending ? "..." : "Dersi başlat"}
        </button>
      )}
      {canEnd && (
        <>
          {liveUrl && (
            <a className="od-btn" href={liveUrl} target="_blank" rel="noreferrer" title="Yayın penceresini aç">Yayına dön</a>
          )}
          <button
            type="button"
            className="od-btn od-btn-danger"
            onClick={() => call("end")}
            disabled={pending}
            aria-disabled={pending}
            title="Dersi bitir (yoklama otomatik hesaplanır)"
          >
            {pending ? "..." : "Dersi bitir"}
          </button>
        </>
      )}
      {canCancel && (
        <button
          type="button"
          className="od-btn"
          onClick={() => {
            const reason = window.prompt("İptal sebebi (öğrencilere bildirim olarak gider):");
            if (reason == null) return;
            call("cancel", { reason });
          }}
          disabled={pending}
          aria-disabled={pending}
        >
          İptal
        </button>
      )}
      {isTerminal && !meetingHref && (
        <span className="od-muted" style={{ fontSize: 12 }}>İşlem yapılamaz</span>
      )}
      {meetingHref && (
        <a className="od-btn od-btn-ghost" href={meetingHref}>Detay</a>
      )}
    </div>
  );
}

/**
 * Sprint 6 / 6.5 — Öğrenci/veli için akıllı "Katıl" butonu.
 *
 * Görünür durumlar:
 *  - ENDED / COMPLETED  → "Bitti" (muted)
 *  - CANCELLED          → "İptal" (muted)
 *  - MISSED             → "Kaçırıldı" (muted)
 *  - SCHEDULED + uzak   → "Bekleniyor" (muted)
 *  - SCHEDULED + ≤30dk  → "Az sonra başlayacak" (muted) — STARTING_SOON
 *  - LIVE + link var    → "● Canlı — Katıl" (aktif)
 *  - LIVE + link yok    → "Link yok" (muted)
 */
export function StudentJoinButton(props: {
  lessonId: string;
  status: string;
  hasMeetingLink: boolean;
  /** ISO string veya Date. Verilirse STARTING_SOON etiketi hesaplanır. */
  scheduledAt?: string | Date | null;
}) {
  const { lessonId, status, hasMeetingLink, scheduledAt } = props;
  const router = useRouter();
  const [pending, start] = useTransition();

  if (status === "ENDED" || status === "COMPLETED") return <span className="od-muted">Bitti</span>;
  if (status === "CANCELLED") return <span className="od-muted">İptal</span>;
  if (status === "MISSED") return <span className="od-muted">Kaçırıldı</span>;
  if (status === "SCHEDULED") {
    if (scheduledAt) {
      const sched = typeof scheduledAt === "string" ? new Date(scheduledAt) : scheduledAt;
      const diffMs = sched.getTime() - Date.now();
      if (diffMs > 0 && diffMs <= 30 * 60_000) {
        return <span className="od-muted" aria-live="polite">Az sonra başlayacak</span>;
      }
    }
    return <span className="od-muted">Bekleniyor</span>;
  }
  if (!hasMeetingLink) return <span className="od-muted">Link yok</span>;
  // LIVE
  return (
    <button
      type="button"
      className="od-btn od-btn-primary"
      disabled={pending}
      aria-disabled={pending}
      onClick={() => {
        start(async () => {
          try {
            const res = await fetch(`/api/v1/panel/lessons/${lessonId}/join`, {
              method: "POST",
              credentials: "same-origin",
            });
            const data = await res.json();
            if (!res.ok) {
              alert(data?.error?.message ?? "Bağlanılamadı.");
              return;
            }
            if (data.joinUrl) window.open(data.joinUrl, "_blank", "noopener");
            router.refresh();
          } catch (e) {
            alert(e instanceof Error ? e.message : "Hata");
          }
        });
      }}
    >
      {pending ? "..." : "● Canlı — Katıl"}
    </button>
  );
}
