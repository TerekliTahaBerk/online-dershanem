import { parseCoachPreparation, parseCoachPreparationWrite, type CoachPreparation } from '@contracts/coach-preparation';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, EmptyState, Section, SegmentedTabs, Text, TextField } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { newUuid } from '@/lib/ids';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { confirmAction, DateTimeField, OfflineWriteNotice, QueryView, staffStyles, useInvalidateStaff, useOnline, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';

type Action = 'task' | 'copy' | 'template' | 'summary' | 'record' | 'goal';
type Command = { action: Action; payload?: Record<string, unknown>; planId?: string; templateId?: string };
const actions: { value: Action; label: string }[] = [{ value: 'task', label: 'Görev ekle' }, { value: 'copy', label: 'Plan kopyala' }, { value: 'template', label: 'Şablon uygula' }, { value: 'summary', label: 'Haftalık özet' }, { value: 'record', label: 'Görüşme kaydet' }, { value: 'goal', label: 'Hedef belirle' }];
export function CoachPreparationPanel({ studentId }: { studentId: string }) {
  const path = `/api/panel/staff/coach/students/${encodeURIComponent(studentId)}/preparation`;
  const query = useStaffQuery('OK', 'coach-preparation', async (api, signal) => {
    const parsed = parseCoachPreparation(await api.request(path, { signal })); if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' }); return parsed.value;
  }, { params: { studentId }, gcTime: 0 });
  return <Section title="Koç hazırlık masası"><QueryView query={query}>{(data) => <PreparationBody key={studentId} data={data} path={path} />}</QueryView></Section>;
}
function PreparationBody({ data, path }: { data: CoachPreparation; path: string }) {
  const { api } = useSession(); const online = useOnline(); const invalidate = useInvalidateStaff('OK');
  const [action, setAction] = useState<Action | null>(null); const [state, setState] = useState<WriteState>(null);
  const pending = useRef<{ command: string; run: () => Promise<unknown> } | null>(null);
  const mutation = useMutation({ networkMode: 'always', mutationFn: async (command: Command) => {
    if (!online) throw new ApiError({ kind: 'network' });
    const fingerprint = JSON.stringify(command);
    if (!pending.current || pending.current.command !== fingerprint) {
      const key = newUuid(); const revision = data.revision;
      pending.current = { command: fingerprint, run: async () => {
        const parsed = parseCoachPreparationWrite(await api.request(path, { method: 'POST', body: command, headers: { 'X-Od-Idempotency-Key': key, 'X-Od-Expected-Revision': revision } }));
        if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' }); return parsed.value;
      } };
    }
    return pending.current.run();
  } });
  async function submit(command: Command) {
    if (!online || mutation.isPending) return;
    if ((command.action === 'template' || command.action === 'summary' && command.payload?.publish || command.action === 'record') && !await confirmAction({ title: command.action === 'template' ? 'Şablonu uygula' : command.action === 'record' ? 'Görüşmeyi tamamla' : 'Özeti yayımla', message: command.action === 'template' ? 'Bu haftanın taslak görevleri seçtiğiniz şablonla değişecek. Yayındaki plana uygulanamaz.' : command.action === 'record' ? 'Paylaşılan not öğrenci ve veliye açıktır. Özel not ayrı saklanır. İlk planlı görüşme tamamlanır; sonraki görüşme oluşturulabilir.' : 'Öğrenci ve veli yalnız kendilerine ayrılan metni görecek.', confirmLabel: 'Onayla' })) return;
    setState(null);
    try { await mutation.mutateAsync(command); pending.current = null; setAction(null); setState({ tone: 'success', message: 'İşlem kaydedildi ✅' }); await invalidate(); }
    catch (error) { if (!(error instanceof ApiError) || !error.transient && error.kind !== 'invalid_response') pending.current = null; setState(writeError(error, 'Hazırlık verileri değişti. Güncel veriyi kontrol edin.')); if (error instanceof ApiError && error.kind === 'conflict') await invalidate(); }
  }
  return <><OfflineWriteNotice online={online} /><WriteBanner state={state} />
    {data.nextSession && <Text>Sıradaki görüşme: {formatShortDateTime(data.nextSession.scheduledAt)}</Text>}
    {data.goals.map((g) => <Text key={g.id}>{g.subjectName || g.kind}: {g.targetValue}{g.nearTermNote ? ` · ${g.nearTermNote}` : ''}</Text>)}
    <View style={staffStyles.gap}>{actions.map((item) => <Button key={item.value} label={item.label} variant="secondary" disabled={!online || mutation.isPending} onPress={() => setAction(item.value)} testID={`prep-open-${item.value}`} />)}</View>
    {action && <PreparationForm key={action} action={action} data={data} disabled={!online || mutation.isPending} submit={(command) => void submit(command)} close={() => setAction(null)} />}
  </>;
}
function PreparationForm({ action, data, disabled, submit, close }: { action: Action; data: CoachPreparation; disabled: boolean; submit: (c: Command) => void; close: () => void }) {
  const [title, setTitle] = useState(''); const [subject, setSubject] = useState(data.subjects[0] || '');
  const [taskKind, setTaskKind] = useState('QUESTION_PRACTICE'); const [duration, setDuration] = useState('45'); const [target, setTarget] = useState('40');
  const [date, setDate] = useState(new Date(data.weekStart)); const [nextAt, setNextAt] = useState(new Date(Date.now() + 7 * 86400000));
  const [scheduleNext, setScheduleNext] = useState('cadence');
  const [planId, setPlanId] = useState(data.plans[0]?.id || ''); const [templateId, setTemplateId] = useState(data.templates[0]?.id || '');
  const [kind, setKind] = useState<'PLAN_COMPLETION' | 'SUBJECT_NET'>('PLAN_COMPLETION'); const [goal, setGoal] = useState('90'); const [near, setNear] = useState('');
  const [focus, setFocus] = useState(''); const [shared, setShared] = useState(''); const [privateNote, setPrivateNote] = useState('');
  const [strengths, setStrengths] = useState(data.summary?.strengths || ''); const [areas, setAreas] = useState(data.summary?.focusAreas || ''); const [next, setNext] = useState(data.summary?.nextWeekFocus || '');
  const [studentText, setStudentText] = useState(data.summary?.studentVisibleText || ''); const [parentText, setParentText] = useState(data.summary?.parentVisibleText || '');
  const field = (label: string, value: string, set: (s: string) => void, maxLength: number) => <TextField label={label} value={value} onChangeText={set} maxLength={maxLength} />;
  const number = (value: string) => value.trim() ? Number(value.replace(',', '.')) : NaN;
  const validTask = title.trim().length >= 2 && Number.isInteger(number(duration)) && number(duration) >= 5 && number(duration) <= 480 && number(target) >= 0 && number(target) <= 5000;
  const validGoal = Number.isFinite(number(goal)) && number(goal) >= 0 && (kind !== 'PLAN_COMPLETION' || number(goal) <= 100) && (kind !== 'SUBJECT_NET' || Boolean(subject));
  return <View style={staffStyles.card}>
    <Text variant="label">{actions.find((a) => a.value === action)?.label}</Text>
    {action === 'task' && <>{field('Görev başlığı', title, setTitle, 160)}{field('Ders (isteğe bağlı)', subject, setSubject, 80)}
      <SegmentedTabs label="Görev türü" value={taskKind} onChange={setTaskKind} options={['QUESTION_PRACTICE', 'TOPIC_STUDY', 'REVIEW', 'VIDEO', 'MATERIAL_READ', 'CLASSIC_ASSIGNMENT', 'MOCK_EXAM', 'ERROR_ANALYSIS', 'PERSONAL_GOAL', 'CUSTOM'].map((value, i) => ({ value, label: ['Soru', 'Konu', 'Tekrar', 'Video', 'Materyal', 'Ödev', 'Deneme', 'Yanlış analizi', 'Hedef', 'Özel'][i] }))} />
      <DateTimeField label="Görev günü" mode="date" value={date} minimumDate={new Date(data.weekStart)} maximumDate={new Date(new Date(data.weekStart).getTime() + 6 * 86400000)} onChange={setDate} />
      {field('Süre (dakika)', duration, setDuration, 3)}{field('Soru hedefi', target, setTarget, 4)}
      <Button mutation label="Görevi ekle" disabled={disabled || !validTask} testID="prep-save-task" onPress={() => submit({ action, payload: { title: title.trim(), subject: subject.trim() || null, taskKind, scheduledFor: date.toISOString(), durationMinutes: number(duration), targetType: ['QUESTION_PRACTICE', 'ERROR_ANALYSIS'].includes(taskKind) ? 'QUESTIONS' : 'NONE', targetValue: ['QUESTION_PRACTICE', 'ERROR_ANALYSIS'].includes(taskKind) ? number(target) : null } })} /></>}
    {action === 'copy' && <>{data.plans.length ? <><SegmentedTabs label="Kaynak plan" value={planId} onChange={setPlanId} options={data.plans.map((p) => ({ value: p.id, label: `${formatShortDateTime(p.weekStart)} · ${p.taskCount} görev` }))} /><Text tone="muted">Eksik görevler kaynak planın bir sonraki haftasına taslak olarak taşınır. Hedef haftada plan varsa işlem reddedilir.</Text><Button mutation label="Eksikleri kopyala" disabled={disabled || !planId} onPress={() => submit({ action, planId, payload: { carryOverIncomplete: true } })} testID="prep-save-copy" /></> : <EmptyState title="Kopyalanacak plan yok" />}</>}
    {action === 'template' && <>{data.templates.length ? <><SegmentedTabs label="Plan şablonu" value={templateId} onChange={setTemplateId} options={data.templates.map((t) => ({ value: t.id, label: t.title }))} /><Button mutation label="Şablonu uygula" disabled={disabled || !templateId} onPress={() => submit({ action, templateId })} testID="prep-save-template" /></> : <EmptyState title="Kullanılabilir şablon yok" />}</>}
    {action === 'summary' && <>{field('Güçlü yönler (yalnız personel)', strengths, setStrengths, 500)}{field('Destek alanları (yalnız personel)', areas, setAreas, 500)}{field('Gelecek hafta odağı (yalnız personel)', next, setNext, 500)}{field('Öğrencinin göreceği metin', studentText, setStudentText, 1000)}{field('Velinin göreceği metin', parentText, setParentText, 1000)}
      {data.summary?.status === 'PUBLISHED' && <Text>Bu özet yayında; kaydetmek görünür metinleri de günceller.</Text>}
      {[false, true].map((publish) => <Button key={String(publish)} mutation label={publish ? 'Özeti yayımla' : 'Özeti kaydet'} disabled={disabled} onPress={() => submit({ action, payload: { strengths: strengths || null, focusAreas: areas || null, nextWeekFocus: next || null, studentVisibleText: studentText || null, parentVisibleText: parentText || null, publish: publish || data.summary?.status === 'PUBLISHED' } })} testID={`prep-save-summary-${publish}`} />)}</>}
    {action === 'record' && <>{field('Görüşme odağı', focus, setFocus, 300)}{field('Öğrenci ve veliye açık not', shared, setShared, 4000)}{field('Özel koç notu', privateNote, setPrivateNote, 4000)}<Text tone="muted">Özel not öğrenci ve veliye gösterilmez.</Text><SegmentedTabs label="Sonraki görüşme" value={scheduleNext} onChange={setScheduleNext} options={[{ value: 'cadence', label: 'Atama sıklığı' }, { value: 'date', label: 'Tarih seç' }]} />{scheduleNext === 'date' && <DateTimeField label="Sonraki görüşme" value={nextAt} minimumDate={new Date()} onChange={setNextAt} />}<Button mutation label="Görüşmeyi kaydet" disabled={disabled || scheduleNext === 'date' && nextAt.getTime() <= Date.now()} onPress={() => submit({ action, payload: { focus, sharedNote: shared, privateNote, ...(scheduleNext === 'date' ? { nextAt: nextAt.toISOString() } : {}) } })} testID="prep-save-record" /></>}
    {action === 'goal' && <><SegmentedTabs label="Hedef türü" value={kind} onChange={setKind} options={[{ value: 'PLAN_COMPLETION', label: 'Plan tamamlama (%)' }, { value: 'SUBJECT_NET', label: 'Ders neti' }]} />{kind === 'SUBJECT_NET' && (data.subjects.length ? <SegmentedTabs label="Deneme dersi" value={subject} onChange={setSubject} options={data.subjects.map((s) => ({ value: s, label: s }))} /> : <EmptyState title="Önce bir dış deneme kaydı gerekli" />)}{field('Hedef değer', goal, setGoal, 8)}{field('Yakın hedef notu', near, setNear, 300)}<Button mutation label="Hedefi kaydet" disabled={disabled || !validGoal} onPress={() => submit({ action, payload: { studentId: data.studentId, kind, ...(kind === 'SUBJECT_NET' ? { subjectName: subject } : {}), targetValue: number(goal), nearTermNote: near } })} testID="prep-save-goal" /></>}
    <Button label="Vazgeç" variant="secondary" disabled={disabled} onPress={close} />
  </View>;
}
