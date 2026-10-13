/**
 * Push SINIFLANDIRMA — hangi kanonik bildirim push ile gönderilebilir ve
 * kilit ekranında HANGİ GENEL METİNLE görünür. Saf modül.
 *
 * Kanonik `Notification` satırlarını üreten pek çok yol var (merkezi üretici +
 * doğrudan yazanlar). Satırın var olması push'a uygun olduğu anlamına GELMEZ:
 * yalnız aşağıdaki izin listesine uyanlar gönderilir. Ödeme / finans
 * bildirimleri push'a ÇIKMAZ. Personel (öğretmen / yönetici) bildirimleri
 * yalnız `staffPush` bayrağı açıkken ve yalnız personel alıcıya, genel
 * `STAFF` metniyle gider (P5.4); finans / sipariş yolları yine hariç.
 *
 * GİZLİLİK: Push başlığı / gövdesi bildirimin kendi başlığı veya gövdesi
 * DEĞİLDİR (ad, not, net, yardım ayrıntısı içerebilir). Kategoriye göre sabit,
 * genel bir metin kullanılır; ayrıntı uygulama açılınca yetkiyle okunur.
 */

export type PushCategory = "LESSON" | "ASSIGNMENT" | "ABSENCE" | "COACHING" | "PLAN" | "DIGEST" | "EXAM" | "GENERAL" | "STAFF";
export type PushPreferenceKey = "lessonSummary" | "weeklyDigest" | "absence" | "assignment" | "examUpdates";

export type ClassifiableNotification = {
  type: "LESSON_SUMMARY" | "ABSENCE" | "ASSIGNMENT" | "PAYMENT" | "SYSTEM";
  sourceType: string | null;
  category: string | null;
  preferenceKey: string | null;
  href: string | null;
};

export type PushClass = { category: PushCategory; preferenceKey: PushPreferenceKey | null; ttlMs: number };

const HOUR = 60 * 60_000;

