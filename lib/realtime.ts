import "server-only";
import Pusher from "pusher";
import { prisma } from "@/lib/prisma";
import type { NotificationType, NotificationPriority } from "@prisma/client";

const appId = process.env.PUSHER_APP_ID;
const key = process.env.PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.PUSHER_CLUSTER || "eu";

let _pusher: Pusher | null = null;
function getPusher(): Pusher | null {
  if (!appId || !key || !secret) return null;
  if (!_pusher) {
    _pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
  }
  return _pusher;
}

export const isRealtimeEnabled = () => !!(appId && key && secret);

export type RealtimeEvent =
  | { type: "notification:new"; userId: string; payload: { id: string; title: string; body: string; href?: string | null; priority: NotificationPriority } }
  | { type: "inbox:update"; userId: string; payload: { unread: number } }
  | { type: "presence:ping"; userId: string; payload: Record<string, never> };

/** Channel naming: per-user private channel = `user-<id>` (no auth in this lite version → public-by-name) */
export async function trigger(event: RealtimeEvent): Promise<void> {
  const p = getPusher();
  if (!p) return; // silently no-op if disabled
  try {
    await p.trigger(`user-${event.userId}`, event.type, event.payload);
  } catch (e) {
    console.error("[pusher] trigger failed", e);
  }
}

/** Broadcast an event to a role-based channel like `role-ADMIN`. */
export async function triggerRole(role: string, type: string, payload: unknown): Promise<void> {
  const p = getPusher();
  if (!p) return;
  try {
    await p.trigger(`role-${role}`, type, payload);
  } catch (e) {
    console.error("[pusher] triggerRole failed", e);
  }
}

/** Persist a notification AND emit a realtime event. */
export async function notifyUser(args: {
  userId: string;
  title: string;
  body: string;
  href?: string | null;
  type?: NotificationType;
  priority?: NotificationPriority;
}): Promise<void> {
  const n = await prisma.notification.create({
    data: {
      userId: args.userId,
      title: args.title,
      body: args.body,
      href: args.href ?? null,
      type: args.type ?? "SYSTEM",
      priority: args.priority ?? "NORMAL",
    },
  });
  const unread = await prisma.notification.count({ where: { userId: args.userId, readAt: null } });
  await Promise.all([
    trigger({
      type: "notification:new",
      userId: args.userId,
      payload: { id: n.id, title: n.title, body: n.body, href: n.href, priority: n.priority },
    }),
    trigger({ type: "inbox:update", userId: args.userId, payload: { unread } }),
  ]);
}
