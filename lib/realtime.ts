/**
 * In-process pub/sub bus for SSE notification fan-out.
 *
 * NOTE: Single-process only. For multi-instance deployments (e.g. multiple
 * Vercel functions, multiple Node containers) replace with Redis pub/sub or
 * a managed service. The HTTP/SSE contract stays the same.
 *
 * Stored on `globalThis` to survive hot-reload in dev.
 */

export type RealtimeEvent =
  | { kind: "notification"; payload: NotificationEventPayload }
  | { kind: "ping" };

export type NotificationEventPayload = {
  id: string;
  type: string;
  priority: string;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
};

type Subscriber = (e: RealtimeEvent) => void;

type Bus = {
  subs: Map<string, Set<Subscriber>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __OD_REALTIME_BUS__: Bus | undefined;
}

const bus: Bus =
  globalThis.__OD_REALTIME_BUS__ ?? { subs: new Map() };
globalThis.__OD_REALTIME_BUS__ = bus;

export function subscribe(userId: string, send: Subscriber): () => void {
  let set = bus.subs.get(userId);
  if (!set) {
    set = new Set();
    bus.subs.set(userId, set);
  }
  set.add(send);
  return () => {
    const s = bus.subs.get(userId);
    if (!s) return;
    s.delete(send);
    if (s.size === 0) bus.subs.delete(userId);
  };
}

export function publish(userId: string, event: RealtimeEvent): void {
  const set = bus.subs.get(userId);
  if (!set) return;
  for (const send of set) {
    try {
      send(event);
    } catch {
      // ignore broken subscribers — they'll be cleaned up by their own close handler
    }
  }
}

export function publishMany(userIds: string[], event: RealtimeEvent): void {
  for (const id of userIds) publish(id, event);
}

export function subscriberCount(userId: string): number {
  return bus.subs.get(userId)?.size ?? 0;
}
