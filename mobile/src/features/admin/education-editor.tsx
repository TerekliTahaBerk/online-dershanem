import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { EDITOR_KINDS, educationFormBody, type EducationEditor, type EducationForm, type EducationField, type EditorKind } from '@contracts/admin-education-editor';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, Text, TextField } from '@/design/primitives';
import { fetchEducationEditor, previewEducationLessons, saveEducationForm } from '@/lib/api/admin-education-editor';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { downloadMaterialFile, userDirectoryName } from '@/lib/files/material-files';
import { useMaterialOpener } from '../od/use-material-opener';
import { adminErrorText, QueryView, usePullToRefresh } from './shared';
import { DateTimeField, useStableKey, useOnline } from '../staff/shared';
import { useStepUp } from '../auth/step-up';
import { runWithStepUp } from './step-up-retry';
import { queryKeys } from '@/lib/query/keys';
import { ApiError } from '@/lib/api/errors';
import { FilterChips, SearchPicker } from './ui';

function Field({ field, value, onChange, busy }: { field: EducationField; value: string; onChange: (value: string) => void; busy: boolean }) {
  const [search, setSearch] = useState('');
  if (field.type === 'hidden' || field.key === 'expectedVersion' || field.key === 'interactionDurationMs') return null;
  if (field.type === 'date') return <Section title={field.label}><DateTimeField label={field.label} value={value && Number.isFinite(Date.parse(value)) ? new Date(value) : new Date()} onChange={(next) => { if (!busy) onChange(next.toISOString()); }} />{!value ? <Button label={`${field.label} seçimini kullan`} onPress={() => onChange(new Date().toISOString())} disabled={busy} /> : null}{!field.required && value ? <Button variant="quiet" label="Tarihi kaldır" onPress={() => onChange('')} disabled={busy} /> : null}</Section>;
  if (field.type === 'boolean') return <FilterChips label={field.label} value={value} options={[{ value: 'true', label: `${field.label}: Evet` }, { value: 'false', label: `${field.label}: Hayır` }]} onChange={(next) => { if (!busy) onChange(next); }} />;
  if (field.type === 'choice' || field.type === 'score') return <SearchPicker label={field.label} options={field.options} value={value || null} onChange={(next) => { if (!busy) onChange(next ?? ''); }} testID={`field-${field.key}`} />;
  if (field.type === 'ids' || field.type === 'links') {
    const selected = value.split(',').filter(Boolean);
    const options = field.options.filter((option) => option.name.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')));
    return <Section title={field.label}>
      <TextField label={`${field.label} ara`} value={search} onChangeText={setSearch} editable={!busy} />
      {selected.length ? <Text>{selected.map((id) => field.options.find((option) => option.id === id)?.name ?? id).join(' · ')}</Text> : null}
      {options.slice(0, 20).map((option) => <Row key={option.id} title={`${selected.includes(option.id) ? '✓ ' : ''}${option.name}`} onPress={() => { if (!busy) onChange((selected.includes(option.id) ? selected.filter((id) => id !== option.id) : [...selected, option.id]).join(',')); }} />)}
      {options.length > 20 ? <Text>İlk 20 eşleşme gösteriliyor; aramayı daralt.</Text> : null}
    </Section>;
  }
  return <TextField label={field.label} value={value} onChangeText={onChange} editable={!busy} testID={`field-${field.key}`} multiline={field.type === 'lines' || ['description', 'feedback', 'transcript'].includes(field.key)} keyboardType={field.type === 'number' ? 'number-pad' : 'default'} autoCapitalize="sentences" />;
}

function NativeEducationForm({ form, onSaved, onFailed }: { form: EducationForm; onSaved: () => void; onFailed: (message: string) => void }) {
  const { api } = useSession();
  const user = useReadyBootstrap().user;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(form.fields.map((field) => [field.key, field.value])));
  const [error, setError] = useState<string | null>(null);
  const [confirmedPreview, setConfirmedPreview] = useState<{ digest: string; value: Awaited<ReturnType<typeof previewEducationLessons>> } | null>(null);
  const fileRef = useRef<{ uri: string; name: string; type: string } | null>(null);
  const alive = useRef(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (fileRef.current) { try { new File(fileRef.current.uri).delete(); } catch {} } }; }, []);
  const client = useQueryClient();
  const online = useOnline();
  const { requestStepUp } = useStepUp();
  const stable = useStableKey<{ body: Record<string, unknown>; file: string | null }>((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const invalidate = () => client.invalidateQueries({ queryKey: user.role === 'ADMIN' ? queryKeys.admin(user.id) : queryKeys.workspace(user.id, 'OD') });
  const mutation = useMutation({ mutationFn: async (body: Record<string, unknown>) => {
    if (!online) throw new ApiError({ kind: 'network' });
    const idempotencyKey = stable.keyFor({ body, file: fileRef.current?.uri ?? null });
    let payload: Record<string, unknown> | FormData = body;
    if (form.upload) {
      if (!fileRef.current) throw new Error('Dosya seçin.');
      const multipart = new FormData();
      Object.entries(body).forEach(([key, value]) => multipart.append(key, key === 'captionsAvailable' ? value ? 'on' : '' : String(value)));
      multipart.append('file', fileRef.current as unknown as Blob);
      payload = multipart;
    }
    const targetField = form.fields.find((field) => (body.targetType === 'STUDENT' ? ['studentId'] : ['groupId', 'versionId']).includes(field.key));
    const revision = form.revision ?? targetField?.options.find((option) => option.id === String(body[targetField.key]))?.revision ?? null;
    try {
      const result = await runWithStepUp(() => saveEducationForm(api, form, payload, revision, idempotencyKey), requestStepUp);
      stable.settle(); return result;
    } catch (cause) { stable.settle(cause); throw cause; }
  }, onSuccess: invalidate, onError: (cause) => { if (cause instanceof ApiError && cause.kind === 'conflict') void invalidate(); } });
  const preview = useMutation({ mutationFn: (body: Record<string, unknown>) => previewEducationLessons(api, body), onSuccess: (value, body) => setConfirmedPreview({ digest: JSON.stringify(body), value }) });
  const busy = mutation.isPending || preview.isPending || picking;
  function body() {
    const result = educationFormBody(form, values);
    if (Array.isArray(result.weekdays)) result.weekdays = result.weekdays.map(Number);
    if (result.mode === 'SINGLE') { delete result.totalOccurrences; delete result.weekdays; delete result.seriesEndsOn; result.repeatWeeks = 1; }
    return result;
  }
  function update(key: string, value: string) { setValues((current) => ({ ...current, [key]: value })); setConfirmedPreview(null); setError(null); }
  async function pick() {
    setPicking(true); setError(null);
    let source: File | null = null;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'video/mp4'], copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!alive.current) { try { new File(asset.uri).delete(); } catch {} return; }
      source = new File(asset.uri);
      if (!source.size || source.size > 4 * 1024 * 1024 || !['application/pdf', 'video/mp4'].includes(asset.mimeType ?? '')) { source.delete(); throw new Error('Yalnız en fazla 4 MB PDF veya MP4 seçebilirsin.'); }
      if (fileRef.current) { try { new File(fileRef.current.uri).delete(); } catch {} }
      const directory = new Directory(Paths.cache, 'od-materials', userDirectoryName(user.id), 'uploads');
      directory.create({ intermediates: true, idempotent: true });
      const destination = new File(directory, `upload-${Date.now()}.${asset.mimeType === 'application/pdf' ? 'pdf' : 'mp4'}`);
      source.copy(destination); source.delete();
      fileRef.current = { uri: destination.uri, name: asset.name, type: asset.mimeType! };
      setFileName(asset.name);
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Dosya seçilemedi.'); }
    finally { if (source) { try { source.delete(); } catch {} } if (alive.current) setPicking(false); }
  }
  function submit() {
    setError(null);
    try {
      const payload = body();
      if (form.upload && !fileRef.current) throw new Error('Dosya seçin.');
      if (form.preview && payload.mode === 'SERIES' && (!confirmedPreview || confirmedPreview.digest !== JSON.stringify(payload) || confirmedPreview.value.hasConflicts)) throw new Error('Güncel, çakışmasız seri önizlemesi gerekli.');
      Alert.alert(form.title, 'Seçili bilgileri ve işlem kapsamını kontrol ettin mi?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla', onPress: () => { mutation.mutate(payload, { onError: (cause) => onFailed(adminErrorText(cause) ?? "İşlem kaydedilemedi."), onSuccess: () => { if (fileRef.current) { try { new File(fileRef.current.uri).delete(); } catch {} fileRef.current = null; setFileName(null); } setConfirmedPreview(null); if (form.method === "POST" && !form.revision) setValues(Object.fromEntries(form.fields.map((field) => [field.key, field.value]))); onSaved(); } }); } }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Alanları kontrol et.'); }
  }
  return <Section title={form.title}>
    <View pointerEvents={busy ? 'none' : 'auto'}>{form.fields.filter((field) => !(values.targetType === 'STUDENT' && field.key === 'groupId') && !(values.targetType === 'GROUP' && ['studentId', 'teacherId'].includes(field.key))).map((field) => <Field key={field.key} field={field} value={values[field.key] ?? ''} onChange={(value) => update(field.key, value)} busy={busy} />)}</View>
    {form.upload ? <><Button mutation label={fileName ? `Dosya: ${fileName}` : 'Dosya seç'} onPress={() => { void pick(); }} disabled={busy} /><Text>PDF veya MP4 · en fazla 4 MB</Text></> : null}
    {form.preview && values.mode === 'SERIES' ? <Button label="Seriyi önizle" disabled={busy} onPress={() => { try { preview.mutate(body()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tarihi kontrol et.'); } }} /> : null}
    {confirmedPreview ? <Banner title={`${confirmedPreview.value.count} ders`} tone={confirmedPreview.value.hasConflicts ? 'critical' : 'info'}>{confirmedPreview.value.occurrences.map((item) => item.label).join('\n')}{confirmedPreview.value.conflicts.map((item) => `\n${item.occurrenceIndex + 1}. ders: ${item.message}`).join('')}</Banner> : null}
    {error || preview.error ? <Banner title="İşlem kaydedilemedi" tone="critical">{error ?? adminErrorText(preview.error)}</Banner> : null}
    <Button mutation label={form.title} testID={`education-save-${form.id}`} onPress={submit} loading={mutation.isPending} disabled={busy || (values.mode === 'SERIES' && (!confirmedPreview || confirmedPreview.value.hasConflicts))} variant={['CANCEL', 'ARCHIVE'].includes(form.id) ? 'destructive' : 'primary'} />
  </Section>;
}

function Forms({ data, onSaved, onFailed }: { data: EducationEditor; onSaved: () => void; onFailed: (message: string) => void }) {
  const [action, setAction] = useState(data.forms[0]?.id ?? '');
  const form = data.forms.find((item) => item.id === action);
  return <>
    {data.forms.length > 1 ? <FilterChips value={action} label="Eğitim işlemi" options={data.forms.map((item) => ({ value: item.id, label: item.title }))} onChange={setAction} /> : null}
    {form ? <NativeEducationForm key={`${form.id}:${form.revision ?? 'new'}`} form={form} onSaved={onSaved} onFailed={onFailed} /> : null}
  </>;
}

export default function EducationEditorScreen({ kind: fixedKind, teacherMode = false }: { kind?: EditorKind; teacherMode?: boolean }) {
  const params = useLocalSearchParams<{ kind?: string; id?: string; group?: string; lesson?: string }>();
  const router = useRouter();
  const kind: EditorKind = fixedKind ?? (EDITOR_KINDS.includes(params.kind as EditorKind) ? params.kind as EditorKind : teacherMode ? 'assignment' : 'lesson');
  const [search, setSearch] = useState(''), [page, setPage] = useState(0), [week, setWeek] = useState(0);
  const [filters, setFilters] = useState({ group: params.group ?? '', teacher: '' });
  const [notice, setNotice] = useState<string | null>(null);
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const opener = useMaterialOpener();
  const [exporting, setExporting] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const queryParams = { kind, id: params.id ?? null, search, page, week, ...filters, lesson: params.lesson ?? null };
  const query = useQuery({
    queryKey: teacherMode ? queryKeys.staffResource(bootstrap.user.id, 'OD', 'education-editor', queryParams) : queryKeys.adminResource(bootstrap.user.id, 'education-editor', queryParams),
    queryFn: ({ signal }) => fetchEducationEditor(api, { kind, id: params.id, q: search, page, ...(teacherMode ? { group: filters.group, lesson: params.lesson } : { week, ...filters }) }, signal, teacherMode),
    enabled: teacherMode ? bootstrap.user.role === 'TEACHER' && bootstrap.workspace?.activeProduct === 'OD' && ['assignment', 'material'].includes(kind) : bootstrap.user.role === 'ADMIN',
  });
  const refresh = usePullToRefresh(() => query.refetch());
  async function exportCalendar() {
    setExporting(true); setNotice(null);
    try {
      if (!api.baseUrl) throw new Error();
      const file = await downloadMaterialFile({ baseUrl: api.baseUrl, path: '/api/panel/calendar/export', headers: api.authHeaders(), userId: bootstrap.user.id, material: { id: 'institution-calendar', fileName: 'kurum-takvimi.ics', mimeType: 'text/calendar', kind: 'LINK' } });
      if (!alive.current) { try { new File(file.uri).delete(); } catch {} return; }
      if (!await Sharing.isAvailableAsync()) throw new Error();
      if (!alive.current) return;
      await Sharing.shareAsync(file.uri, { mimeType: 'text/calendar', dialogTitle: 'Kurum takvimini dışa aktar' });
    } catch { setNotice('Takvim dışa aktarılamadı. Bağlantını ve cihazın paylaşım desteğini kontrol et.'); }
    finally { setExporting(false); }
  }
  return <Screen testID={`${teacherMode ? 'teacher' : 'admin'}-education-${kind}`} refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
    {notice ? <Banner title="İşlem sonucu" tone={notice === "İşlem kaydedildi." ? "info" : "critical"}>{notice}</Banner> : null}
    {kind !== 'calendar' && (!params.id || kind === 'assignment') ? <TextField label="Kayıt veya kazanım ara" value={search} onChangeText={(value) => { setSearch(value); setPage(0); }} maxLength={120} /> : null}
    {kind === 'calendar' ? <><FilterChips value={String(week)} label="Takvim haftası" options={[{ value: String(week - 1), label: 'Önceki hafta' }, { value: String(week), label: week ? `${week > 0 ? '+' : ''}${week}. hafta` : 'Bu hafta' }, { value: String(week + 1), label: 'Sonraki hafta' }]} onChange={(value) => setWeek(Number(value))} /><Button label="Kurum takvimini dışa aktar (.ics)" loading={exporting} onPress={() => { void exportCalendar(); }} /></> : null}
    <QueryView query={query}>{(data) => <>
      <PageHeader title={data.title} description={data.description} />
      {data.file ? <><Button label="Materyali aç" onPress={() => { void opener.open(data.file!); }} loading={opener.openingId === data.file.id} />{opener.errorFor(data.file.id) ? <Banner title="Dosya açılamadı" tone="critical">{opener.errorFor(data.file.id)}</Banner> : null}</> : null}
      {kind === 'calendar' ? data.forms[0]?.fields.map((field) => <SearchPicker key={field.key} label={field.label} options={field.options} value={filters[field.key as keyof typeof filters] || null} testID={`calendar-${field.key}`} onChange={(value) => setFilters((current) => ({ ...current, [field.key]: value ?? '' }))} />) : <Forms key={`${kind}:${params.id ?? 'new'}:${data.forms.map((form) => form.revision).join()}`} data={data} onFailed={setNotice} onSaved={() => { setNotice('İşlem kaydedildi.'); void query.refetch(); }} />}
      {kind === 'version' ? <Button mutation label="Kazanım oluştur" onPress={() => router.push('/admin/education-editor?kind=outcome' as Href)} /> : null}
      <Section title={kind === 'assignment' && params.id ? 'Teslimler' : 'Kayıtlar'}>
        {data.rows.length ? data.rows.map((row) => <Row key={row.id} title={row.title} subtitle={row.detail} meta={row.at ? new Date(row.at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : null} onPress={() => router.push((teacherMode ? row.kind === 'submission' ? `/teacher/submission/${encodeURIComponent(row.id)}` : `/teacher/education-editor?kind=${row.kind}&id=${encodeURIComponent(row.id)}` : `/admin/education-editor?kind=${row.kind}&id=${encodeURIComponent(row.id)}`) as Href)} />) : <EmptyState title="Bu bölümde kayıt yok" />}
      </Section>
      {page > 0 ? <Button label="Önceki kayıtlar" variant="quiet" onPress={() => setPage((current) => current - 1)} /> : null}
      {data.hasMore ? <Button label="Sonraki kayıtlar" variant="quiet" onPress={() => setPage((current) => current + 1)} /> : null}
    </>}</QueryView>
  </Screen>;
}
