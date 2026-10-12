import { useLocalSearchParams } from 'expo-router';
import { AdminAnalyticsScreen, emptyAnalyticsFilters } from '@/features/admin/system';
import { AdminRouteGate } from '@/features/admin/shared';
export default function MetricRoute() {
  const params = useLocalSearchParams<Record<string, string>>();
  const filters = Object.fromEntries(Object.entries(emptyAnalyticsFilters).map(([key, fallback]) => [key, typeof params[key] === 'string' ? params[key] : fallback])) as typeof emptyAnalyticsFilters;
  return <AdminRouteGate><AdminAnalyticsScreen metric={params.metric} initialFilters={filters} /></AdminRouteGate>;
}
