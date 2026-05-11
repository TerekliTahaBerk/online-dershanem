import "server-only";
import { prisma } from "@/lib/prisma";
import type { SavedViewItem } from "@/components/od/data/saved-views-menu";

/**
 * Bir kullanıcı için belirli scope'taki saved view'ları getirir.
 * - Kullanıcının kendi view'ları
 * - Diğer kullanıcıların `isShared = true` olan view'ları
 *
 * `currentUserId` yoksa boş array döner (login değil).
 */
export async function loadSavedViews(
  scope: string,
  currentUserId: string | undefined,
): Promise<SavedViewItem[]> {
  if (!currentUserId) return [];
  const rows = await prisma.savedView.findMany({
    where: {
      scope,
      OR: [{ ownerId: currentUserId }, { isShared: true }],
    },
    orderBy: [{ isShared: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      scope: true,
      filter: true,
      isShared: true,
      ownerId: true,
    },
  });
  return rows.map((v) => ({
    id: v.id,
    name: v.name,
    scope: v.scope,
    isShared: v.isShared,
    ownerId: v.ownerId,
    filter: (v.filter as Record<string, string | string[]>) ?? {},
  }));
}
