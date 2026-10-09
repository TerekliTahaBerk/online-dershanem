import type { MobileNavItem, MobileProductCode, MobileRole } from '@contracts/bootstrap';

/**
 * Sunucu navigasyon kimliği (`lib/panel/navigation.ts` id'leri) → native ekran.
 *
 * KURALLAR
 * - Girdi sunucunun YETKİLENDİRDİĞİ menüdür (bootstrap); burada yetki
 *   kararı verilmez, yalnız "bu öğenin native karşılığı var mı" sorulur.
 * - Eşleme ROL + ÇALIŞMA ALANI + id üçlüsüyle yapılır: veli "today"
 *   öğesi öğrenci ana sayfasına düşmez; Yön çalışma alanındaki "assignments"
 *   OD ödev ekranına (OD uç noktası) düşmez.
 * - Bilinmeyen id güvenli tarafta kalır: bilgi ekranı (placeholder).
 * - Web yolu native rota olarak KULLANILMAZ; yalnız "web'de aç" için taşınır.
 */
export type NativeScreenKey =
  | 'od-home'
  | 'od-lessons'
  | 'od-assignments'
  | 'od-materials'
  | 'od-progress'
  | 'od-review-recovery'
  | 'od-weekly-digest'
  | 'external-mock-exams'
  | 'check-in'
  | 'yon-today'
  | 'yon-work'
  | 'yon-coaching'
  | 'yon-plan'
  | 'yon-goals'
  | 'yon-weekly'
  | 'placeholder';

export type PlannedPhase = 'M2' | 'M4' | 'M6' | 'M7' | 'WEB' | 'LATER';

export type NativeScreen = {
  key: NativeScreenKey;
  navId: string;
  title: string;
  webPath: string | null;
  /** Yalnız placeholder: hangi fazda native olacak / neden web'de. */
  phase?: PlannedPhase;
};

const OD_STUDENT: Record<string, NativeScreenKey> = {
  today: 'od-home',
  lessons: 'od-lessons',
  assignments: 'od-assignments',
  materials: 'od-materials',
  analiz: 'od-progress',
  'mock-exams': 'external-mock-exams',
  'review-recovery': 'od-review-recovery',
  'weekly-digest': 'od-weekly-digest',
  // OD + Yön ORTAK check-in (M3): tek ekran, sunucu kuralları değişmedi.
  'check-in': 'check-in',
};

/**
 * OD menüsünde olup bilinçli olarak native olmayan öğeler (açık web devam
 * yolu): `dino` (Dino AI, ayrı karar), `progress` (yalnız
 * `progressInsights` KAPALIYKEN menüde; eski "Gelişim").
 */
const OD_WEB_ONLY: ReadonlySet<string> = new Set(['dino', 'progress']);

/**
 * Yön (OK) öğrencisi — M3. `assignments` Yön'de OD ödev ekranına DEĞİL,
 * Yön plan görevlerinin listesine (`yon-work`) gider.
 */
const OK_STUDENT: Record<string, NativeScreenKey> = {
  today: 'yon-today',
  assignments: 'yon-work',
  coaching: 'yon-coaching',
  plan: 'yon-plan',
  goals: 'yon-goals',
  'check-in': 'check-in',
  'weekly-digest': 'yon-weekly',
  // Dış deneme ucu OD veya Yön üyeliğini kabul eder (`requireApiAnyProductRole(["OD","OK"])`).
  'mock-exams': 'external-mock-exams',
};

/**
 * Yön menüsünde olup native olmayan öğeler (açık web devam yolu):
 * `analiz` / `progress` (akademik gidişat OD verisine dayanır — OD
 * çalışma alanında native), `dino` (ayrı karar).
 */
const OK_WEB_ONLY: ReadonlySet<string> = new Set(['analiz', 'progress', 'dino']);

function placeholderPhase(role: MobileRole, workspace: MobileProductCode | null): PlannedPhase {
  if (role === 'PARENT') return 'M6';
  if (role === 'TEACHER') return 'M7';
  if (role === 'ADMIN') return 'WEB';
  // Yön'de bilinmeyen öğe: güvenli taraf, açık web devam yolu.
  if (workspace === 'OK') return 'LATER';
  if (workspace === 'ODK') return 'M4';
  return 'M2';
}

export function resolveNativeScreen(input: { role: MobileRole; workspace: MobileProductCode | null; item: MobileNavItem }): NativeScreen {
  const { role, workspace, item } = input;
  let key: NativeScreenKey | undefined;
  if (role === 'STUDENT' && workspace === 'OD') key = OD_STUDENT[item.id];
  else if (role === 'STUDENT' && workspace === 'OK') key = OK_STUDENT[item.id];
  if (key) return { key, navId: item.id, title: item.label, webPath: item.webPath };
  const webOnly = role === 'STUDENT' && ((workspace === 'OD' && OD_WEB_ONLY.has(item.id)) || (workspace === 'OK' && OK_WEB_ONLY.has(item.id)));
  const phase = webOnly ? 'LATER' : placeholderPhase(role, workspace);
  return { key: 'placeholder', navId: item.id, title: item.label, webPath: item.webPath, phase };
}

/** Navigasyondan id ile öğe bulur (önce birincil, sonra bölümler). */
export function findNavItem(navigation: { primary: MobileNavItem[]; sections: { items: MobileNavItem[] }[] }, navId: string): MobileNavItem | null {
  return navigation.primary.find((item) => item.id === navId) ?? navigation.sections.flatMap((section) => section.items).find((item) => item.id === navId) ?? null;
}

export const PHASE_COPY: Record<PlannedPhase, string> = {
  M2: 'Bu bölüm onlinedershanem. mobil deneyiminin bir sonraki adımında uygulamaya gelecek.',
  M4: 'Deneme Ligi ekranları mobil uygulamaya bir sonraki aşamada gelecek. Denemeleri şimdilik web panelinden çözebilirsin.',
  M6: 'Veli ekranları mobil uygulamaya sonraki aşamada gelecek.',
  M7: 'Öğretmen ve koç ekranları mobil uygulamaya sonraki aşamada gelecek.',
  WEB: 'Yönetim işlemleri güvenlik gereği web panelinden yapılır.',
  LATER: 'Bu bölüm mobil uygulamada henüz yok. Web panelinden kullanmaya devam edebilirsin.',
};
