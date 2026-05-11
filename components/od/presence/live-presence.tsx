"use client";

import * as React from "react";

type PresenceMap = Record<string, boolean>;

const PresenceContext = React.createContext<{
  map: PresenceMap;
  count: number;
}>({ map: {}, count: 0 });

/**
 * Provider — verilen userIds için 30 saniyede bir presence haritasını fetch eder.
 * Liste sayfalarında DataTable üstünde sarmalayın.
 */
export function PresenceProvider({
  userIds,
  children,
  intervalMs = 30_000,
}: {
  userIds: string[];
  children: React.ReactNode;
  intervalMs?: number;
}) {
  const [map, setMap] = React.useState<PresenceMap>({});
  const [count, setCount] = React.useState(0);

  // userIds string'leştir — referans değişimine karşı stabil
  const idsKey = React.useMemo(() => userIds.join(","), [userIds]);

  React.useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const r = await fetch(`/api/v1/presence?userIds=${encodeURIComponent(idsKey)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!r.ok) return;
        const data = (await r.json()) as { online: PresenceMap; count: number };
        if (!cancelled) {
          setMap(data.online ?? {});
          setCount(data.count ?? 0);
        }
      } catch {
        /* swallow */
      }
    };
    fetchOnce();
    const t = setInterval(fetchOnce, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [idsKey, intervalMs]);

  return (
    <PresenceContext.Provider value={{ map, count }}>
      {children}
    </PresenceContext.Provider>
  );
}

/** Bir kullanıcının canlı online durumu */
export function useUserOnline(userId: string | null | undefined): boolean {
  const { map } = React.useContext(PresenceContext);
  if (!userId) return false;
  return map[userId] === true;
}

/** Toplam online sayısı */
export function useOnlineCount(): number {
  return React.useContext(PresenceContext).count;
}

/** Live presence dot — context'e bağlı, fetch periyoduyla güncellenir */
export function LivePresenceDot({
  userId,
  size = "sm",
  showLabel = false,
}: {
  userId: string | null | undefined;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}) {
  const online = useUserOnline(userId ?? undefined);
  const dim = size === "xs" ? "h-1.5 w-1.5" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  const ring = "ring-2 ring-od-bg";
  const color = online ? "bg-pastel-mint-ink" : "bg-od-mute-2/40";
  const label = online ? "Çevrimiçi" : "Çevrimdışı";

  if (showLabel) {
    return (
      <span className="inline-flex items-center gap-1.5 text-od-tiny text-od-mute">
        <span className={`${dim} rounded-full ${color} ${ring}`} aria-hidden title={label} />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-block ${dim} rounded-full ${color} ${ring}`}
      aria-label={label}
      title={label}
    />
  );
}
