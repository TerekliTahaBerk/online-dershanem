import { OD_TIME_RANGE_OPTIONS } from "./placement";
import type { OdOnboardingStateValue } from "./onboarding-state";

export const OD_START_STEPS = [
  { title: "24 saat içinde iletişim", body: "Ödeme onayının ardından ekibimiz sizinle iletişime geçer." },
  { title: "48 saat içinde grup sonucu", body: "Grup, alternatif, bekleme listesi veya talep hâlinde iade süreci netleşir." },
  { title: "Ardından ilk ders", body: "Hizmet, grup ve ders saati kesinleştikten sonra fiilen başlar. İlk ders bilgilerini sizinle paylaşırız." },
] as const;

type CustomerCopy = { title: string; nextStep: string; estimate: "contact" | "placement" | "scheduled" | "update" | "complete" };
const COPY: Record<OdOnboardingStateValue, CustomerCopy> = {
  PAID: { title: "Ödemeniz alındı", nextStep: "Ekibimiz başlangıç bilgilerinizi sizinle görüşecek.", estimate: "contact" },
  CONTACT_PENDING: { title: "Başlangıç görüşmeniz hazırlanıyor", nextStep: "Ekibimiz tercih ettiğiniz saatleri görüşmek için sizinle iletişime geçecek.", estimate: "contact" },
  CONTACTED: { title: "Başlangıç bilgilerinizi aldık", nextStep: "Seviyenize ve saat tercihlerinize uygun grubu birlikte belirleyeceğiz.", estimate: "placement" },
  ACCOUNT_READY: { title: "Panel hesabınız hazır", nextStep: "E-postanızdaki bağlantıyla parolanızı belirleyebilirsiniz. Grup bilginizi ekibimiz paylaşacak.", estimate: "placement" },
  PARENT_LINKED: { title: "Öğrenci ve veli paneli hazır", nextStep: "Saat tercihlerinize ve seviyenize uygun grup bilgisini ekibimiz paylaşacak.", estimate: "placement" },
  PLACEMENT_PENDING: { title: "Size uygun grup hazırlanıyor", nextStep: "Grup veya uygun bir alternatif için ekibimiz sizinle iletişime geçecek.", estimate: "placement" },
  ALTERNATE_SLOT_OFFERED: { title: "Alternatif bir saat önerildi", nextStep: "Önerilen saati ekibimizle değerlendirip size uygun olup olmadığını paylaşabilirsiniz.", estimate: "update" },
  ALTERNATE_SLOT_ACCEPTED: { title: "Saat tercihiniz alındı", nextStep: "Ekibimiz kabul ettiğiniz saat için grup ve ilk ders bilgisini paylaşacak.", estimate: "update" },
  WAITLISTED: { title: "Uygun saat için sizi takip ediyoruz", nextStep: "Size uygun bir grup oluştuğunda ekibimiz bilgi verecek; alternatiflerinizi de birlikte değerlendirebiliriz.", estimate: "update" },
  NO_SLOT_REFUND_PENDING: { title: "İade süreciniz takip ediliyor", nextStep: "Uygun grup bulunamadığı için iade sürecindeki sonraki adımı ekibimiz paylaşacak.", estimate: "update" },
  GROUP_ASSIGNED: { title: "Grubunuz belirlendi", nextStep: "İlk dersin gününü, saatini ve katılım bilgisini ekibimiz paylaşacak.", estimate: "scheduled" },
  FIRST_LESSON_SCHEDULED: { title: "İlk dersiniz planlandı", nextStep: "Ders saatini takviminizden kontrol edebilirsiniz. Katılım bilgisi ders kartında yer alır.", estimate: "scheduled" },
  ACTIVE: { title: "Başlangıç hazırlığınız tamamlandı", nextStep: "Derslerinizi ve sıradaki çalışmanızı panelden takip edebilirsiniz.", estimate: "complete" },
  MANUAL_REVIEW: { title: "Başlangıç bilgileriniz kontrol ediliyor", nextStep: "Ekibimiz hesap bilgilerinizi kontrol edip sonraki adımı sizinle paylaşacak.", estimate: "update" },
  BLOCKED: { title: "Başlangıcınız için bir ayrıntıyı netleştiriyoruz", nextStep: "Ekibimiz gereken bilgiyi sizinle görüşüp süreci sürdürecek.", estimate: "update" },
  REFUND_PENDING: { title: "Talebiniz takip ediliyor", nextStep: "İade sürecindeki sonraki adımı ekibimiz sizinle paylaşacak.", estimate: "update" },
  CANCELED: { title: "Başlangıç süreciniz tamamlandı", nextStep: "Sorularınız için ekibimize ulaşabilirsiniz.", estimate: "complete" },
};

export type OdCustomerStart = { title: string; nextStep: string; estimatedTime: string; timePreferences: string[]; href: string | null };

/** Yalnız kontrollü saat seçenekleri gösterilir; alıcı bilgisi/serbest metin taşınmaz. */
export function odTimePreferenceLabels(buyerInfo: unknown): string[] {
  if (!buyerInfo || typeof buyerInfo !== "object" || Array.isArray(buyerInfo)) return [];
  const buyer = buyerInfo as Record<string, unknown>;
  const preferences = buyer.placementPreferences && typeof buyer.placementPreferences === "object"
    ? buyer.placementPreferences as Record<string, unknown> : buyer;
  const ranges = Array.isArray(preferences.timeRanges) ? preferences.timeRanges
    : Array.isArray(preferences.availabilityTimeRanges) ? preferences.availabilityTimeRanges : [];
  return OD_TIME_RANGE_OPTIONS.filter((option) => ranges.includes(option.value)).map((option) => option.label);
}

export function buildOdCustomerStart(input: {
  state: OdOnboardingStateValue;
  paidAt: Date | null;
  firstLessonAt?: Date | null;
  buyerInfo?: unknown;
  role: "STUDENT" | "PARENT";
  now?: Date;
}): OdCustomerStart {
  const copy = COPY[input.state];
  const now = input.now ?? new Date();
  const due = copy.estimate === "contact" || copy.estimate === "placement"
    ? input.paidAt && new Date(input.paidAt.getTime() + (copy.estimate === "contact" ? 24 : 48) * 3_600_000)
    : copy.estimate === "scheduled" ? input.firstLessonAt : null;
  const formatted = due && due >= now ? new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short",
  }).format(due) : null;
  return {
    title: copy.title,
    nextStep: copy.nextStep,
    estimatedTime: formatted ? `${copy.estimate === "scheduled" ? "İlk ders" : "Tahmini bilgilendirme"}: ${formatted}`
      : copy.estimate === "complete" ? "Güncel bilgiler panelinizde."
        : "Ekibimiz güncel zamanı sizinle paylaşacak.",
    timePreferences: odTimePreferenceLabels(input.buyerInfo),
    href: ["FIRST_LESSON_SCHEDULED", "ACTIVE"].includes(input.state)
      ? input.role === "STUDENT" ? "/panel/ogrenci/takvim" : "/panel/veli/takvim" : null,
  };
}
