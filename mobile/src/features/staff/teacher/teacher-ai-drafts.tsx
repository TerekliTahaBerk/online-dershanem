import { parseTeacherAiDrafts, parseTeacherAiWrite, type TeacherAiDraft, type TeacherAiDrafts } from '@contracts/teacher-ai-drafts';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Share, View } from 'react-native';
import { Button, EmptyState, PageHeader, Row, Screen, Section, SegmentedTabs, StatusBadge, Text, TextField } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { newUuid } from '@/lib/ids';
import { confirmAction, OfflineWriteNotice, QueryView, staffStyles, useInvalidateStaff, useOnline, usePullToRefresh, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';
const path = '/api/panel/staff/teacher/ai-drafts';
type Command = { operation: 'create'; lessonId: string; taskType: 'ASSIGNMENT' | 'MINI_CHECK' } | { operation: 'review'; id: string; input: { action: 'APPROVE' | 'REJECT' | 'FLAG'; expectedVersion: number; content?: { title: string; body: string; checkPrompt: string; successCriteria: string[] }; flagReason?: string } };
const statusLabel = { DRAFT: 'İnceleme bekliyor', APPROVED: 'Öğretmen onaylı', REJECTED: 'Reddedildi', FLAGGED: 'Hatalı işaretlendi' };
export default function TeacherAiDraftsScreen() {
  const query = useStaffQuery('OD', 'teacher-ai-drafts', async (api, signal) => { const parsed = parseTeacherAiDrafts(await api.request(path, { signal })); if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' }); return parsed.value; });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="teacher-ai-drafts" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
    <PageHeader title="AI taslak yardımcısı" description="Ödev veya mini kontrol taslağı hazırla; kaynakları ve içeriği incele. Model yanlış olabilir. Onaylamak içeriği öğrenciye veya veliye yayımlamaz." />
    <QueryView query={query}>{(data) => <DraftBody data={data} />}</QueryView>
  </Screen>;
}
function DraftBody({ data }: { data: TeacherAiDrafts }) {
  const { api } = useSession(); const online = useOnline(); const invalidate = useInvalidateStaff('OD');
  const [lessonId, setLessonId] = useState(data.lessons[0]?.id || ''); const [taskType, setTaskType] = useState<'ASSIGNMENT' | 'MINI_CHECK'>('ASSIGNMENT');
  const [selected, setSelected] = useState<string | null>(null); const [state, setState] = useState<WriteState>(null);
  const pending = useRef<{ command: string; run: () => Promise<string> } | null>(null);
  const mutation = useMutation({ networkMode: 'always', mutationFn: async ({ command, revision }: { command: Command; revision: string }) => {
    if (!online) throw new ApiError({ kind: 'network' }); const fingerprint = JSON.stringify(command);
    if (!pending.current || pending.current.command !== fingerprint) { const key = newUuid(); pending.current = { command: fingerprint, run: async () => {
      const parsed = parseTeacherAiWrite(await api.request(path, { method: 'POST', body: command, headers: { 'X-Od-Idempotency-Key': key, 'X-Od-Expected-Revision': revision } })); if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' }); return parsed.value.id;
    } }; }
    return pending.current.run();
  } });
  async function submit(command: Command, revision: string) {
    if (!online || mutation.isPending) return;
    if (command.operation === 'review' && command.input.action === 'APPROVE' && !await confirmAction({ title: 'İnsan onayını kaydet', message: 'Kaynakları, doğruluğu ve ölçütleri kontrol ettiniz mi? Bu onay yalnız taslağa kaydedilir; öğrenciye veya veliye yayın yapılmaz.', confirmLabel: 'Onayla' })) return;
    setState(null);
    try { const id = await mutation.mutateAsync({ command, revision }); pending.current = null; await invalidate(); setSelected(id); setState({ tone: 'success', message: command.operation === 'create' ? 'Taslak hazır. Kaynakları ve içeriği inceleyin.' : command.input.action === 'APPROVE' ? 'İnsan onayı kaydedildi. İçerik otomatik yayınlanmadı.' : command.input.action === 'FLAG' ? 'Hata işaretlendi; taslak kullanılmayacak.' : 'Taslak reddedildi.' }); }
    catch (error) { if (!(error instanceof ApiError) || !error.transient && error.kind !== 'invalid_response') pending.current = null; setState(writeError(error, 'Kaynak veya taslak değişti. Liste yenilendi; tekrar inceleyin.')); if (error instanceof ApiError && error.kind === 'conflict') { setSelected(null); await invalidate(); } }
  }
  const lesson = data.lessons.find((l) => l.id === lessonId); const draft = data.drafts.find((d) => d.id === selected);
  return <><OfflineWriteNotice online={online} /><WriteBanner state={state} />
    <Section title="Yeni taslak">
      {data.lessons.length ? <><SegmentedTabs label="Ders" value={lessonId} onChange={setLessonId} options={data.lessons.map((l) => ({ value: l.id, label: `${l.title} · ${l.groupName}` }))} />
        <SegmentedTabs label="Taslak türü" value={taskType} onChange={setTaskType} options={[{ value: 'ASSIGNMENT', label: 'Ödev' }, { value: 'MINI_CHECK', label: 'Mini kontrol' }]} />
        <Text tone="muted">Yalnız ortak ders notları ve kazanımlar kaynak olur. Öğrenciye özel notlar kullanılmaz.</Text>
        <Button mutation label="Kaynaklı taslak hazırla" disabled={!online || !lesson || mutation.isPending} loading={mutation.isPending} onPress={() => lesson && void submit({ operation: 'create', lessonId, taskType }, lesson.revision)} testID="ai-create" /></> : <EmptyState title="Taslak hazırlanacak ders yok" body="Son 30 gündeki aktif gruplarına ait dersler görünür." />}
    </Section>
    <Section title="Taslaklar">{!data.drafts.length && <EmptyState title="Henüz taslak yok" />}{data.drafts.map((d) => <Row key={d.id} title={d.originalContent.title} subtitle={`${d.lessonTitle} · ${statusLabel[d.status]}`} onPress={() => setSelected(d.id)} testID={`ai-open-${d.id}`} />)}</Section>
    {draft && <DraftEditor key={`${draft.id}:${draft.version}`} draft={draft} disabled={!online || mutation.isPending} submit={(input) => void submit({ operation: 'review', id: draft.id, input }, draft.revision)} />}
  </>;
}
function DraftEditor({ draft, disabled, submit }: { draft: TeacherAiDraft; disabled: boolean; submit: (input: Extract<Command, { operation: 'review' }>['input']) => void }) {
  const shown = draft.reviewedContent || draft.originalContent;
  const [title, setTitle] = useState(shown.title); const [body, setBody] = useState(shown.body); const [checkPrompt, setCheckPrompt] = useState(shown.checkPrompt); const [criteria, setCriteria] = useState(shown.successCriteria);
  const [flagReason, setFlagReason] = useState('FACTUAL_ERROR');
  const editable = draft.status === 'DRAFT'; const valid = title.trim().length >= 3 && body.trim().length >= 10 && checkPrompt.trim().length >= 5 && criteria.length >= 2 && criteria.length <= 3 && criteria.every((c) => c.trim().length >= 3);
  const modelUsed = draft.provider === 'OPENAI' || draft.provider === 'GEMINI';
  return <Section title="Taslak incelemesi"><StatusBadge label={statusLabel[draft.status]} />
    <Text tone="muted">{modelUsed ? `Model taslağı · ${draft.modelName || draft.provider}` : draft.provider === 'STUB' ? 'Güvenli test sağlayıcısı' : 'Kaynaklı kural taslağı · Dış model kullanılmadı'}</Text>
    {draft.fallbackReason && <Text tone="secondary">Model çağrısı yerine güvenli yedek içerik gösteriliyor. Kaynakları yine kontrol edin.</Text>}
    <View style={staffStyles.gap}>
      <TextField label="Başlık" value={title} onChangeText={setTitle} maxLength={140} editable={editable && !disabled} testID="ai-title" />
      <TextField label="Yönerge" value={body} onChangeText={setBody} maxLength={1200} multiline editable={editable && !disabled} testID="ai-body" />
      <TextField label="Kısa kontrol sorusu" value={checkPrompt} onChangeText={setCheckPrompt} maxLength={300} multiline editable={editable && !disabled} />
      {criteria.map((c, i) => <TextField key={i} label={`Başarı ölçütü ${i + 1}`} value={c} onChangeText={(value) => setCriteria((items) => items.map((item, index) => index === i ? value : item))} maxLength={160} editable={editable && !disabled} />)}
    </View>
    <Text variant="label">Kaynaklar</Text>{draft.sourceRefs.map((s) => <Text key={s.id}>{s.label}{shown.citations.includes(s.id) ? ' · taslakta kullanıldı' : ''}</Text>)}
    {editable && <><Button mutation label="Düzenlemeyi onayla" disabled={disabled || !valid} onPress={() => submit({ action: 'APPROVE', expectedVersion: draft.version, content: { title: title.trim(), body: body.trim(), checkPrompt: checkPrompt.trim(), successCriteria: criteria.map((c) => c.trim()) } })} testID="ai-approve" />
      <Button mutation label="Taslağı reddet" variant="secondary" disabled={disabled} onPress={() => submit({ action: 'REJECT', expectedVersion: draft.version })} testID="ai-reject" />
      <SegmentedTabs label="Hata nedeni" value={flagReason} onChange={setFlagReason} options={[{ value: 'FACTUAL_ERROR', label: 'Doğruluk hatası' }, { value: 'UNSUPPORTED_CITATION', label: 'Desteksiz kaynak' }, { value: 'UNSAFE_TONE', label: 'Uygunsuz dil' }, { value: 'PRIVACY', label: 'Gizlilik' }, { value: 'OTHER', label: 'Diğer' }]} />
      <Button mutation label="Hatayı işaretle" variant="secondary" disabled={disabled} onPress={() => submit({ action: 'FLAG', expectedVersion: draft.version, flagReason })} testID="ai-flag" /></>}
    <Button label="Onaylı taslak metnini paylaş" variant="secondary" disabled={draft.status !== "APPROVED"} onPress={() => void Share.share({ message: `${shown.title}\n\n${shown.body}\n\n${shown.checkPrompt}\n${shown.successCriteria.join('\n')}` })} />
  </Section>;
}
