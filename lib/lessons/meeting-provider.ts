/**
 * Sprint 6 — Meeting provider abstraction.
 *
 * Şimdilik yalnız `ManualMeetingProvider` var: öğretmenin admin formundan
 * girdiği `googleMeetLink` veya yeni `meetingJoinUrl` alanını döndürür.
 *
 * Gelecek sprintte `GoogleMeetingProvider` (Calendar/Meet API) eklenebilir;
 * `meetingProvider="GOOGLE"` olan derslerde otomatik join URL üretimi.
 *
 * KURAL: provider asla DB yazmaz. Sadece "bu ders için join URL nedir?" sorusunu
 * yanıtlar. Yazma sorumluluğu çağıran action/route'tadır.
 */

export type MeetingProviderKind = "MANUAL" | "GOOGLE";

export type MeetingLink = {
  provider: MeetingProviderKind;
  /** Katılımcılar için URL. */
  joinUrl: string | null;
  /** Öğretmen/host için URL (Manual'de joinUrl ile aynıdır). */
  hostUrl: string | null;
  /** Sağlayıcı tarafı kimliği (Google Meet için "abc-defg-hij"). */
  roomId: string | null;
};

export type LessonForMeeting = {
  id: string;
  meetingProvider: string | null;
  meetingRoomId: string | null;
  meetingJoinUrl: string | null;
  meetingHostUrl: string | null;
  /** Legacy alan — yeni alanlar boşsa fallback. */
  googleMeetLink: string | null;
};

export interface MeetingProvider {
  readonly kind: MeetingProviderKind;
  /** Mevcut ders için join link döndürür (provision YAPMAZ). */
  resolve(lesson: LessonForMeeting): MeetingLink;
}

export const ManualMeetingProvider: MeetingProvider = {
  kind: "MANUAL",
  resolve(lesson) {
    const joinUrl = lesson.meetingJoinUrl?.trim() || lesson.googleMeetLink?.trim() || null;
    const hostUrl = lesson.meetingHostUrl?.trim() || joinUrl;
    return {
      provider: "MANUAL",
      joinUrl,
      hostUrl,
      roomId: lesson.meetingRoomId?.trim() || null,
    };
  },
};

/** Provider seçici. Bilinmeyen değer → MANUAL fallback. */
export function getMeetingProvider(kind: string | null | undefined): MeetingProvider {
  switch ((kind ?? "MANUAL").toUpperCase()) {
    case "GOOGLE":
      // Henüz uygulanmadı; sessizce manual'e düş.
      return ManualMeetingProvider;
    case "MANUAL":
    default:
      return ManualMeetingProvider;
  }
}

/** Ders için join link çöz. Provider seçimini de yapar. */
export function resolveMeetingLink(lesson: LessonForMeeting): MeetingLink {
  return getMeetingProvider(lesson.meetingProvider).resolve(lesson);
}

/**
 * Bir URL'nin "geçerli" sayılması için minimum kontrol. Production'da gerçek
 * URL parsing + protocol whitelist (https:) zorunlu.
 */
export function isValidMeetingUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
