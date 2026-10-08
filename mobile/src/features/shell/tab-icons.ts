import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

type TabIcon = { sf: SFSymbol | { default: SFSymbol; selected: SFSymbol }; md: AndroidSymbol };

/** Sunucu menü kimliği → sekme simgesi. Bilinmeyen kimlik nötr simge alır. */
const ICONS: Record<string, TabIcon> = {
  today: { sf: { default: 'house', selected: 'house.fill' }, md: 'home' },
  assignments: { sf: 'checklist', md: 'checklist' },
  lessons: { sf: 'calendar', md: 'event' },
  coaching: { sf: { default: 'person.2', selected: 'person.2.fill' }, md: 'groups' },
  plan: { sf: 'list.bullet.rectangle', md: 'view_list' },
  goals: { sf: 'target', md: 'flag' },
  'odk-exams': { sf: { default: 'doc.text', selected: 'doc.text.fill' }, md: 'description' },
  'odk-reports': { sf: 'chart.bar.doc.horizontal', md: 'bar_chart' },
  'mock-exams': { sf: 'chart.bar', md: 'bar_chart' },
  analiz: { sf: 'chart.line.uptrend.xyaxis', md: 'insights' },
  progress: { sf: 'chart.line.uptrend.xyaxis', md: 'insights' },
  materials: { sf: { default: 'book', selected: 'book.fill' }, md: 'menu_book' },
};

export function tabIconFor(navId: string): TabIcon {
  return ICONS[navId] ?? { sf: 'circle', md: 'radio_button_unchecked' };
}
