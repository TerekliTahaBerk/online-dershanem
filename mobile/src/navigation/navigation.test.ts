import { makeBootstrap } from '@/test/fixtures';

import { findNavItem, resolveNativeScreen } from './native-screens';
import { hrefForOdTarget } from './od-targets';
import { expoHrefFor, mapNotificationHref, normalizeWebPath, sanitizeIncomingPath, targetForNavId, workspaceForWebPath } from './route-map';

const item = (id: string, webPath = `/panel/x/${id}`) => ({ id, label: id, webPath });

describe('native ekran eşlemesi (rol + çalışma alanı + menü kimliği)', () => {
  it('OD öğrencisi korunan OD ekranlarına gider', () => {
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item('today') }).key).toBe('od-home');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item('assignments') }).key).toBe('od-assignments');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item('lessons') }).key).toBe('od-lessons');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item('materials') }).key).toBe('od-materials');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item('analiz') }).key).toBe('od-progress');
  });

  it('Yön öğrencisi OD ekranlarına DÜŞMEZ; Bugün, Çalışmalar ve Hedefler Yön ekranlarıdır (M3)', () => {
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OK', item: item('today') }).key).toBe('yon-today');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OK', item: item('assignments') }).key).toBe('yon-work');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OK', item: item('goals') }).key).toBe('yon-goals');
  });

  it('Deneme Ligi öğrencisi OD ekranlarına DÜŞMEZ (M4: Bugün ve Denemeler Deneme Ligi ekranları)', () => {
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'ODK', item: item('today') }).key).toBe('odk-home');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'ODK', item: item('odk-exams') }).key).toBe('odk-exams');
    for (const id of ['assignments', 'lessons']) {
      expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'ODK', item: item(id) })).toMatchObject({ key: 'placeholder', phase: 'LATER' });
    }
  });

  it.each(['OD', 'OK', 'ODK'] as const)('%s öğrencisi paneldeki ortak Analiz ekranına gider', (workspace) => {
    expect(resolveNativeScreen({ role: 'STUDENT', workspace, item: item('analiz') }).key).toBe('od-progress');
  });

  it('veli, öğretmen ve yönetim öğrenci ekranına düşmez', () => {
    // M6: veli `today` öğrenci Bugün'üne değil, veli Bugün'üne gider.
    expect(resolveNativeScreen({ role: 'PARENT', workspace: 'OD', item: item('today') })).toMatchObject({ key: 'parent-home' });
    // M7: öğretmen OD `today` öğrenci Bugün'üne değil, öğretmen Bugün'üne gider.
    expect(resolveNativeScreen({ role: 'TEACHER', workspace: 'OD', item: item('today') })).toMatchObject({ key: 'teacher-home' });
    expect(resolveNativeScreen({ role: 'ADMIN', workspace: 'OD', item: item('today') })).toMatchObject({ key: 'placeholder', phase: 'WEB' });
  });

  it('bilinmeyen menü kimliği güvenli tarafta kalır', () => {
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item('yeni-ozellik') }).key).toBe('placeholder');
  });
});

