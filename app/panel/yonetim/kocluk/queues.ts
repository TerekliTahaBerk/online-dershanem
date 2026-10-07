/** Koçluk operasyonu kuyrukları (`?kuyruk=`), docs/panel-design-roadmap.md §10.8. */
export const COACHING_QUEUES = ["koc-bekleyen", "geciken", "plansiz", "hedefsiz", "kapasite", "sinyaller"] as const;
export type CoachingQueue = (typeof COACHING_QUEUES)[number];
