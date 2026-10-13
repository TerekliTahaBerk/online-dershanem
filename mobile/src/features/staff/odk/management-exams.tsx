import { router, type Href } from 'expo-router';
import { parseOdkManagementExams, parseOdkExamCreated, type OdkManagementExams, type OdkExamCreateCommand } from '@contracts/odk-management-exams';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button, EmptyState, PageHeader, Row, Screen, Section, SegmentedTabs, Text, TextField } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { newUuid } from '@/lib/ids';
import { OfflineWriteNotice, QueryView, useOnline, usePullToRefresh, WriteBanner, writeError, type WriteState } from '../shared';
import { useOdkManagementQuery } from './management-shared';
const path = '/api/panel/odk/management/exams';
const statusNames: Record<string, string> = { DRAFT: 'Taslak', READY: 'Hazır', SCHEDULED: 'Planlandı', LIVE: 'Canlı', ENDED: 'Bitti', SCORED: 'Puanlandı', RELEASED: 'Yayınlandı', ARCHIVED: 'Arşiv' };
export function odkSlug(value: string) { return value.toLowerCase().replaceAll('ı', 'i').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
export default function OdkManagementExamsScreen() {
  const [filters, setFilters] = useState({ q: '', aile: '', durum: '', gorunum: '', page: '1' }); const [search, setSearch] = useState('');
  const queryString = new URLSearchParams(filters).toString();
  const query = useOdkManagementQuery(`exams:${queryString}`, async (api, signal) => { const parsed = parseOdkManagementExams(await api.request(`${path}?${queryString}`, { signal })); if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' }); return parsed.value; });
  const refresh = usePullToRefresh(() => query.refetch());
  function filter(key: 'aile' | 'durum' | 'gorunum' | 'q', value: string) { setFilters((f) => ({ ...f, [key]: value, ...(key === 'gorunum' ? { durum: '' } : {}), page: '1' })); }
  return <Screen testID="odk-management-exams" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><PageHeader title="Denemeler" description="Denemeleri filtrele; yeni sınav ve seri oluştur." />
    <Section title="Arama" first><TextField label="Deneme adı ara" value={search} onChangeText={setSearch} maxLength={80} /><Button label="Ara" onPress={() => filter('q', search)} /></Section>
    <QueryView query={query}>{(data) => <>
      <Section title="Görünüm"><SegmentedTabs label="Deneme görünümleri" value={data.view} onChange={(v) => filter('gorunum', v)} options={data.views.map((v) => ({ value: v.id, label: `${v.label} (${v.count})` }))} />
        <SegmentedTabs label="Sınav ailesi filtresi" value={filters.aile} onChange={(v) => filter('aile', v)} options={[{ value: '', label: 'Tüm aileler' }, ...data.families.map((f) => ({ value: f.code, label: f.name }))]} />
        <SegmentedTabs label="Durum filtresi" value={filters.durum} onChange={(v) => filter('durum', v)} options={[{ value: '', label: 'Tüm durumlar' }, ...Object.entries(statusNames).map(([value, label]) => ({ value, label }))]} />
      </Section>
      <Section title={`${data.total} deneme`}>{!data.rows.length && <EmptyState title="Bu görünümde deneme yok" />}{data.rows.map((e) => <Row key={e.id} title={e.title} subtitle={`${e.familyCode} · ${statusNames[e.status] || e.status} · ${e.seriesTitle || 'Serisiz'}\n${e.startsAt ? formatShortDateTime(e.startsAt) : 'Planlanmadı'} – ${e.endsAt ? formatShortDateTime(e.endsAt) : '—'}\n${e.assigned} atama · ${e.attempts} giriş · ${e.submitted} teslim${e.blockingIssues != null ? ` · ${e.blockingIssues} hazırlık engeli` : ''}`} onPress={() => router.push(`/odk/manage/${encodeURIComponent(e.id)}` as Href)} testID={`odk-exam-row-${e.id}`} />)}
        <Text>Sayfa {data.page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</Text>
        <Button label="Önceki sayfa" disabled={data.page <= 1} onPress={() => setFilters((f) => ({ ...f, page: String(data.page - 1) }))} />
        <Button label="Sonraki sayfa" disabled={data.page * data.pageSize >= data.total} onPress={() => setFilters((f) => ({ ...f, page: String(data.page + 1) }))} />
      </Section>
      {data.canCreate && <CreateForm data={data} />}
    </>}</QueryView>
  </Screen>;
}
function CreateForm({ data }: { data: OdkManagementExams }) {
  const { api } = useSession(); const online = useOnline(); const client = useQueryClient();
  const [operation, setOperation] = useState<'exam' | 'series'>('exam'); const [familyCode, setFamily] = useState(data.families.find((f) => f.code === 'TYT')?.code || data.families[0]?.code || '');
  const [title, setTitle] = useState(''); const [slug, setSlug] = useState(''); const [customSlug, setCustomSlug] = useState(false); const [seriesId, setSeries] = useState('');
  const [mode, setMode] = useState<'FULL_TEMPLATE' | 'MATH_ONLY'>('FULL_TEMPLATE'); const [duration, setDuration] = useState(''); const [questionCount, setQuestionCount] = useState('40');
  const [description, setDescription] = useState(''); const [internalCode, setInternalCode] = useState(''); const [year, setYear] = useState(String(new Date().getFullYear())); const [publisher, setPublisher] = useState(''); const [classLevel, setClassLevel] = useState('');
  const [state, setState] = useState<WriteState>(null); const pending = useRef<{ fingerprint: string; run: () => Promise<string> } | null>(null);
  const family = data.families.find((f) => f.code === familyCode); const template = family?.legacy ? data.templates.find((t) => t.familyCode === familyCode && t.mode === mode) : undefined;
  const mutation = useMutation({ networkMode: 'always', mutationFn: async (command: OdkExamCreateCommand) => {
    if (!online) throw new ApiError({ kind: 'network' }); const fingerprint = JSON.stringify(command);
    if (!pending.current || pending.current.fingerprint !== fingerprint) { const key = newUuid(); const revision = data.revision; pending.current = { fingerprint, run: async () => { const result = parseOdkExamCreated(await api.request(path, { method: 'POST', body: command, headers: { 'X-Od-Idempotency-Key': key, 'X-Od-Expected-Revision': revision } })); if (!result.ok) throw new ApiError({ kind: 'invalid_response' }); return result.value.id; } }; }
    return pending.current.run();
  } });
  const valid = Boolean(family) && title.trim().length >= 3 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 120 && Number.isInteger(Number(year)) && Number(year) >= 2020 && Number(year) <= 2100 && (operation === 'series' || !duration || Number.isInteger(Number(duration)) && Number(duration) >= 5 && Number(duration) <= 360) && (operation === 'series' || mode !== 'MATH_ONLY' || Number.isInteger(Number(questionCount)) && Number(questionCount) >= 1 && Number(questionCount) <= 200);
  async function submit() {
    if (!valid || !online || mutation.isPending) return;
    const command: OdkExamCreateCommand = operation === 'series' ? { operation, input: { examFamilyCode: familyCode, title: title.trim(), slug, academicYear: Number(year), classLevel } } : { operation, input: { examFamilyCode: familyCode, title: title.trim(), slug, seriesId: seriesId || null, structureMode: mode, templateCode: template?.code || null, ...(duration ? { durationMinutes: Number(duration) } : {}), ...(mode === 'MATH_ONLY' ? { questionCount: Number(questionCount) } : {}), description, internalCode, academicYear: Number(year), publisher } };
    setState(null);
    try { const id = await mutation.mutateAsync(command); pending.current = null; await client.invalidateQueries({ queryKey: ['user'] }); if (operation === 'series') { setSeries(id); setOperation('exam'); } setTitle(''); setSlug(''); setCustomSlug(false); setState({ tone: 'success', message: command.operation === 'series' ? 'Seri oluşturuldu ve seçildi. Yeni deneme bilgilerini girin.' : 'Deneme taslağı oluşturuldu. Listede Hazırlıkta görünümünü açabilirsiniz.' }); }
    catch (error) { if (!(error instanceof ApiError) || !error.transient && error.kind !== 'invalid_response') pending.current = null; setState(writeError(error, 'Katalog veya adres değişti. Güncel seçimi kontrol edin.')); if (error instanceof ApiError && error.kind === 'conflict') await client.invalidateQueries({ queryKey: ['user'] }); }
  }
  return <Section title="Yeni deneme / seri"><OfflineWriteNotice online={online} /><WriteBanner state={state} />
    <SegmentedTabs label="Oluşturma türü" value={operation} onChange={setOperation} options={[{ value: 'exam', label: 'Yeni deneme' }, { value: 'series', label: 'Yeni seri' }]} />
    <SegmentedTabs label="Sınav ailesi" value={familyCode} onChange={(v) => { setFamily(v); setSeries(''); setMode('FULL_TEMPLATE'); setDuration(''); setQuestionCount(String(data.templates.find((t) => t.familyCode === v && t.mode === 'MATH_ONLY')?.questionCount || 40)); }} options={data.families.map((f) => ({ value: f.code, label: f.name }))} />
    <TextField label="Başlık" value={title} onChangeText={(v) => { setTitle(v); if (!customSlug) setSlug(odkSlug(v)); }} maxLength={operation === 'series' ? 140 : 180} testID="odk-create-title" />
    <TextField label="Adres" value={slug} onChangeText={(v) => { setSlug(v); setCustomSlug(true); }} autoCapitalize="none" maxLength={120} testID="odk-create-slug" />
    <TextField label="Akademik yıl" value={year} onChangeText={setYear} keyboardType="numeric" maxLength={4} />
    {operation === 'series' ? <TextField label="Sınıf düzeyi (isteğe bağlı)" value={classLevel} onChangeText={setClassLevel} maxLength={40} /> : <>
      <SegmentedTabs label="Seri" value={seriesId} onChange={setSeries} options={[{ value: '', label: 'Serisiz' }, ...data.series.filter((s) => s.familyCode === familyCode).map((s) => ({ value: s.id, label: s.title }))]} />
      {family?.legacy && <SegmentedTabs label="Sınav yapısı" value={mode} onChange={(v) => { setMode(v); setDuration(''); setQuestionCount(String(data.templates.find((t) => t.familyCode === familyCode && t.mode === v)?.questionCount || 40)); }} options={[{ value: 'FULL_TEMPLATE', label: 'Tam deneme' }, { value: 'MATH_ONLY', label: 'Yalnız matematik' }]} />}
      <Text>{template ? `${template.label} · ${mode === 'MATH_ONLY' ? questionCount : template.questionCount} soru · ${template.durationMinutes} dk\n${template.sections.map((s) => `${s.title}: ${s.questionCount}`).join(' · ')}` : 'Katalog müfredatındaki bölümler kullanılır. Varsayılan süre 60 dakikadır.'}</Text>
      <TextField label="Süre (dakika, isteğe bağlı)" value={duration} onChangeText={setDuration} keyboardType="numeric" maxLength={3} />
      {mode === 'MATH_ONLY' && <TextField label="Soru sayısı" value={questionCount} onChangeText={setQuestionCount} keyboardType="numeric" maxLength={3} />}
      <TextField label="Açıklama (isteğe bağlı)" value={description} onChangeText={setDescription} multiline maxLength={2000} />
      <TextField label="İç kod (isteğe bağlı)" value={internalCode} onChangeText={setInternalCode} maxLength={64} />
      <TextField label="Yayıncı (isteğe bağlı)" value={publisher} onChangeText={setPublisher} maxLength={120} />
    </>}
    <Button mutation label={operation === 'series' ? 'Seriyi oluştur' : 'Deneme taslağı oluştur'} disabled={!valid || !online || mutation.isPending} loading={mutation.isPending} onPress={() => void submit()} testID="odk-create-submit" />
  </Section>;
}
