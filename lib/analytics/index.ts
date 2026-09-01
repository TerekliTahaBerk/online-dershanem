export {
  MANAGEMENT_ANALYTICS_RULE_VERSION,
  MANAGEMENT_ANALYTICS_TIMEZONE,
  MANAGEMENT_ANALYTICS_COHORT_MIN,
  MANAGEMENT_ANALYTICS_CACHE_TTL_SECONDS,
  PACKAGE_RENEWAL_WINDOW_DAYS,
  METRIC_DEFINITIONS,
  getMetricDefinition,
  primaryKpiDefinitions,
  definitionsByDomain,
  type MetricDefinition,
  type MetricKey,
  type MetricDomain,
} from "@/lib/analytics/definitions";

export {
  parseAnalyticsFilters,
  analyticsFilterCacheKey,
  productMatchesFilter,
  type AnalyticsCohortFilters,
  type AnalyticsFilterInput,
  type AnalyticsProductFilter,
} from "@/lib/analytics/filters";

export { suppressCohortMetric, isMetricVisible, type SuppressibleMetric } from "@/lib/analytics/privacy";
export { calculateCommercialMetrics, type CommercialMetrics, type CommercialCounts } from "@/lib/analytics/commercial";
export { calculateEducationMetrics, type EducationMetrics, type EducationCounts } from "@/lib/analytics/education";
export { calculateSuccessMetrics, type SuccessMetrics, type SuccessCounts } from "@/lib/analytics/success";
export { calculateTeacherOpsMetrics, type TeacherOpsMetrics, type TeacherOpsCounts } from "@/lib/analytics/teacher-ops";
export {
  buildDashboardKpis,
  formatMetricDisplay,
  type DashboardKpi,
  type ManagementAnalyticsSnapshot,
} from "@/lib/analytics/dashboard";
export {
  buildAnalyticsExportRows,
  analyticsExportCsv,
  ANALYTICS_EXPORT_FORBIDDEN_HEADERS,
} from "@/lib/analytics/export";
