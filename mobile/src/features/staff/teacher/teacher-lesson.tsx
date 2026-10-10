import { OUTCOME_SKIP_REASONS, type MobileAttendance, type MobileTeacherLessonDetail } from '@contracts/staff';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, SegmentedTabs, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { fetchTeacherLesson, saveLessonNotes, type LessonNotesPayload } from '@/lib/api/staff';
import { useSession } from '@/lib/auth/session-provider';
import { formatLongDate, formatTime } from '@/lib/format/istanbul';

import { confirmAction, isHttps, OfflineWriteNotice, QueryView, staffStyles, useInvalidateStaff, useOnline, usePullToRefresh, useStableKey, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';

const ATTENDANCE_LABEL: Record<MobileAttendance, string> = { PRESENT: 'Katıldı', LATE: 'Geç', ABSENT: 'Yok', EXCUSED: 'Mazeretli' };
const SKIP_LABEL: Record<(typeof OUTCOME_SKIP_REASONS)[number], string> = { CATALOG_MISSING: 'Katalogda yok', COMPLETE_LATER: 'Sonra tamamlayacağım', NOT_APPLICABLE: 'Bu ders için uygun değil' };
const EVIDENCE_LABEL = { TAUGHT: 'Anlatıldı', OBSERVED: 'Gözlendi', INDEPENDENT: 'Bağımsız', NEEDS_REVIEW: 'Tekrar gerekli' } as const;
type Evidence = keyof typeof EVIDENCE_LABEL;
type Tab = 'hazirlik' | 'ders' | 'kapanis';

type Form = {
  topic: string;
  note: string;
  nextGoal: string;
  homework: string;
  students: Record<string, { attendance: MobileAttendance; note: string }>;
  outcomes: Record<string, Evidence>;
  skipReason: (typeof OUTCOME_SKIP_REASONS)[number] | null;
};

function formFrom(lesson: MobileTeacherLessonDetail): Form {
  return {
    ...lesson.common,
    students: Object.fromEntries(lesson.students.map((student) => [student.id, { attendance: student.attendance ?? 'PRESENT', note: student.note }])),
    outcomes: Object.fromEntries(lesson.outcomes.linked.map((link) => [link.outcomeId, link.evidenceType])),
    skipReason: lesson.outcomes.skipReason,
  };
}

/**
 * ÖĞRETMEN · DERS — Hazırlık / Ders / Kapanış. Yazma MEVCUT
 * `PUT /api/panel/lessons/[id]/notes` ucuyla; ders sahipliği, grup üyeliği,
 * sürüm ve tekrar kuralları SUNUCUDA. Mobil yalnız doğru yükü gönderir.
 */
export function TeacherLessonScreen({ lessonId }: { lessonId: string }) {
  const query = useStaffQuery('OD', 'teacher-lesson', (api, signal) => fetchTeacherLesson(api, lessonId, signal), { params: { lessonId } });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="teacher-lesson">
      <QueryView query={query}>{(lesson) => <LessonWorkspace key={lesson.id} lesson={lesson} refetch={() => query.refetch()} />}</QueryView>
    </Screen>
  );
}