/** Yalnız öğrenci / veli panel yolları push'a uygun "genel" bildirim olabilir. */
const GENERAL_HREF = /^\/panel\/(?:ogrenci|veli|odk\/ogrenci|odk\/veli|bildirimler)(?:[/?#]|$)/;

/** Personel panel yolları (öğretmen, koç, yönetim, Deneme Ligi personeli). */
const STAFF_HREF = /^\/panel\/(?:ogretmen|yonetim|odk\/ogretmen|odk\/yonetim|bildirimler)(?:[/?#]|$)/;
/** Finans / sipariş yüzeyleri personelde de push'a çıkmaz. */
const STAFF_EXCLUDED_HREF = /^\/panel\/yonetim\/(?:siparisler|isletme\/(?:gelirler|giderler|vergiler|mutabakat|raporlar))(?:[/?#]|$)/;

/** Push alabilen roller: öğrenci / veli; `staffPush` açıkken personel de (P5.4). */
export function pushRecipientRoles(staffPush: boolean): ("STUDENT" | "PARENT" | "TEACHER" | "ADMIN")[] {
  return staffPush ? ["STUDENT", "PARENT", "TEACHER", "ADMIN"] : ["STUDENT", "PARENT"];
}

/** Rol cihaz kaydı / push tercihi kullanabilir mi? Personel yalnız bayrakla. */
export function pushRoleAllowed(role: string, staffPush: boolean): boolean {
  return (pushRecipientRoles(staffPush) as string[]).includes(role);
}

export type PushRecipient = { role?: string | null; staffPush?: boolean };

export function classifyNotification(row: ClassifiableNotification, recipient: PushRecipient = {}): PushClass | null {
  if (row.type === "PAYMENT" || row.preferenceKey === "payment") return null;
  if (recipient.role === "TEACHER" || recipient.role === "ADMIN") {
    if (!recipient.staffPush || !row.href || !STAFF_HREF.test(row.href) || STAFF_EXCLUDED_HREF.test(row.href)) return null;
    return { category: "STAFF", preferenceKey: null, ttlMs: 24 * HOUR };
  }
  if (row.type === "ASSIGNMENT") return { category: "ASSIGNMENT", preferenceKey: "assignment", ttlMs: 24 * HOUR };
  if (row.type === "ABSENCE") return { category: "ABSENCE", preferenceKey: "absence", ttlMs: 24 * HOUR };
  if (row.type === "LESSON_SUMMARY") return { category: "LESSON", preferenceKey: "lessonSummary", ttlMs: 24 * HOUR };
  // SYSTEM: kaynak türüne göre.
  switch (row.sourceType) {
    case "LESSON":
      // Ders hatırlatması zaman duyarlıdır: ders başladıktan sonra anlamsız.
      return { category: "LESSON", preferenceKey: "lessonSummary", ttlMs: 2 * HOUR };
    case "COACHING":
      return { category: "COACHING", preferenceKey: (row.preferenceKey as PushPreferenceKey) ?? "lessonSummary", ttlMs: 12 * HOUR };
    case "PLAN":
      return { category: "PLAN", preferenceKey: (row.preferenceKey as PushPreferenceKey) ?? null, ttlMs: 24 * HOUR };
    case "ODK_EXAM":
      // Hatırlatma / açılış kısa ömürlü; sonuç / anahtar daha uzun.
      return { category: "EXAM", preferenceKey: "examUpdates", ttlMs: row.category?.startsWith("RESULT") || row.category?.startsWith("ANSWER_KEY") ? 48 * HOUR : 2 * HOUR };
    case "SUMMARY":
      return { category: "DIGEST", preferenceKey: null, ttlMs: 24 * HOUR };
    default:
      break;
  }
  // Kaynaksız SYSTEM satırları: yalnız öğrenci / veli yüzeyine işaret edenler, genel metinle.
  if (row.href && GENERAL_HREF.test(row.href)) return { category: "GENERAL", preferenceKey: null, ttlMs: 24 * HOUR };
  return null;
}

/** Kilit ekranında görünecek GENEL metin (kişisel veri yok). */
export const PUSH_COPY: Record<PushCategory, { title: string; body: string }> = {
  LESSON: { title: "Online Dershanem", body: "Ders hatırlatman hazır." },
  ASSIGNMENT: { title: "Online Dershanem", body: "Yeni bir çalışman var." },
  ABSENCE: { title: "Online Dershanem", body: "Devamsızlıkla ilgili yeni bir bildirimin var." },
  COACHING: { title: "Yön Koçluk", body: "Koçluk görüşmenle ilgili bir güncelleme var." },
  PLAN: { title: "Yön Koçluk", body: "Koçluk planında bir güncelleme var." },
  DIGEST: { title: "Online Dershanem", body: "Günün gelişmeleri hazır." },
  EXAM: { title: "Deneme Ligi", body: "Denemenle ilgili yeni bir bildirimin var." },
  GENERAL: { title: "Online Dershanem", body: "Yeni bir bildirimin var." },
  STAFF: { title: "Online Dershanem", body: "Panelde yeni bir iş bildirimin var." },
};

/** Deneme Ligi olay türüne göre daha belirli ama yine kişisel veri içermeyen metin. */
/** Ödev / plan görevi olayları (`lib/panel/study-notifications.ts`); alıcı rolünden bağımsız, kişisel veri yok. */
const STUDY_COPY: Record<string, string> = {
  "ASSIGNMENT:NEW": "Yeni bir ödev eklendi.",
  "ASSIGNMENT:DONE": "Bir ödev tamamlandı.",
  "ASSIGNMENT:SUBMITTED": "Değerlendirme bekleyen bir ödev var.",
  "ASSIGNMENT:REVIEWED": "Bir ödev değerlendirildi.",
  "PLAN_TASK:DONE": "Plandaki bir görevde ilerleme var.",
  "PLAN_TASK:ADDED": "Plana yeni bir görev eklendi.",
  "PLAN:PUBLISHED": "Haftalık plan yayınlandı.",
};

export function pushCopyFor(cls: PushClass, row: Pick<ClassifiableNotification, "category">) {
  if ((cls.category === "ASSIGNMENT" || cls.category === "STAFF") && row.category && STUDY_COPY[row.category]) return { title: "Online Dershanem", body: STUDY_COPY[row.category] };
  if (cls.category === "EXAM") {
    const kind = row.category?.split(":")[0];
    if (kind === "RESULT") return { title: "Deneme Ligi", body: "Deneme sonucun açıklandı." };
    if (kind === "ANSWER_KEY") return { title: "Deneme Ligi", body: "Deneme cevap anahtarı yayınlandı." };
    if (kind === "OPEN") return { title: "Deneme Ligi", body: "Denemen başladı." };
    if (kind === "REMINDER") return { title: "Deneme Ligi", body: "Denemen yakında başlıyor." };
  }
  return PUSH_COPY[cls.category];
}
