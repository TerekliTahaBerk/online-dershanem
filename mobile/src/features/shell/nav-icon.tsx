import { BookOpen, CalendarDays, ChartNoAxesCombined, CheckCheck, RotateCcw, ClipboardList, FileText, House, LayoutList, LifeBuoy, Menu, MessageCircle, Settings, Target, Users, type LucideIcon } from 'lucide-react-native';

const ICONS: Record<string, LucideIcon> = {
  today: House, assignments: ClipboardList, lessons: CalendarDays, materials: BookOpen,
  coaching: MessageCircle, plan: LayoutList, goals: Target, progress: ChartNoAxesCombined,
  analiz: ChartNoAxesCombined, 'mock-exams': FileText, 'odk-exams': FileText,
  'odk-reports': ChartNoAxesCombined, 'weekly-digest': CheckCheck, weekly: CheckCheck,
  'coach-students': Users, 'coach-sessions': CalendarDays, 'odk-teacher-reports': ChartNoAxesCombined,
  'check-in': CheckCheck, 'review-recovery': RotateCcw, teachers: Users,
  students: Users, help: LifeBuoy, account: Settings, menu: Menu,
};

export function NavIcon({ id, color, size = 19 }: { id: string; color: string; size?: number }) {
  const Icon = ICONS[id] ?? LayoutList;
  return <Icon size={size} color={color} strokeWidth={1.7} />;
}