describe('bildirim ve derin bağlantı eşlemesi', () => {
  const navigation = makeBootstrap({ products: { OD: 'ACTIVE' } }).workspace!.navigation;

  it('yetkili menüdeki hedef birincil sekmeye / iç ekrana eşlenir; sorgu dizesi atılır', () => {
    expect(mapNotificationHref('/panel/ogrenci/odevler?odev=abc', navigation)).toEqual({ kind: 'tab', slot: 1, navId: 'assignments' });
    expect(mapNotificationHref('/panel/ogrenci/materyaller', navigation)).toEqual({ kind: 'screen', navId: 'materials' });
    expect(mapNotificationHref('/panel/bildirimler', navigation)).toEqual({ kind: 'notifications' });
  });

  it('başka çalışma alanına / role ait veya menüde olmayan hedef açılmaz', () => {
    expect(mapNotificationHref('/panel/odk/ogrenci/denemeler/xyz', navigation)).toEqual({ kind: 'none' });
    expect(mapNotificationHref('/panel/yonetim/kisiler', navigation)).toEqual({ kind: 'none' });
    expect(mapNotificationHref('/panel/ogrenci/check-in', navigation)).toEqual({ kind: 'none' });
    expect(mapNotificationHref(null, navigation)).toEqual({ kind: 'none' });
  });

  it('kötü biçimli / dış yollar reddedilir', () => {
    expect(normalizeWebPath('https://evil.example/panel')).toBeNull();
    expect(normalizeWebPath('//evil.example/panel')).toBeNull();
    expect(normalizeWebPath('/panel/../giris')).toBeNull();
    expect(normalizeWebPath('/panel/ogrenci/')).toBe('/panel/ogrenci');
  });

  it('ortak Analiz bildirimi etkin Yön veya Deneme Ligi alanını OD alanına zorlamaz', () => {
    expect(workspaceForWebPath('/panel/ogrenci/analiz')).toBeNull();
    const navigation = makeBootstrap({ products: { OK: 'ACTIVE' }, extraNav: [['analiz', 'Analiz', '/panel/ogrenci/analiz']] }).workspace!.navigation;
    expect(mapNotificationHref('/panel/ogrenci/analiz', navigation)).toEqual({ kind: 'screen', navId: 'analiz' });
  });

  it('native rota yolları web yollarından bağımsızdır', () => {
    expect(expoHrefFor(targetForNavId(navigation, 'today'))).toBe('/');
    expect(expoHrefFor(targetForNavId(navigation, 'lessons'))).toBe('/slot-2');
    expect(expoHrefFor(targetForNavId(navigation, 'materials'))).toBe('/screen/materials');
    expect(expoHrefFor(targetForNavId(navigation, 'yok'))).toBeNull();
    expect(findNavItem(navigation, 'materials')?.label).toBe('Kaynaklar');
  });

  it('gelen derin bağlantı: izinli rota korunur, token / sorgu atılır, bilinmeyen yol ana ekrana düşer', () => {
    expect(sanitizeIncomingPath('onlinedershanem://screen/materials?token=abc')).toBe('/screen/materials');
    expect(sanitizeIncomingPath('onlinedershanem://notifications')).toBe('/notifications');
    expect(sanitizeIncomingPath('/account/sessions')).toBe('/account/sessions');
    expect(sanitizeIncomingPath('https://onlinedershanem.com/screen/lessons#x')).toBe('/screen/lessons');
    expect(sanitizeIncomingPath('onlinedershanem://panel/yonetim')).toBe('/');
    expect(sanitizeIncomingPath('onlinedershanem://screen/../../etc')).toBe('/');
    expect(sanitizeIncomingPath('onlinedershanem://reset?token=secret')).toBe('/');
  });
});

