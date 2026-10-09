import {
  parseAssignmentList,
  parseInsights,
  parseLessonDetail,
  parseLessonList,
  parseMaterialList,
  parseMockExams,
  parseOdHome,
  parseRecovery,
  parseReviewQueue,
  parseWeeklyDigest,
} from '@contracts/student';

import * as fx from './od-fixtures';

/** Test verisi sunucu sözleşmesine uymazsa akış testleri yanlış güven verir. */
describe('OD test verisi sözleşmeye uyar', () => {
  it.each([
    ['home', parseOdHome(fx.makeOdHome())],
    ['assignments', parseAssignmentList(fx.makeAssignmentList())],
    ['lessons', parseLessonList(fx.makeLessonList())],
    ['lesson detail', parseLessonDetail(fx.makeLessonDetail())],
    ['materials', parseMaterialList(fx.makeMaterialList())],
    ['insights', parseInsights(fx.makeInsights())],
    ['mock exams', parseMockExams(fx.makeMockExams())],
    ['review', parseReviewQueue(fx.makeReviewQueue())],
    ['recovery', parseRecovery(fx.makeRecovery())],
    ['digest', parseWeeklyDigest(fx.makeWeeklyDigest())],
  ])('%s', (_name, result) => {
    expect(result).toMatchObject({ ok: true });
  });

  it('eski sunucu yanıtı (eklemeli alanlar yok) varsayılanlarla kabul edilir', () => {
    const legacy = { profile: { id: 'sp' }, groupNames: '', lessons: [{ id: 'l', startsAt: '2026-10-08T14:00:00.000Z', title: 'T', groupName: 'G', teacherName: null, statusLabel: 'Bugün', statusTone: 'ok', actionLabel: 'Detay', actionHref: '/panel/ogrenci/takvim/l' }] };
    const parsed = parseLessonList(legacy);
    expect(parsed.ok && parsed.value.lessons[0]).toMatchObject({ status: null, attendance: null, endsAt: null });
  });

  it('kapıda dolu workspace gibi sözleşme dışı yanıt reddedilir', () => {
    expect(parseOdHome({ ...fx.makeOdHome(), scope: 'OK' }).ok).toBe(false);
    expect(parseLessonDetail({ ...fx.makeLessonDetail(), join: { state: 'OPEN' } }).ok).toBe(false);
  });
});
