import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";

/**
 * Management analytics metric catalog.
 *
 * Her KPI için: definition · query source · date semantics · timezone · denominator.
 * UI ve export bu kataloğu kullanır; yeni metrik önce buraya eklenir.
 */

export const MANAGEMENT_ANALYTICS_RULE_VERSION = "management-analytics-v1" as const;
export const MANAGEMENT_ANALYTICS_TIMEZONE = ISTANBUL_TIME_ZONE;
/** Küçük kohortlarda başarı metriklerini bastırır. */
export const MANAGEMENT_ANALYTICS_COHORT_MIN = 10;
/** Dashboard snapshot cache TTL (saniye). */
export const MANAGEMENT_ANALYTICS_CACHE_TTL_SECONDS = 90;
/** Paket yenileme yaklaşımı penceresi (gün). */
export const PACKAGE_RENEWAL_WINDOW_DAYS = 30;

export type MetricDomain = "commercial" | "education" | "success" | "teacher_ops";
export type MetricUnit = "count" | "percent" | "days" | "cents" | "ratio";
export type DateSemantics =
  | "created_in_range"
  | "event_in_range"
  | "point_in_time"
  | "expires_in_window"
  | "starts_in_range"
  | "due_in_range"
  | "taken_in_range"
  | "resolved_in_range";

export type MetricDefinition = {
  key: string;
  domain: MetricDomain;
  label: string;
  definition: string;
  querySource: string;
  dateSemantics: DateSemantics;
  timezone: typeof MANAGEMENT_ANALYTICS_TIMEZONE;
  denominator: string;
  unit: MetricUnit;
  /** Dashboard birincil KPI setinde yer alır. */
  primaryKpi: boolean;
  suppressBelow?: number;
};

const TZ = MANAGEMENT_ANALYTICS_TIMEZONE;