describe('M2 OD menü denetimi ve hedefler', () => {
  const nav = (ids: string[]) => ({ primary: ids.slice(0, 4).map((id) => item(id)), sections: [{ items: ids.slice(4).map((id) => item(id)) }] });

  it('OD menüsündeki her öğe native ekrana ya da açık web devam yoluna gider (ölü bağlantı yok)', () => {
    const native: Record<string, string> = {
      today: 'od-home',
      assignments: 'od-assignments',
      lessons: 'od-lessons',
      materials: 'od-materials',
      analiz: 'od-progress',
      'review-recovery': 'od-review-recovery',
      'weekly-digest': 'od-weekly-digest',
      'mock-exams': 'external-mock-exams',
      'check-in': 'check-in',
    };
    for (const [id, key] of Object.entries(native)) expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item(id) }).key).toBe(key);
    for (const id of ['dino', 'progress']) {
      expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item(id) })).toMatchObject({ key: 'placeholder', phase: 'LATER' });
    }
  });

  it('Yön çalışma alanındaki tekrar/özet öğeleri OD ekranına düşmez', () => {
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OK', item: item('weekly-digest') }).key).toBe('yon-weekly');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OK', item: item('review-recovery') }).key).toBe('placeholder');
    // M6: veli haftalık özeti öğrenci OD özetine değil, veli özetine gider.
    expect(resolveNativeScreen({ role: 'PARENT', workspace: 'OD', item: item('weekly-digest') }).key).toBe('parent-weekly');
  });

  it('sunucu hedefi yalnız yetkili menü öğesi varsa native rotaya çevrilir', () => {
    const full = nav(['today', 'assignments', 'lessons', 'analiz', 'materials', 'review-recovery']);
    expect(hrefForOdTarget({ type: 'lesson', lessonId: 'l1' }, full)).toBe('/od/lesson/l1');
    expect(hrefForOdTarget({ type: 'assignment', assignmentId: 'a1' }, full)).toBe('/od/assignment/a1');
    expect(hrefForOdTarget({ type: 'assignments' }, full)).toBe('/slot-1');
    expect(hrefForOdTarget({ type: 'lessons' }, full)).toBe('/slot-2');
    expect(hrefForOdTarget({ type: 'review' }, full)).toBe('/od/review-recovery?tab=tekrar');
    expect(hrefForOdTarget({ type: 'recovery', lessonId: 'l9' }, full)).toBe('/od/review-recovery?tab=telafi&lessonId=l9');
    expect(hrefForOdTarget({ type: 'none' }, full)).toBeNull();
    const minimal = nav(['today', 'assignments']);
    expect(hrefForOdTarget({ type: 'lesson', lessonId: 'l1' }, minimal)).toBeNull();
    expect(hrefForOdTarget({ type: 'review' }, minimal)).toBeNull();
    expect(hrefForOdTarget({ type: 'lesson', lessonId: '../x' }, full)).toBeNull();
    expect(hrefForOdTarget({ type: 'recovery', lessonId: '../x' }, full)).toBe('/od/review-recovery?tab=telafi');
    expect(hrefForOdTarget({ type: 'lesson', lessonId: 'l1' }, null)).toBeNull();
  });

  it('bildirim: ders detayı ve tekrar/telafi web yolları yalnız yetkili menüyle native detaya eşlenir', () => {
    const full = nav(['today', 'assignments', 'lessons', 'analiz', 'review-recovery']);
    expect(mapNotificationHref('/panel/ogrenci/takvim/l1', full)).toEqual({ kind: 'detail', href: '/od/lesson/l1' });
    expect(mapNotificationHref('/panel/ogrenci/telafi?lessonId=l1', full)).toEqual({ kind: 'detail', href: '/od/review-recovery?tab=telafi' });
    expect(mapNotificationHref('/panel/ogrenci/tekrar', full)).toEqual({ kind: 'detail', href: '/od/review-recovery?tab=tekrar' });
    expect(mapNotificationHref('/panel/ogrenci/takvim/l1', nav(['today', 'assignments']))).toEqual({ kind: 'none' });
    expect(mapNotificationHref('/panel/ogrenci/takvim/../x', full)).toEqual({ kind: 'none' });
    expect(expoHrefFor({ kind: 'detail', href: '/od/lesson/l1' })).toBe('/od/lesson/l1');
  });

  it('derin bağlantı: OD detay rotaları izinli, yol hileleri reddedilir', () => {
    expect(sanitizeIncomingPath('onlinedershanem://od/lesson/abc')).toBe('/od/lesson/abc');
    expect(sanitizeIncomingPath('onlinedershanem://od/assignment/abc?token=x')).toBe('/od/assignment/abc');
    expect(sanitizeIncomingPath('onlinedershanem://od/review-recovery?tab=telafi')).toBe('/od/review-recovery');
    expect(sanitizeIncomingPath('onlinedershanem://od/lesson/../../account')).toBe('/');
    expect(sanitizeIncomingPath('onlinedershanem://od/mock-exam/x')).toBe('/');
  });
});
