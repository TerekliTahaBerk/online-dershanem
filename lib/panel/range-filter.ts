/** `?range=…` değerini Prisma tarih filtresine çevirir. */
export function rangeToWhere(range?: string | null): { gte?: Date } {
  if (!range) return {};
  const now = Date.now();
  switch (range) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return { gte: d };
    }
    case "7d":
      return { gte: new Date(now - 7 * 86400000) };
    case "30d":
      return { gte: new Date(now - 30 * 86400000) };
    case "month": {
      const d = new Date();
      return { gte: new Date(d.getFullYear(), d.getMonth(), 1) };
    }
    default:
      return {};
  }
}