function LessonWorkspace({ lesson, refetch }: { lesson: MobileTeacherLessonDetail; refetch: () => Promise<unknown> }) {
  const { api } = useSession();
  const online = useOnline();
  const invalidate = useInvalidateStaff('OD');
  const [tab, setTab] = useState<Tab>(lesson.status === 'COMPLETED' ? 'kapanis' : 'hazirlik');
  const [form, setForm] = useState<Form>(() => formFrom(lesson));
  const [state, setState] = useState<WriteState>(null);
  const [conflict, setConflict] = useState(false);
  const stable = useStableKey<{ payload: string; version: number }>((a, b) => a.payload === b.payload && a.version === b.version);
  const mutation = useMutation({ mutationFn: (payload: LessonNotesPayload) => saveLessonNotes(api, lesson.id, payload) });
  const cancelled = lesson.status === 'CANCELLED';
  const outcomeCount = Object.keys(form.outcomes).length;

  function payload(complete: boolean): LessonNotesPayload {
    const base: LessonNotesPayload = {
      topic: form.topic.trim(),
      note: form.note.trim(),
      nextGoal: form.nextGoal.trim(),
      homework: form.homework.trim(),
      complete,
      students: lesson.students.map((student) => ({ studentId: student.id, attendance: form.students[student.id]?.attendance ?? 'PRESENT', note: (form.students[student.id]?.note ?? '').trim() })),
      outcomes: lesson.flags.learningOutcomes ? Object.entries(form.outcomes).map(([outcomeId, evidenceType]) => ({ outcomeId, evidenceType })) : [],
      outcomeSkipReason: lesson.flags.learningOutcomes && !outcomeCount ? form.skipReason : null,
    };
    if (complete && lesson.flags.quickLessonClose) {
      const body = JSON.stringify(base);
      // Aynı içerik + aynı sürüm → aynı anahtar (ağ tekrarında yeniden üretilmez).
      return { ...base, expectedVersion: lesson.closeVersion, idempotencyKey: stable.keyFor({ payload: body, version: lesson.closeVersion }) };
    }
    return base;
  }

  async function submit(complete: boolean) {
    if (mutation.isPending || !online || cancelled) return;
    if (complete && lesson.flags.learningOutcomes && !outcomeCount && !form.skipReason) {
      setState({ tone: 'warning', message: 'Kapanış için en az bir kazanım seçin veya neden belirtin.' });
      setTab('kapanis');
      return;
    }
    if (complete) {
      const absent = lesson.students.filter((student) => form.students[student.id]?.attendance === 'ABSENT').length;
      const ok = await confirmAction({
        title: lesson.status === 'COMPLETED' ? 'Kapanışı güncelle' : 'Dersi kapat',
        message: `${lesson.students.length} öğrencinin yoklaması kaydedilecek${absent ? ` (${absent} yok)` : ''}. ${lesson.status === 'COMPLETED' ? '' : 'İlk kapanışta öğrenci ve velilere ders özeti bildirimi gider.'}`,
        confirmLabel: lesson.status === 'COMPLETED' ? 'Güncelle' : 'Kapat',
      });
      if (!ok) return;
    }
    setState(null);
    try {
      const result = await mutation.mutateAsync(payload(complete));
      stable.settle();
      setConflict(false);
      setState({ tone: 'success', message: result.replayed ? 'Bu kapanış zaten kaydedilmişti.' : complete ? 'Ders kapatıldı ve kaydedildi.' : 'Taslak kaydedildi.' });
      await invalidate();
    } catch (error) {
      stable.settle(error);
      const next = writeError(error, 'Bu ders başka bir yerde (ör. web panelinde) güncellendi. Son kayıt yüklendi; girdiğiniz bilgiler korunuyor. İnceleyip bilinçli olarak tekrar kaydedin.');
      setState(next);
      if (next?.tone === 'warning' && !next.stepUp) {
        setConflict(true);
        await refetch();
      }
    }
  }

  const setStudent = (id: string, patch: Partial<{ attendance: MobileAttendance; note: string }>) =>
    setForm((current) => ({ ...current, students: { ...current.students, [id]: { attendance: current.students[id]?.attendance ?? 'PRESENT', note: current.students[id]?.note ?? '', ...patch } } }));

  return (
    <>
      <PageHeader title={lesson.title} description={`${lesson.subject} · ${lesson.groupName}`} context={<Text tone="muted" variant="meta">{`${formatLongDate(lesson.startsAt)} · ${formatTime(lesson.startsAt)}–${formatTime(lesson.endsAt)}`}</Text>} />
      <View style={staffStyles.row}>
        <StatusBadge label={lesson.status === 'COMPLETED' ? 'Tamamlandı' : cancelled ? 'İptal' : 'Planlandı'} tone={lesson.status === 'COMPLETED' ? 'success' : cancelled ? 'neutral' : 'info'} />
      </View>
      <OfflineWriteNotice online={online} />
      <WriteBanner state={state} webPath={`/panel/ogretmen/ders/${lesson.id}`} />
      {conflict ? <Button label="Sunucudaki son hâli forma yükle (değişikliklerim silinir)" variant="quiet" onPress={() => { setForm(formFrom(lesson)); setConflict(false); setState(null); }} /> : null}
      {cancelled ? <EmptyState title="Bu ders iptal edildi" body="İptal edilen derste yoklama ve kapanış yapılmaz." /> : null}
      <SegmentedTabs label="Ders bölümü" value={tab} onChange={setTab} options={[{ value: 'hazirlik', label: 'Hazırlık' }, { value: 'ders', label: 'Ders' }, { value: 'kapanis', label: 'Kapanış' }]} />

      {tab === 'hazirlik' ? (
        <>
          <Section title="Önceki ders" first>
            {lesson.previous ? (
              <>
                {lesson.previous.topic ? <Row title="Konu" subtitle={lesson.previous.topic} /> : null}
                {lesson.previous.nextGoal ? <Row title="Bu derse hedef" subtitle={lesson.previous.nextGoal} /> : null}
                {lesson.previous.homework ? <Row title="Verilen çalışma" subtitle={lesson.previous.homework} /> : null}
              </>
            ) : (
              <Text tone="secondary">Bu grupta tamamlanmış önceki ders yok.</Text>
            )}
          </Section>
          <Section title="Öğrenciler">
            <Text tone="secondary">{`${lesson.students.length} öğrenci aktif kayıtlı.`}</Text>
            {lesson.students.filter((student) => student.supportLabels.length).map((student) => (
              <Row key={student.id} title={student.name} subtitle={student.supportLabels.join(' · ')} />
            ))}
          </Section>
          {isHttps(lesson.meetingUrl) ? <Button label="Ders bağlantısını aç" variant="secondary" onPress={() => void Linking.openURL(lesson.meetingUrl!)} accessibilityHint="Sistem tarayıcısında / uygulamada açılır." /> : null}
        </>
      ) : null}

      {tab === 'ders' && !cancelled ? (
        <Section title="Yoklama" first>
          {lesson.students.length ? (
            lesson.students.map((student) => (
              <View key={student.id} style={staffStyles.card} testID={`attendance-${student.id}`}>
                <Text variant="bodyStrong">{student.name}</Text>
                <SegmentedTabs
                  label={`${student.name} yoklama`}
                  value={form.students[student.id]?.attendance ?? 'PRESENT'}
                  onChange={(value) => setStudent(student.id, { attendance: value })}
                  options={(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((value) => ({ value, label: ATTENDANCE_LABEL[value] }))}
                />
              </View>
            ))
          ) : (
            <EmptyState title="Bu grupta aktif kayıtlı öğrenci yok" />
          )}
          <Button label="Yoklamayı taslak olarak kaydet" variant="secondary" disabled={mutation.isPending || !online} loading={mutation.isPending} onPress={() => void submit(false)} testID="lesson-save-draft" />
        </Section>
      ) : null}

      {tab === 'kapanis' && !cancelled ? (
        <>
          <Section title="Ortak özet (öğrenci ve veli görür)" first>
            <TextField label="Konu" value={form.topic} maxLength={160} onChangeText={(topic) => setForm((current) => ({ ...current, topic }))} />
            <TextField label="Ders özeti" value={form.note} maxLength={2000} multiline onChangeText={(note) => setForm((current) => ({ ...current, note }))} />
            <TextField label="Sonraki hedef" value={form.nextGoal} maxLength={500} onChangeText={(nextGoal) => setForm((current) => ({ ...current, nextGoal }))} />
            <TextField label="Çalışma / ödev notu" value={form.homework} maxLength={1000} multiline onChangeText={(homework) => setForm((current) => ({ ...current, homework }))} />
          </Section>
          <Section title="Öğrenciye özel notlar">
            <Text tone="muted" variant="meta">Yalnız öğretmen görür; öğrenci ve veli ekranlarına gitmez.</Text>
            {lesson.students.map((student) => (
              <TextField key={student.id} label={`${student.name} · ${ATTENDANCE_LABEL[form.students[student.id]?.attendance ?? 'PRESENT']}`} value={form.students[student.id]?.note ?? ''} maxLength={1000} multiline onChangeText={(note) => setStudent(student.id, { note })} />
            ))}
          </Section>
          {lesson.flags.learningOutcomes ? (
            <Section title={`Kazanımlar (${outcomeCount}/3)`}>
              {[...lesson.outcomes.catalog].map((outcome) => {
                const selected = form.outcomes[outcome.id];
                return (
                  <View key={outcome.id} style={staffStyles.gap}>
                    <Row
                      title={outcome.title}
                      subtitle={`${outcome.code} · ${outcome.subject} · ${outcome.unit}`}
                      selected={Boolean(selected)}
                      disabled={!selected && outcomeCount >= 3}
                      onPress={() => setForm((current) => {
                        const next = { ...current.outcomes };
                        if (next[outcome.id]) delete next[outcome.id];
                        else next[outcome.id] = 'TAUGHT';
                        return { ...current, outcomes: next };
                      })}
                    />
                    {selected ? (
                      <SegmentedTabs label={`${outcome.code} kanıt türü`} value={selected} onChange={(value) => setForm((current) => ({ ...current, outcomes: { ...current.outcomes, [outcome.id]: value } }))} options={(Object.keys(EVIDENCE_LABEL) as Evidence[]).map((value) => ({ value, label: EVIDENCE_LABEL[value] }))} />
                    ) : null}
                  </View>
                );
              })}
              {lesson.outcomes.linked.some((link) => !lesson.outcomes.catalog.some((item) => item.id === link.outcomeId)) ? (
                <Text tone="muted" variant="meta">Bu derse bağlı ve listede olmayan kazanımlar korunur; düzenlemek için web panelini kullanın.</Text>
              ) : null}
              {!outcomeCount ? (
                <>
                  <Text variant="label" tone="secondary">Kazanım seçmiyorsanız nedeni</Text>
                  <View style={staffStyles.row}>
                    {OUTCOME_SKIP_REASONS.map((reason) => (
                      <Button key={reason} label={SKIP_LABEL[reason]} variant={form.skipReason === reason ? 'primary' : 'secondary'} onPress={() => setForm((current) => ({ ...current, skipReason: reason }))} />
                    ))}
                  </View>
                </>
              ) : null}
            </Section>
          ) : null}
          <Banner tone="info">Derse bağlı ödev taslağı oluşturma web panelinde kalır.</Banner>
          <View style={staffStyles.gap}>
            <Button label={lesson.status === 'COMPLETED' ? 'Kapanışı güncelle' : 'Dersi kapat'} disabled={mutation.isPending || !online} loading={mutation.isPending} onPress={() => void submit(true)} testID="lesson-close" />
            <Button label="Taslak olarak kaydet" variant="secondary" disabled={mutation.isPending || !online} onPress={() => void submit(false)} />
          </View>
        </>
      ) : null}
    </>
  );
}
