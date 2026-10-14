import { CalendarDays, ChartNoAxesCombined, CheckCheck, RotateCcw, LayoutList, LifeBuoy, Settings, Users, type LucideIcon } from 'lucide-react-native';

import { DelightIcon, type DelightIconName } from '@/design/delight-icon';

const ICONS: Record<string, LucideIcon> = {
  'weekly-digest': CheckCheck, weekly: CheckCheck,
  'coach-students': Users, 'coach-sessions': CalendarDays, 'odk-teacher-reports': ChartNoAxesCombined,
  'check-in': CheckCheck, 'review-recovery': RotateCcw, teachers: Users,
  students: Users, help: LifeBuoy, account: Settings,
};
const SIGNATURE: Record<string, DelightIconName> = {
  today: 'sun', assignments: 'task', lessons: 'calendar', materials: 'book', coaching: 'chat',
  plan: 'task', goals: 'goal', progress: 'chart', analiz: 'chart', 'mock-exams': 'exam',
  'odk-exams': 'exam', 'odk-reports': 'chart', menu: 'menu',
};

export function NavIcon({ id, color, size = 19, selected = false }: { id: string; color: string; size?: number; selected?: boolean }) {
  if (SIGNATURE[id]) return <DelightIcon name={SIGNATURE[id]} color={color} size={size} selected={selected} />;
  const Icon = ICONS[id] ?? LayoutList;
  return <Icon size={size} color={color} strokeWidth={1.8} />;
}
