import "server-only";
import { prisma } from "@/lib/prisma";
import { defaultPrefs, type NotificationPrefs } from "./types";

const SCOPE = "user.notification-prefs";
const NAME = "default";

/**
 * Kullanıcının bildirim tercihlerini SavedView üzerinden okur.
 * Kayıt yoksa varsayılan prefs döner.
 */
export async function loadNotificationPrefs(
  userId: string | undefined,
): Promise<NotificationPrefs> {
  if (!userId) return defaultPrefs();
  const row = await prisma.savedView.findFirst({
    where: { ownerId: userId, scope: SCOPE, name: NAME },
    select: { filter: true },
  });
  if (!row) return defaultPrefs();
  // SavedView.filter: Json. Saklanan şekil: { prefs: NotificationPrefs }
  const obj = row.filter as { prefs?: NotificationPrefs } | null;
  if (!obj?.prefs) return defaultPrefs();
  // varsayılan ile merge — yeni tipler eklendiğinde fallback için
  const merged = defaultPrefs();
  for (const t of Object.keys(obj.prefs) as (keyof NotificationPrefs)[]) {
    merged[t] = { ...merged[t], ...obj.prefs[t] };
  }
  return merged;
}

/** Internal helper — notifications.ts kullanır, çoklu kullanıcı için */
export async function loadPrefsMap(
  userIds: string[],
): Promise<Record<string, NotificationPrefs>> {
  if (userIds.length === 0) return {};
  const rows = await prisma.savedView.findMany({
    where: { ownerId: { in: userIds }, scope: SCOPE, name: NAME },
    select: { ownerId: true, filter: true },
  });
  const out: Record<string, NotificationPrefs> = {};
  for (const r of rows) {
    const obj = r.filter as { prefs?: NotificationPrefs } | null;
    if (obj?.prefs) {
      const merged = defaultPrefs();
      for (const t of Object.keys(obj.prefs) as (keyof NotificationPrefs)[]) {
        merged[t] = { ...merged[t], ...obj.prefs[t] };
      }
      out[r.ownerId] = merged;
    }
  }
  // kayıt yoksa default — bunu da out'a basmıyoruz, caller fallback yapsın
  return out;
}

export const NOTIFICATION_PREFS_SCOPE = SCOPE;
export const NOTIFICATION_PREFS_NAME = NAME;