export const METRIC_DEFINITIONS: readonly MetricDefinition[] = [
  // —— Ticari ——
  {
    key: "lead_count",
    domain: "commercial",
    label: "Lead sayısı",
    definition:
      "Seçilen aralıkta oluşturulan, anonimleştirilmemiş BusinessLead kayıtlarının sayısı.",
    querySource: "BusinessLead.count(createdAt in range, anonymizedAt null)",
    dateSemantics: "created_in_range",
    timezone: TZ,
    denominator: "Yok (mutlak sayı).",
    unit: "count",
    primaryKpi: true,
  },
  {
    key: "lead_to_won",
    domain: "commercial",
    label: "Lead → Won",
    definition:
      "Aynı aralıkta oluşturulan lead'ler içinde stage=WON olanların oranı. Vanity değil; satış dönüşümünün ilk basamağı.",
    querySource: "BusinessLead.stage WON / leads created in range",
    dateSemantics: "created_in_range",
    timezone: TZ,
    denominator: "Aralıkta oluşturulan lead sayısı.",
    unit: "percent",
    primaryKpi: true,
  },
  {
    key: "won_to_paid",
    domain: "commercial",
    label: "Won → Paid",
    definition:
      "Aralıkta ödenen (PAID) siparişlerin, aralıkta WON olan lead sayısına oranı. Lead–sipariş birebir bağ yoksa yaklaşık funnel ölçüsüdür.",
    querySource: "OdOrder+OdkOrder PAID / BusinessLead WON",
    dateSemantics: "created_in_range",
    timezone: TZ,
    denominator: "Aralıkta WON lead sayısı.",
    unit: "percent",
    primaryKpi: false,
  },
  {
    key: "paid_to_provisioned",
    domain: "commercial",
    label: "Paid → Provisioned",
    definition:
      "PAID siparişler içinde provisioningStatus=SUCCEEDED olanların oranı.",
    querySource: "OdOrder+OdkOrder provisioning SUCCEEDED / PAID",
    dateSemantics: "created_in_range",
    timezone: TZ,
    denominator: "Aralıkta PAID sipariş sayısı.",
    unit: "percent",
    primaryKpi: true,
  },
  {
    key: "sales_by_product",
    domain: "commercial",
    label: "Ürün bazında satış",
    definition:
      "PAID siparişlerin ürün (OD / ODK) ve paket adına göre adet + ciro dağılımı.",
    querySource: "OdOrder / OdkOrder groupBy packageName, status=PAID",
    dateSemantics: "created_in_range",
    timezone: TZ,
    denominator: "PAID sipariş satırı; oran için toplam PAID.",
    unit: "count",
    primaryKpi: false,
  },
  {
    key: "avg_sales_cycle_days",
    domain: "commercial",
    label: "Ortalama satış süresi",
    definition:
      "WON lead'lerde createdAt → wonAt arası takvim günlerinin ortalaması (Europe/Istanbul gün sınırları).",
    querySource: "BusinessLead where stage=WON and wonAt not null",
    dateSemantics: "created_in_range",
    timezone: TZ,
    denominator: "wonAt dolu WON lead sayısı.",
    unit: "days",
    primaryKpi: false,
  },
  {
    key: "collections",
    domain: "commercial",
    label: "Tahsilat",
    definition:
      "Aralıkta status=PAID FinancialTransaction kayıtlarının gelir (EXPENSE olmayan) netCents toplamı. Resmî muhasebe değildir.",
    querySource: "FinancialTransaction.aggregate netCents, status=PAID, kind≠EXPENSE",
    dateSemantics: "event_in_range",
    timezone: TZ,
    denominator: "Yok (tutar).",
    unit: "cents",
    primaryKpi: true,
  },
  {
    key: "refunds",
    domain: "commercial",
    label: "İade",
    definition:
      "Aralıkta status=REFUNDED sipariş adedi ve CommerceOrderLine.refundedCents toplamı.",
    querySource: "OdOrder+OdkOrder REFUNDED + CommerceOrderLine.refundedCents",
    dateSemantics: "created_in_range",
    timezone: TZ,
    denominator: "Yok (adet/tutar).",
    unit: "cents",
    primaryKpi: false,
  },
  {
    key: "package_renewals_upcoming",
    domain: "commercial",
    label: "Paket yenileme yaklaşanlar",
    definition:
      "revokedAt null ve expiresAt önümüzdeki 30 İstanbul günü içinde olan ProductMembership sayısı. PII içermez.",
    querySource: "ProductMembership.count(expiresAt in renewal window)",
    dateSemantics: "expires_in_window",
    timezone: TZ,
    denominator: "Yok (adet).",
    unit: "count",
    primaryKpi: false,
  },

  // —— Eğitim ——
  {
    key: "active_students",
    domain: "education",
    label: "Aktif öğrenci",
    definition:
      "role=STUDENT, status=ACTIVE ve en az bir revokedAt=null, süresi dolmamış (expiresAt null veya > now) ProductMembership'i olan kullanıcı sayısı. Noktasal (point-in-time).",
    querySource: "User.count(role STUDENT, status ACTIVE, membership active)",
    dateSemantics: "point_in_time",
    timezone: TZ,
    denominator: "Yok (anlık sayı).",
    unit: "count",
    primaryKpi: true,
  },
  {
    key: "active_groups",
    domain: "education",
    label: "Aktif grup",
    definition: "isActive=true Group kayıtları. Noktasal.",
    querySource: "Group.count(isActive true)",
    dateSemantics: "point_in_time",
    timezone: TZ,
    denominator: "Yok.",
    unit: "count",
    primaryKpi: false,
  },
  {
    key: "lesson_attendance_rate",
    domain: "education",
    label: "Ders katılım oranı",
    definition:
      "Aralıkta oluşturulan Attendance kayıtlarında PRESENT+LATE / tüm kayıtlar. EXCUSED ve ABSENT paydada kalır.",
    querySource: "Attendance.status distribution, createdAt in range",
    dateSemantics: "created_in_range",
    timezone: TZ,
    denominator: "Aralıktaki tüm Attendance satırları.",
    unit: "percent",
    primaryKpi: true,
  },
  {
    key: "assignment_completion",
    domain: "education",
    label: "Ödev tamamlama",
    definition:
      "Aktif ödevlere bağlı AssignmentProgress kayıtlarında status=DONE oranı. Ödev dueAt aralık içinde olanlar.",
    querySource: "AssignmentProgress DONE / progress on active assignments due in range",
    dateSemantics: "due_in_range",
    timezone: TZ,
    denominator: "İlgili progress satır sayısı.",
    unit: "percent",
    primaryKpi: true,
  },
  {
    key: "weekly_plan_completion",
    domain: "education",
    label: "Haftalık plan tamamlama",
    definition:
      "WeeklyPlanTask status=DONE / aralıkta weekStart'i düşen planların tüm görevleri.",
    querySource: "WeeklyPlanTask via WeeklyPlan.weekStart in range",
    dateSemantics: "starts_in_range",
    timezone: TZ,
    denominator: "Aralıktaki plan görev sayısı.",
    unit: "percent",
    primaryKpi: true,
  },
  {
    key: "mock_exam_participation",
    domain: "education",
    label: "Deneme katılımı",
    definition:
      "Aralıkta en az bir MockExam kaydı olan benzersiz öğrenci / aktif öğrenci.",
    querySource: "MockExam distinct studentId / active_students",
    dateSemantics: "taken_in_range",
    timezone: TZ,
    denominator: "Aktif öğrenci (point-in-time).",
    unit: "percent",
    primaryKpi: false,
  },
  {
    key: "student_risk_distribution",
    domain: "education",
    label: "Öğrenci risk dağılımı",
    definition:
      "Aktif öğrenciler içinde kritik / izleme / normal kova sayıları. Kritik, izlemeden düşülür. Performans puanı değildir.",
    querySource: "Ops risk sets + active_students",
    dateSemantics: "point_in_time",
    timezone: TZ,
    denominator: "Aktif öğrenci.",
    unit: "count",
    primaryKpi: false,
  },
  {
    key: "intervention_rate",
    domain: "education",
    label: "Müdahale oranı",
    definition:
      "Aralıkta açılan InterventionCase / aktif öğrenci. Öğrenci başına vaka değil; operasyonel yoğunluk.",
    querySource: "InterventionCase.count(createdAt in range) / active_students",
    dateSemantics: "created_in_range",
    timezone: TZ,
    denominator: "Aktif öğrenci.",
    unit: "percent",
    primaryKpi: false,
  },

  // —— Öğrenci başarısı ——
  {
    key: "cohort_mock_exam_trend",
    domain: "success",
    label: "Kohort deneme trendi",
    definition:
      "Sınav türü kohortunda baseline→takip net değişim medyanı (cohort-gain-v1). n < 10 ise bastırılır.",
    querySource: "MockExam + sections → calculateCohortGains",
    dateSemantics: "taken_in_range",
    timezone: TZ,
    denominator: "Eşleşmiş öğrenci (≥10).",
    unit: "percent",
    primaryKpi: false,
    suppressBelow: MANAGEMENT_ANALYTICS_COHORT_MIN,
  },
  {
    key: "cohort_subject_progress",
    domain: "success",
    label: "Ders bazlı gelişim",
    definition:
      "Kohortta deneme bölüm (subject) net değişimlerinin medyanı. Küçük n bastırılır.",
    querySource: "MockExamSection grouped by subjectCode",
    dateSemantics: "taken_in_range",
    timezone: TZ,
    denominator: "Eşleşmiş öğrenci (≥10).",
    unit: "percent",
    primaryKpi: false,
    suppressBelow: MANAGEMENT_ANALYTICS_COHORT_MIN,
  },
  {
    key: "cohort_outcome_progress",
    domain: "success",
    label: "Kazanım gelişimi",
    definition:
      "Aralıkta LessonOutcome bağlantılı tamamlanan ders oranı (kanıt kapsamı). Nedensel etki iddiası yoktur.",
    querySource: "Lesson COMPLETED with LessonOutcome / COMPLETED lessons",
    dateSemantics: "starts_in_range",
    timezone: TZ,
    denominator: "Tamamlanan ders (≥10 örnek).",
    unit: "percent",
    primaryKpi: false,
    suppressBelow: MANAGEMENT_ANALYTICS_COHORT_MIN,
  },
  {
    key: "plan_alignment_vs_outcome",
    domain: "success",
    label: "Plan uyumu vs sonuç",
    definition:
      "Haftalık plan tamamlama oranı ile deneme katılımı arasındaki ilişki özeti (korelasyon değil; yan yana oran). n < 10 bastırılır.",
    querySource: "weekly_plan_completion + mock_exam_participation sample sizes",
    dateSemantics: "starts_in_range",
    timezone: TZ,
    denominator: "Her iki metrik için örneklem ≥10.",
    unit: "ratio",
    primaryKpi: false,
    suppressBelow: MANAGEMENT_ANALYTICS_COHORT_MIN,
  },

  // —— Öğretmen operasyonu (sıralama yok) ——
  {
    key: "lesson_close_completion",
    domain: "teacher_ops",
    label: "Ders kapanış tamamlama",
    definition:
      "Aralıkta startsAt düşen, CANCELLED olmayan derslerde status=COMPLETED oranı. Öğretmen sıralaması üretilmez.",
    querySource: "Lesson COMPLETED / non-CANCELLED startsAt in range",
    dateSemantics: "starts_in_range",
    timezone: TZ,
    denominator: "İptal edilmemiş ders sayısı.",
    unit: "percent",
    primaryKpi: true,
  },
  {
    key: "teacher_open_work",
    domain: "teacher_ops",
    label: "Açık işler",
    definition:
      "Açık müdahale + gecikmiş ödev progress + planlanıp kapanmamış geçmiş ders toplamı. Yük göstergesi; performans puanı değil.",
    querySource: "Intervention OPEN+IN_PROGRESS + overdue AssignmentProgress + past PLANNED lessons",
    dateSemantics: "point_in_time",
    timezone: TZ,
    denominator: "Yok (adet).",
    unit: "count",
    primaryKpi: false,
  },
  {
    key: "intervention_resolution",
    domain: "teacher_ops",
    label: "Müdahale çözüm oranı",
    definition:
      "Aralıkta kapanan (RESOLVED | FALSE_POSITIVE) / aralıkta oluşturulan müdahale vakaları.",
    querySource: "InterventionCase resolved vs created",
    dateSemantics: "resolved_in_range",
    timezone: TZ,
    denominator: "Aralıkta oluşturulan vaka.",
    unit: "percent",
    primaryKpi: true,
  },
  {
    key: "teacher_student_load",
    domain: "teacher_ops",
    label: "Öğrenci yükü",
    definition:
      "Aktif gruplardaki açık enrollment toplamı / aktif grup öğretmeni (benzersiz). Ortalama yük; bireysel sıralama yok.",
    querySource: "Enrollment(endedAt null) on active groups / distinct teacherId",
    dateSemantics: "point_in_time",
    timezone: TZ,
    denominator: "Aktif grup sahibi öğretmen sayısı.",
    unit: "ratio",
    primaryKpi: false,
  },
] as const;

export type MetricKey = (typeof METRIC_DEFINITIONS)[number]["key"];

const byKey = new Map(METRIC_DEFINITIONS.map((item) => [item.key, item]));

export function getMetricDefinition(key: string): MetricDefinition | null {
  return byKey.get(key) ?? null;
}

export function primaryKpiDefinitions(): MetricDefinition[] {
  return METRIC_DEFINITIONS.filter((item) => item.primaryKpi);
}

export function definitionsByDomain(domain: MetricDomain): MetricDefinition[] {
  return METRIC_DEFINITIONS.filter((item) => item.domain === domain);
}
