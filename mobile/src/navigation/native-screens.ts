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
  | 'odk-home'
  | 'odk-exams'
  | 'odk-switch'
  | 'parent-home'
  | 'parent-lessons'
  | 'parent-assignments'
  | 'parent-teachers'
  | 'parent-insights'
  | 'parent-coaching'
  | 'parent-odk-reports'
  | 'parent-external-exams'
  | 'parent-weekly'
  | 'parent-account'
  | 'teacher-home'
  | 'teacher-lessons'
  | 'teacher-assignments'
  | 'teacher-help'
  | 'coach-home'
  | 'coach-students'
  | 'coach-sessions'
  | 'coach-plans'
  | 'teacher-odk-reports'
  | 'admin-operations-center'
  | 'admin-interventions'
  | 'admin-reports'
  | 'admin-activation-desk'
  | 'admin-people'
  | 'admin-signups'
  | 'placeholder';

/** `P2` / `P4`: tam işlev eşliği yol haritasındaki yönetim fazları (docs/mobile/full-parity-roadmap.md). */
export type PlannedPhase = 'M2' | 'M6' | 'M7' | 'P2' | 'P4' | 'LATER';

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
  // Deneme Ligi (ayrı ürün): yalnız çalışma alanı geçişi; OD dış denemeleri DEĞİL.
  'odk-exams': 'odk-switch',
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
  analiz: 'od-progress',
  'check-in': 'check-in',
  'weekly-digest': 'yon-weekly',
  // Dış deneme ucu OD veya Yön üyeliğini kabul eder (`requireApiAnyProductRole(["OD","OK"])`).
  'mock-exams': 'external-mock-exams',
  'odk-exams': 'odk-switch',
};

/**
 * Deneme Ligi (ODK) öğrencisi — M4. `odk-exams` ODK denemeleridir (OD
 * `mock-exams` dış denemeleri değil). Bu çalışma alanında görünen OD / Yön
 * kaynaklı ortak öğeler (Çalışmalar, check-in, özet…) açık web devam
 * yoluna gider. Analiz bütün ürünlerde ortak öğrenci gidişatını gösterir;
 * deneme listesi ve sonuçları yalnız Deneme Ligi verisini okur.
 */
const ODK_STUDENT: Record<string, NativeScreenKey> = {
  today: 'odk-home',
  'odk-exams': 'odk-exams',
  analiz: 'od-progress',
};

/**
 * Yön menüsünde olup native olmayan öğeler (açık web devam yolu):
 * `progress` (eski gelişim ekranı), `dino` (ayrı karar).
 */
const OK_WEB_ONLY: ReadonlySet<string> = new Set(['progress', 'dino']);

/**
 * VELİ — M6. Veli ekranları çalışma alanından bağımsızdır (veri seçili
 * ÇOCUĞA aittir); sunucu menüsü yine yetkili kapsamı belirler. Veli `today`
 * öğrenci Bugün'üne, `assignments` öğrencinin yazma yetkili ödev ekranına,
 * `odk-reports` öğrenci Deneme Ligi sonuçlarına ASLA düşmez.
 * `progress` (eski Gelişim, yalnız `progressInsights` kapalıyken menüde)
 * aynı veli gelişim ekranını açar; uç bayrak kapalıysa açıkça
 * "şu anda açık değil" durumunu gösterir.
 */
const PARENT: Record<string, NativeScreenKey> = {
  today: 'parent-home',
  lessons: 'parent-lessons',
  assignments: 'parent-assignments',
  teachers: 'parent-teachers',
  analiz: 'parent-insights',
  progress: 'parent-insights',
  coaching: 'parent-coaching',
  'odk-reports': 'parent-odk-reports',
  'mock-exams': 'parent-external-exams',
  'weekly-digest': 'parent-weekly',
  account: 'parent-account',
};

/** Velide bilinçli web devam yolu: `dino` (Dino AI, ayrı karar). */
const PARENT_WEB_ONLY: ReadonlySet<string> = new Set(['dino']);

/**
 * ÖĞRETMEN / KOÇ — M7. Eşleme ÇALIŞMA ALANINA göre: OD dersleri / çalışmaları
 * yalnız OD alanında, koç ekranları yalnız Yön (OK) alanında, ilişkili deneme
 * raporları yalnız Deneme Ligi (ODK) alanında. Menüde görünmek YETKİ DEĞİL;
 * her personel ucu sunucuda ürün rolü + personel izni + kaynak ilişkisini
 * doğrular. Eşlenmeyen öğretmen öğeleri (öğrenciler, materyaller, tekrar,
 * telafi, AI yardımcı, müdahale, özetler, analiz…) açık web devam yoludur.
 */
const TEACHER_OD: Record<string, NativeScreenKey> = {
  today: 'teacher-home',
  lessons: 'teacher-lessons',
  assignments: 'teacher-assignments',
  help: 'teacher-help',
};
const TEACHER_OK: Record<string, NativeScreenKey> = {
  today: 'coach-home',
  'coach-students': 'coach-students',
  'coach-sessions': 'coach-sessions',
  plan: 'coach-plans',
  // S-3: web'de Yön menüsünde; yanıt ucu OD öğretmen rolü ister (sunucu).
  help: 'teacher-help',
};
const TEACHER_ODK: Record<string, NativeScreenKey> = {
  today: 'teacher-odk-reports',
  'odk-reports': 'teacher-odk-reports',
  'odk-teacher-reports': 'teacher-odk-reports',
};

