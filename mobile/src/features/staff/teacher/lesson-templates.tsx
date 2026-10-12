import type { MobileTeacherLessonDetail } from '@contracts/staff';
import { BUILT_IN_TEMPLATES } from '@contracts/lesson-templates';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Row, Section, TextField } from '@/design/primitives';
import { useSession } from '@/lib/auth/session-provider';
import { ApiError } from '@/lib/api/errors';
import { confirmAction, staffStyles, useOnline, useStableKey, WriteBanner, writeError, type WriteState } from '../shared';

type Values = { note: string; nextGoal: string; homework: string };
type Template = MobileTeacherLessonDetail['noteTemplates'][number];
type Input = { method: 'POST' | 'PATCH' | 'DELETE'; id?: string; revision?: string; body?: Values & { title: string } };

export function LessonTemplates({ templates, current, apply, refresh }: { templates: Template[]; current: Values; apply: (values: Values) => void; refresh: () => Promise<unknown> }) {
  const { api } = useSession();
  const online = useOnline();
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<Template | null>(null);
  const [state, setState] = useState<WriteState>(null);
  const stable = useStableKey<Input>((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const mutation = useMutation({ mutationFn: async (input: Input) => api.request(`/api/panel/teacher/templates${input.id ? `/${encodeURIComponent(input.id)}` : ''}`, { method: input.method, body: input.body, headers: { 'X-Od-Idempotency-Key': stable.keyFor(input), ...(input.revision ? { 'X-Od-Expected-Revision': input.revision } : {}) } }) });
  async function save(input: Input) {
    if (!online || mutation.isPending) return;
    if (input.method === 'DELETE' && !await confirmAction({ title: 'Şablonu sil', message: 'Kişisel şablon silinecek. Ders notları korunur.', confirmLabel: 'Sil', destructive: true })) return;
    setState(null);
    try {
      await mutation.mutateAsync(input); stable.settle(); setEditing(null); setTitle('');
      setState({ tone: 'success', message: input.method === 'DELETE' ? 'Şablon silindi.' : 'Şablon kaydedildi.' });
      await refresh();
    } catch (error) {
      stable.settle(error); setState(writeError(error, 'Şablon değişti. Güncel şablonu yeniden seçin; ders notlarınız korunuyor.'));
      if (error instanceof ApiError && error.kind === 'conflict') { setEditing(null); await refresh(); }
    }
  }
  const values = (t: { note: string | null; nextGoal: string | null; homework: string | null }): Values => ({ note: t.note ?? '', nextGoal: t.nextGoal ?? '', homework: t.homework ?? '' });
  return <Section title="Ders şablonları">
    {BUILT_IN_TEMPLATES.map((template) => <Row key={template.id} title={template.title} subtitle="Hazır şablonu ders özetine uygula" onPress={() => apply(template)} />)}
    {templates.map((template) => <View key={template.id} style={staffStyles.gap}>
      <Row title={template.title} subtitle="Kişisel şablonu ders özetine uygula" onPress={() => apply(values(template))} testID={`template-apply-${template.id}`} />
      <View style={staffStyles.row}>
        <Button label={`${template.title} şablonunu düzenle`} variant="quiet" onPress={() => { setEditing(template); setTitle(template.title); apply(values(template)); }} />
        <Button mutation label={`${template.title} şablonunu sil`} variant="quiet" disabled={!online || mutation.isPending} onPress={() => void save({ method: 'DELETE', id: template.id, revision: template.revision })} />
      </View>
    </View>)}
    <TextField label="Kişisel şablon adı" value={title} onChangeText={setTitle} maxLength={60} testID="template-title" />
    <Button mutation label={editing ? 'Şablonu güncelle' : 'Mevcut özeti şablon olarak kaydet'} disabled={!online || mutation.isPending || title.trim().length < 2} loading={mutation.isPending} onPress={() => void save({ method: editing ? 'PATCH' : 'POST', id: editing?.id, revision: editing?.revision, body: { title, ...current } })} testID="template-save" />
    {editing ? <Button label="Şablon düzenlemeyi bırak" variant="quiet" onPress={() => { setEditing(null); setTitle(''); }} /> : null}
    <WriteBanner state={state} />
  </Section>;
}
