import { makeBootstrap } from '@/test/fixtures';

import { findNavItem, resolveNativeScreen } from './native-screens';
import { expoHrefFor, mapNotificationHref, normalizeWebPath, sanitizeIncomingPath, targetForNavId } from './route-map';

const item = (id: string, webPath = `/panel/x/${id}`) => ({ id, label: id, webPath });

describe('native ekran eşlemesi (rol + çalışma alanı + menü kimliği)', () => {
  it('OD öğrencisi korunan OD ekranlarına gider', () => {
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item('today') }).key).toBe('od-home');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item('assignments') }).key).toBe('od-assignments');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item('lessons') }).key).toBe('od-lessons');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item('materials') }).key).toBe('od-materials');
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OD', item: item('analiz') }).key).toBe('od-progress');
  });

  it('Yön öğrencisi OD ekranlarına DÜŞMEZ; Bugün ve Çalışmalar yer tutucu (M3), Hedefler korunur', () => {
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OK', item: item('today') })).toMatchObject({ key: 'placeholder', phase: 'M3' });
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OK', item: item('assignments') })).toMatchObject({ key: 'placeholder', phase: 'M3' });
    expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'OK', item: item('goals') }).key).toBe('ok-goals');
  });

  it('Deneme Ligi öğrencisi OD ekranlarına DÜŞMEZ (M4 yer tutucu)', () => {
    for (const id of ['today', 'assignments', 'odk-exams', 'lessons']) {
      expect(resolveNativeScreen({ role: 'STUDENT', workspace: 'ODK', item: item(id) })).toMatchObject({ key: 'placeholder', phase: 'M4' });
    }
  });

  it('veli, öğretmen ve yönetim öğrenci ekranına düşmez', () => {
    expect(resolveNativeScreen({ role: 'PARENT', workspace: 'OD', item: item('today') })).toMatchObject({ key: 'placeholder', phase: 'M6' });
    expect(resolveNativeScreen({ role: 'TEACHER', workspace: 'OD', item: item('today') })).toMatchObject({ key: 'placeholder', phase: 'M7' });
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