/**
 * YÖNETİM (ADMIN) — Faz 1. Yönetim ekranları çalışma alanından bağımsızdır
 * (Operasyon Merkezi tüm ürünleri okur); sunucu menüsü yine yetkili kapsamı
 * belirler. Her yönetim ucu sunucuda gerçek ADMIN oturumu ister; hassas
 * yazmalar taze step-up ister. Henüz native olmayan yönetim öğeleri
 * yer tutucudur ve geleceği faz etiketlenir (Deneme Ligi yönetimi P4,
 * diğerleri P2).
 */
const ADMIN: Record<string, NativeScreenKey> = {
  today: 'admin-operations-center',
  reports: 'admin-reports',
  provisioning: 'admin-activation-desk',
  people: 'admin-people',
  signups: 'admin-signups',
};

/**
 * Yönetim `operations` öğesi bayrağa göre iki farklı web sayfasıdır
 * (`interventionInbox` açıksa Müdahale, kapalıysa Raporlar); eşleme web
 * yoluna bakar ki bayrak kapalıyken müdahale ekranı açılmasın.
 */
function adminScreen(item: MobileNavItem): NativeScreenKey | undefined {
  if (item.id === 'operations') return item.webPath.endsWith('/mudahale') ? 'admin-interventions' : 'admin-reports';
  return ADMIN[item.id];
}

function adminPhase(navId: string): PlannedPhase {
  return navId.startsWith('odk-') ? 'P4' : 'P2';
}

function placeholderPhase(role: MobileRole, workspace: MobileProductCode | null, navId: string): PlannedPhase {
  if (role === 'ADMIN') return adminPhase(navId);
  // Yön'de bilinmeyen öğe: güvenli taraf, açık web devam yolu.
  if (workspace === 'OK') return 'LATER';
  if (workspace === 'ODK') return 'LATER';
  return 'M2';
}

export function resolveNativeScreen(input: { role: MobileRole; workspace: MobileProductCode | null; item: MobileNavItem }): NativeScreen {
  const { role, workspace, item } = input;
  let key: NativeScreenKey | undefined;
  if (role === 'STUDENT' && workspace === 'OD') key = OD_STUDENT[item.id];
  else if (role === 'STUDENT' && workspace === 'OK') key = OK_STUDENT[item.id];
  else if (role === 'STUDENT' && workspace === 'ODK') key = ODK_STUDENT[item.id];
  else if (role === 'PARENT') key = PARENT[item.id];
  else if (role === 'TEACHER' && workspace === 'OD') key = TEACHER_OD[item.id];
  else if (role === 'TEACHER' && workspace === 'OK') key = TEACHER_OK[item.id];
  else if (role === 'TEACHER' && workspace === 'ODK') key = TEACHER_ODK[item.id];
  else if (role === 'ADMIN') key = adminScreen(item);
  if (key) return { key, navId: item.id, title: item.label, webPath: item.webPath };
  // Deneme Ligi öğrencisinde eşlenmemiş her öğe bilinçli web devam yoludur.
  const webOnly =
    (role === 'STUDENT' && ((workspace === 'OD' && OD_WEB_ONLY.has(item.id)) || (workspace === 'OK' && OK_WEB_ONLY.has(item.id)) || workspace === 'ODK')) ||
    // Velide eşlenmemiş her öğe (ör. Dino AI) bilinçli web devam yoludur.
    (role === 'PARENT' && (PARENT_WEB_ONLY.has(item.id) || !PARENT[item.id])) ||
    // Öğretmende eşlenmemiş her öğe bilinçli web devam yoludur (M7).
    role === 'TEACHER';
  const phase = webOnly ? 'LATER' : placeholderPhase(role, workspace, item.id);
  return { key: 'placeholder', navId: item.id, title: item.label, webPath: item.webPath, phase };
}

/** Navigasyondan id ile öğe bulur (önce birincil, sonra bölümler). */
export function findNavItem(navigation: { primary: MobileNavItem[]; sections: { items: MobileNavItem[] }[] }, navId: string): MobileNavItem | null {
  return navigation.primary.find((item) => item.id === navId) ?? navigation.sections.flatMap((section) => section.items).find((item) => item.id === navId) ?? null;
}

export const PHASE_COPY: Record<PlannedPhase, string> = {
  M2: 'Bu bölüm onlinedershanem. mobil deneyiminin bir sonraki adımında uygulamaya gelecek.',
  M6: 'Bu veli bölümü mobil uygulamada henüz yok. Web panelinden kullanmaya devam edebilirsiniz.',
  M7: 'Bu öğretmen bölümü mobil uygulamada yok. Web panelinden kullanmaya devam edebilirsiniz.',
  P2: 'Bu yönetim bölümü mobil uygulamaya geliyor. O zamana kadar web panelinden devam edebilirsin.',
  P4: 'Deneme Ligi yönetimi mobil uygulamaya geliyor. O zamana kadar web panelinden devam edebilirsin.',
  LATER: 'Bu bölüm mobil uygulamada henüz yok. Web panelinden kullanmaya devam edebilirsin.',
};
