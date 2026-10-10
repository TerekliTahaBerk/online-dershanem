/**
 * Canlı derse katılım penceresi — TEK KAYNAK.
 *
 * Öğrenci ana sayfasının "Derse Katıl" kuralı (başlangıçtan 30 dk önce açılır,
 * başladıktan 90 dk sonrasına kadar sürer) eskiden `student-home-actions.ts`
 * içinde satır içi hesaplanıyordu. Ders detayı (web ve mobil JSON) aynı kuralı
 * kullansın diye buraya alındı; davranış DEĞİŞMEDİ.
 */

export const LESSON_JOIN_LEAD_MINUTES = 30;
export const LESSON_JOIN_GRACE_MINUTES = 90;

export type LessonJoinWindow = {
  /** Başlangıca kalan dakika (yuvarlanmış; geçmişte negatif). */
  minutesUntilStart: number;
  /** 0–30 dk içinde başlayacak. */
  startsSoon: boolean;
  /** Başladı ve 90 dk'dan az geçti. */
  activeNow: boolean;
  /** Katılım penceresi açık. */
  joinsNow: boolean;
};

export function lessonJoinWindow(startsAt: Date, now: Date): LessonJoinWindow {
  const minutesUntilStart = Math.round((startsAt.getTime() - now.getTime()) / 60000);
  const startsSoon = minutesUntilStart >= 0 && minutesUntilStart <= LESSON_JOIN_LEAD_MINUTES;
  const activeNow = minutesUntilStart < 0 && minutesUntilStart >= -LESSON_JOIN_GRACE_MINUTES;
  return { minutesUntilStart, startsSoon, activeNow, joinsNow: startsSoon || activeNow };
}

export type LessonJoinState = "OPEN" | "NOT_YET" | "ENDED" | "UNAVAILABLE";

/**
 * Ders detayındaki "Derse katıl" durumu. Bağlantı yalnız pencere açıkken ve
 * öğrencinin kaydı AKTİFKEN verilir (takvim dışa aktarımıyla aynı politika:
 * `app/api/panel/calendar/export` iptal edilmemiş derste, aktif kayıtta
 * bağlantıyı paylaşır). Bağlantı http/https dışındaysa hiç verilmez.
 */
export function lessonJoinState(input: {
  status: "PLANNED" | "COMPLETED" | "CANCELLED";
  startsAt: Date;
  meetingUrl: string | null;
  enrollmentActive: boolean;
  now: Date;
}): { state: LessonJoinState; url: string | null; opensAt: Date | null } {
  const safeUrl = input.meetingUrl && /^https?:\/\//i.test(input.meetingUrl) ? input.meetingUrl : null;
  if (input.status === "CANCELLED" || !input.enrollmentActive || !safeUrl) {
    return { state: "UNAVAILABLE", url: null, opensAt: null };
  }
  if (input.status === "COMPLETED") return { state: "ENDED", url: null, opensAt: null };
  const window = lessonJoinWindow(input.startsAt, input.now);
  if (window.joinsNow) return { state: "OPEN", url: safeUrl, opensAt: null };
  if (window.minutesUntilStart > LESSON_JOIN_LEAD_MINUTES) {
    return { state: "NOT_YET", url: null, opensAt: new Date(input.startsAt.getTime() - LESSON_JOIN_LEAD_MINUTES * 60000) };
  }
  return { state: "ENDED", url: null, opensAt: null };
}
