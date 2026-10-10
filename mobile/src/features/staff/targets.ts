import type { MobileStaffTarget } from '@contracts/staff';

import { hasNavItem } from '@/navigation/od-targets';

type Navigation = Parameters<typeof hasNavItem>[0];

/** Hedefin native karşılığı ve onu açabilmek için menüde bulunması gereken öğe. */
const NATIVE: Partial<Record<MobileStaffTarget['type'], { navId: string; href: (target: MobileStaffTarget) => string }>> = {
  lesson: { navId: 'lessons', href: (target) => `/teacher/lesson/${encodeURIComponent((target as { lessonId: string }).lessonId)}` },
  submissions: { navId: 'assignments', href: () => '/screen/assignments' },
  help: { navId: 'help', href: () => '/screen/help' },
  'coach-plans': { navId: 'plan', href: () => '/screen/plan' },
  'coach-student': { navId: 'coach-students', href: (target) => `/coach/student/${encodeURIComponent((target as { studentId: string }).studentId)}` },
};

/** Native ekran yoksa / bu çalışma alanının menüsünde değilse kullanılan web yolu. */
const WEB: Partial<Record<MobileStaffTarget['type'], (target: MobileStaffTarget) => string>> = {
  lesson: (target) => `/panel/ogretmen/ders/${encodeURIComponent((target as { lessonId: string }).lessonId)}`,
  submissions: () => '/panel/ogretmen/odevler',
  help: () => '/panel/ogretmen/yardim',
  'coach-plans': () => '/panel/ogretmen/plan',
  'coach-student': (target) => `/panel/ogretmen/hazirlik/${encodeURIComponent((target as { studentId: string }).studentId)}`,
};

/**
 * Sunucu hedefi → native rota, YALNIZ hedef ekranın menü öğesi bu çalışma
 * alanında varsa (ör. yardım kutusu Yön menüsündedir; OD Bugün'ünden
 * gelen yardım hedefi web devamına düşer). Keyfi URL açılmaz.
 */
export function staffHref(target: MobileStaffTarget, navigation: Navigation): string | null {
  const native = NATIVE[target.type];
  return native && hasNavItem(navigation, native.navId) ? native.href(target) : null;
}

/** Açık web devam yolu (`openOnWeb` yalnız `/panel/...` açar). */
export function staffWebPath(target: MobileStaffTarget): string | null {
  if (target.type === 'web') return target.path;
  return WEB[target.type]?.(target) ?? null;
}
