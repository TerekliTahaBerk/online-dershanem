import { useLocalSearchParams } from 'expo-router';
import { AdminOrderScreen } from '@/features/admin/orders';
import { AdminRouteGate } from '@/features/admin/shared';
export default function OrderRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <AdminRouteGate><AdminOrderScreen id={id} /></AdminRouteGate>; }
