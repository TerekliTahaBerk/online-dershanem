import "server-only";
import { isOnline } from "@/lib/presence";

/**
 * Sunucu tarafı presence noktası — anlık snapshot.
 * Liste sayfalarında SSR sırasında render edilir; sayfa yenilenmeden
 * canlı kalmasını istiyorsan client `<LivePresenceDot>` kullan.
 */
export function PresenceDot({
  userId,
  size = "sm",
  showLabel = false,
}: {
  userId: string | null | undefined;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}) {
  const online = userId ? isOnline(userId) : false;
  const dim = size === "xs" ? "h-1.5 w-1.5" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  const ring =
    size === "xs"
      ? "ring-1 ring-od-bg"
      : size === "md"
        ? "ring-2 ring-od-bg"
        : "ring-2 ring-od-bg";
  const color = online
    ? "bg-pastel-mint-ink"
    : "bg-od-mute-2/40";
  const label = online ? "Çevrimiçi" : "Çevrimdışı";

  if (showLabel) {
    return (
      <span className="inline-flex items-center gap-1.5 text-od-tiny text-od-mute">
        <span
          className={`${dim} rounded-full ${color} ${ring}`}
          aria-hidden
          title={label}
        />
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
