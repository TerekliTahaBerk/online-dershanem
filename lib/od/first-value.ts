/**
 * İLK DEĞER KONTROL LİSTESİ — saf kurallar.
 *
 * Yeni bir hesabın "kuruldu" sayılması için gereken adımları TEK yerde tutar.
 * Aynı liste hem öğrenci/veli panelinde gösterilir hem de operasyonun istisna
 * kuyruğunu besler: bir adım kendi süresinde tamamlanmazsa insan bakışı gerekir.
 *
 * TASARIM KARARI — liste TÜRETİLİR, saklanmaz. Ayrı bir "checklist" tablosu
 * gerçeğin ikinci bir kopyasını yaratır ve kaçınılmaz olarak veriyle
 * ayrışırdı: veli bağını sildiğinizde kutucuk işaretli kalırdı. Burada her
 * adım doğrudan asıl kayıttan okunur.
 *
 * Adımlar SIRALI ve az sayıdadır. "Yapılacaklar listesi" değil, ilk gerçek
 * faydaya giden en kısa yoldur; yüzde ve rozet YOKTUR.
 */

export type FirstValueStepKey =
  | "ACCOUNT_CLAIMED"
  | "RELATIONSHIP_CONFIRMED"
  | "BASELINE_PREFERENCES"
  | "GROUP_ASSIGNED"
  | "FIRST_LESSON_SCHEDULED";

export type FirstValueAudience = "STUDENT" | "PARENT";

export type FirstValueStep = {
  key: FirstValueStepKey;
  title: string;
  /** Ne işe yaradığı — tek cümle, suçlayıcı olmayan dil. */
  description: string;
  done: boolean;
  /** Kullanıcının kendi tamamlayabileceği adım mı, yoksa bizi mi bekliyor? */
  actor: "USER" | "TEAM";
  href: string | null;
  actionLabel: string | null;
};

export type FirstValueInput = {
  audience: FirstValueAudience;
  /** Kullanıcı kendi parolasını belirledi mi? (`mustChangePassword === false`) */
  accountClaimed: boolean;
  /** Veli–öğrenci bağı var mı ve onaylandı mı? Bağ hiç yoksa `null`. */
  relationship: "CONFIRMED" | "UNCONFIRMED" | null;
  baselinePreferencesSet: boolean;
  groupAssigned: boolean;
  firstLessonScheduled: boolean;
};

const STUDENT_PREFERENCES_HREF = "/panel/ogrenci/plan";
const PARENT_PREFERENCES_HREF = "/panel/veli/bildirimler";

/**
 * Gösterilecek adımlar. Bağı olmayan bir öğrenci için ilişki adımı hiç
 * BASILMAZ — tamamlanamayacak bir kutucuk göstermek listeyi anlamsızlaştırır.
 */
export function firstValueChecklist(input: FirstValueInput): FirstValueStep[] {
  const steps: FirstValueStep[] = [
    {
      key: "ACCOUNT_CLAIMED",
      title: "Kendi parolanı belirle",
      description: "Hesabın satın alma sonrası açıldı; parolayı sen seçtiğinde tamamen senin olur.",
      done: input.accountClaimed,
      actor: "USER",
      href: input.accountClaimed ? null : "/panel/parola",
      actionLabel: input.accountClaimed ? null : "Parolayı belirle",
    },
  ];

  if (input.relationship) {
    steps.push({
      key: "RELATIONSHIP_CONFIRMED",
      title: input.audience === "PARENT" ? "Öğrenci bağlantısını onayla" : "Veli bağlantını onayla",
      description: "Doğru hesabın bağlandığını bir kez teyit ediyoruz; yanlışsa bağlantıyı kaldırırız.",
      done: input.relationship === "CONFIRMED",
      actor: input.audience === "PARENT" ? "USER" : "TEAM",
      href: input.relationship === "CONFIRMED" || input.audience !== "PARENT" ? null : "/panel/veli",
      actionLabel: input.relationship === "CONFIRMED" || input.audience !== "PARENT" ? null : "Bağlantıyı onayla",
    });
  }

  steps.push({
    key: "BASELINE_PREFERENCES",
    title: input.audience === "PARENT" ? "Bildirim tercihlerini seç" : "Çalışma günlerini seç",
    description:
      input.audience === "PARENT"
        ? "Hangi bilgilendirmeleri almak istediğini seçersen gereksiz bildirim göndermeyiz."
        : "Uygun günlerin ve günlük sürene göre haftalık planın oluşturulur.",
    done: input.baselinePreferencesSet,
    actor: "USER",
    href: input.baselinePreferencesSet ? null : input.audience === "PARENT" ? PARENT_PREFERENCES_HREF : STUDENT_PREFERENCES_HREF,
    actionLabel: input.baselinePreferencesSet ? null : "Tercihleri seç",
  });

  steps.push(
    {
      key: "GROUP_ASSIGNED",
      title: "Grubun belirlensin",
      description: "Uygun gün ve seviyeye göre grubunu ekibimiz atar; bu adımda bir şey yapman gerekmez.",
      done: input.groupAssigned,
      actor: "TEAM",
      href: null,
      actionLabel: null,
    },
    {
      key: "FIRST_LESSON_SCHEDULED",
      title: "İlk ders takvime girsin",
      description: "Grubun ilk dersi planlandığında panelde geri sayımı görürsün.",
      done: input.firstLessonScheduled,
      actor: "TEAM",
      href: null,
      actionLabel: null,
    },
  );

  return steps;
}

/** Kullanıcının sırada yapması gereken tek adım; hepsi bittiyse `null`. */
export function nextFirstValueStep(steps: FirstValueStep[]): FirstValueStep | null {
  return steps.find((step) => !step.done) ?? null;
}

/** Liste tamamlandı mı? Tamamlandıysa panelde hiç gösterilmez. */
export function firstValueComplete(steps: FirstValueStep[]): boolean {
  return steps.every((step) => step.done);
}
