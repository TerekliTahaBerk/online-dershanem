import { useLocalSearchParams } from 'expo-router';
import { AdminCoachingSessionScreen } from '@/features/admin/coaching';
import { AdminRouteGate } from '@/features/admin/shared';
export default function SessionRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <AdminRouteGate><AdminCoachingSessionScreen id={id} /></AdminRouteGate>; }
