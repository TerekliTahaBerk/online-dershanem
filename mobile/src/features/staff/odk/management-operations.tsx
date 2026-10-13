import { parseOdkIntegrityReviewWrite, parseOdkOpsAttempt, parseOdkOpsConsole, type OdkIntegrityAction, type OdkOpsConsole } from '@contracts/odk-management-ops';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { FilterChips, MetricGrid, MetricTile } from '@/features/admin/ui';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { confirmAction, OfflineWriteNotice, QueryView, useOnline, usePullToRefresh, useStableKey, WriteBanner, writeError, type WriteState } from '../shared';
import { useOdkManagementQuery } from './management-shared';

/**
 * K04 · CANLI OPERASYON — web `app/panel/odk/yonetim/operasyon` (aynı
 * yükleyici ve süzgeçler). 15 sn'de bir yenilenir (kapatılabilir). Kayda
 * dokununca son 60 olay ve — `odk:integrity:review` varsa — inceleme eylemleri
 * açılır. Kalp atışı tarayıcı bağlantısıdır; Meet katılımının kanıtı değildir.
 */
const path = '/api/panel/odk/management/operations';
const REFRESH_MS = 15_000;
const TIME = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Istanbul' });
type Filters = { deneme?: string; gorunum: OdkOpsConsole['view']; durum: OdkOpsConsole['filters']['status']; butunluk: OdkOpsConsole['filters']['integrity']; kalp: OdkOpsConsole['filters']['heartbeat']; q: string };
const VIEWS = [{ value: 'all', label: 'Tüm planlı ve canlı' }, { value: 'live', label: 'Yalnız canlı' }, { value: 'attention', label: 'Bağlantısı geciken' }] as const;
const STATUS = [{ value: 'tumu', label: 'Tüm durumlar' }, { value: 'devam', label: 'Devam ediyor' }, { value: 'kopuk', label: 'Bağlantı koptu' }, { value: 'teslim', label: 'Teslim' }, { value: 'inceleme', label: 'İnceleme' }] as const;
const INTEGRITY = [{ value: 'tumu', label: 'Tüm düzeyler' }, { value: 'REVIEW', label: 'İncelenmeli ve üstü' }, { value: 'HIGH', label: 'Yüksek sinyal' }] as const;
const HEARTBEAT = [{ value: 'tumu', label: 'Tüm sinyaller' }, { value: '2', label: "2 dk'dan eski" }, { value: '5', label: "5 dk'dan eski" }, { value: '10', label: "10 dk'dan eski" }] as const;

/** Otomatik yenileme aralığı: kapalıyken veya kayıt paneli açıkken (inceleme sırasında liste kaymasın) durur. */
export function operationsRefreshInterval(auto: boolean, sheetOpen: boolean): number | false {
  return auto && !sheetOpen ? REFRESH_MS : false;
}

function queryString(filters: Filters) {
  const search = new URLSearchParams();
  if (filters.deneme) search.set('deneme', filters.deneme);
  if (filters.gorunum !== 'all') search.set('gorunum', filters.gorunum);
  if (filters.durum !== 'tumu') search.set('durum', filters.durum);
  if (filters.butunluk !== 'tumu') search.set('butunluk', filters.butunluk);
  if (filters.kalp !== 'tumu') search.set('kalp', filters.kalp);
  if (filters.q.trim()) search.set('q', filters.q.trim().slice(0, 80));
  const value = search.toString();
  return value ? `?${value}` : '';
}

export default function OdkManagementOperationsScreen() {
  const { product } = useDesign();
  const [filters, setFilters] = useState<Filters>({ gorunum: 'all', durum: 'tumu', butunluk: 'tumu', kalp: 'tumu', q: '' });
  const [search, setSearch] = useState('');
  const [auto, setAuto] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const qs = queryString(filters);
  const query = useOdkManagementQuery(`operations${qs}`, async (api, signal) => {
    const parsed = parseOdkOpsConsole(await api.request(`${path}${qs}`, { signal }));
    if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    return parsed.value;
  }, { refetchInterval: operationsRefreshInterval(auto, Boolean(openId)) });
  const refresh = usePullToRefresh(() => query.refetch());
  const set = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));
  return (
    <Screen testID="odk-management-operations" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <PageHeader title="Canlı operasyon" description="Kalp atışı tarayıcı bağlantısını gösterir; Google Meet katılımının teknik kanıtı değildir. Gecikmede öğrenciyle doğrudan iletişim kurun." />
      <Row
        title="Otomatik yenile"
        subtitle={query.data ? `Son güncelleme ${TIME.format(new Date(query.data.generatedAt))} · 15 sn'de bir` : '15 sn\'de bir'}
        trailing={<Switch value={auto} onValueChange={setAuto} trackColor={{ true: product.accent }} accessibilityLabel="Otomatik yenile" testID="ops-auto-refresh" />}
      />
      <QueryView query={query}>
        {(data) => (
          <>
            <Section first title="Süzgeç">
              {data.exams.length ? <FilterChips label="Deneme" value={data.selected?.id ?? ''} onChange={(deneme) => set({ deneme })} options={data.exams.map((exam) => ({ value: exam.id, label: `${exam.live ? '● ' : ''}${exam.title}` }))} /> : null}
              <FilterChips label="Görünüm" value={data.view} onChange={(gorunum) => set({ gorunum, deneme: undefined })} options={[...VIEWS]} />
              <FilterChips label="Durum" value={data.filters.status} onChange={(durum) => set({ durum })} options={[...STATUS]} />
              <FilterChips label="Bütünlük" value={data.filters.integrity} onChange={(butunluk) => set({ butunluk })} options={[...INTEGRITY]} />
              <FilterChips label="Son sinyal" value={data.filters.heartbeat} onChange={(kalp) => set({ kalp })} options={[...HEARTBEAT]} />
              <TextField label="Ara" value={search} onChangeText={setSearch} onSubmitEditing={() => set({ q: search })} returnKeyType="search" maxLength={80} placeholder="Öğrenci veya deneme" testID="ops-search" />
            </Section>
            {!data.selected ? (
              <EmptyState title="Bu görünümde izlenecek deneme bulunmuyor." body="Planlanan ya da canlı deneme olduğunda burada görünür; süzgeci temizlemeyi deneyin." />
            ) : (
              <>
                <Section title={data.selected.title}>
                  <View style={styles.badges}>
                    <StatusBadge label={data.selected.live ? 'Canlı' : 'Planlandı'} tone={data.selected.live ? 'critical' : 'info'} />
                    <Text tone="secondary" variant="secondary">{`${data.selected.startsAt ? formatShortDateTime(data.selected.startsAt) : '—'} – ${data.selected.endsAt ? formatShortDateTime(data.selected.endsAt) : '—'}`}</Text>
                  </View>
                  <MetricGrid>
                    <MetricTile label="Başlamadı" value={String(data.selected.counters.notStarted)} />
                    <MetricTile label="Devam ediyor" value={String(data.selected.counters.inProgress)} />
                    <MetricTile label="Bağlantı koptu" value={String(data.selected.counters.disconnected)} tone={data.selected.counters.disconnected ? 'warning' : 'neutral'} />
                    <MetricTile label="Teslim" value={String(data.selected.counters.submitted)} />
                    <MetricTile label="Otomatik teslim" value={String(data.selected.counters.autoSubmitted)} />
                    <MetricTile label="İnceleme" value={String(data.selected.counters.review)} tone={data.selected.counters.review ? 'warning' : 'neutral'} />
                  </MetricGrid>
                </Section>
                <Section title="Uyarılar">
                  {data.alerts.length ? data.alerts.map((alert) => <Row key={alert.attemptId} title={alert.name} subtitle={alert.text} onPress={() => setOpenId(alert.attemptId)} testID={`ops-alert-${alert.attemptId}`} />) : <Text tone="secondary">Şu an uyarı yok.</Text>}
                </Section>
                <Section title="Deneme kayıtları">
                  {data.rows.length ? (
                    data.rows.map((row) => (
                      <Row
                        key={row.id}
                        title={row.name}
                        subtitle={`Son sinyal ${TIME.format(new Date(row.lastActivityAt))} · ${row.answerCount} cevap · Meet: ${row.meet}${row.integrity.level === 'NORMAL' ? '' : ` · ${row.integrity.label}${row.integrity.reviewed ? ' · incelendi' : ''}`}`}
                        trailing={<StatusBadge label={row.statusLabel} tone={row.tone} />}
                        onPress={() => setOpenId(row.id)}
                        testID={`ops-row-${row.id}`}
                      />
                    ))
                  ) : (
                    <EmptyState title={data.selected.attemptCount ? 'Süzgece uyan kayıt yok.' : 'Henüz sınava giren öğrenci yok.'} />
                  )}
                </Section>
              </>
            )}
          </>
        )}
      </QueryView>
      {openId ? <AttemptSheet key={openId} attemptId={openId} onClose={() => setOpenId(null)} onChanged={() => void query.refetch()} /> : null}
    </Screen>
  );
}

const ACTIONS: { action: OdkIntegrityAction; label: string; confirm: string }[] = [
  { action: 'MARK_REVIEWED', label: 'İncelendi olarak işaretle', confirm: 'Kayıt incelendi olarak işaretlensin mi? İnceleme gerekli durumdaki kayıt teslim durumuna döner.' },
  { action: 'REQUIRE_REVIEW', label: 'İnceleme gerekli', confirm: 'Kayıt incelemeye alınsın mı? Sonuç yayınından önce karar verilmesi gerekir.' },
  { action: 'CLEAR_REVIEW', label: 'Sinyali temizle', confirm: 'İnceleme işareti kaldırılsın mı?' },
];

function AttemptSheet({ attemptId, onClose, onChanged }: { attemptId: string; onClose: () => void; onChanged: () => void }) {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const client = useQueryClient();
  const online = useOnline();
  const [state, setState] = useState<WriteState>(null);
  const [note, setNote] = useState('');
  const key = ['user', bootstrap.user.id, 'workspace', 'ODK', 'management', bootstrap.user.role, 'operations-attempt', attemptId];
  const detail = useQuery({ queryKey: key, gcTime: 0, queryFn: async ({ signal }) => {
    const parsed = parseOdkOpsAttempt(await api.request(`${path}/attempts/${encodeURIComponent(attemptId)}`, { signal }));
    if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    return parsed.value;
  } });
  const write = useStableKey<{ action: OdkIntegrityAction; note: string; revision: string }>((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: async (input: { action: OdkIntegrityAction; note: string; revision: string }) => {
      if (!online) throw new ApiError({ kind: 'network' });
      try {
        const body = { action: input.action, ...(input.note.trim() ? { note: input.note.trim() } : {}), idempotencyKey: write.keyFor(input), expectedRevision: input.revision };
        const parsed = parseOdkIntegrityReviewWrite(await api.request(`${path}/attempts/${encodeURIComponent(attemptId)}/review`, { method: 'POST', body }));
        if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
        write.settle();
        return parsed.value;
      } catch (error) {
        write.settle(error);
        throw error;
      }
    },
  });
  async function review(action: (typeof ACTIONS)[number]) {
    if (!detail.data || mutation.isPending) return;
    if (!(await confirmAction({ title: action.label, message: action.confirm, confirmLabel: 'Onayla' }))) return;
    setState(null);
    try {
      await mutation.mutateAsync({ action: action.action, note, revision: detail.data.revision });
      setNote('');
      setState({ tone: 'success', message: 'İnceleme kaydedildi.' });
      await client.invalidateQueries({ queryKey: key });
      onChanged();
    } catch (error) {
      setState(writeError(error, 'Kayıt başka bir işlemde değişti. Güncel durum yüklendi; kontrol edip yeniden deneyin.'));
      if (error instanceof ApiError && (error.kind === 'conflict' || error.kind === 'not_found')) {
        await client.invalidateQueries({ queryKey: key });
        onChanged();
      }
    }
  }
  return (
    <BottomSheet visible title={detail.data?.name ?? 'Kayıt'} onClose={() => { if (!mutation.isPending) onClose(); }}>
      {detail.isPending ? <Text tone="secondary">Yükleniyor…</Text> : detail.error ? <Banner tone="critical">{detail.error instanceof ApiError ? detail.error.message : 'Kayıt yüklenemedi.'}</Banner> : detail.data ? (
        <View style={styles.sheet} testID="ops-attempt">
          <Text tone="secondary">{detail.data.examTitle}</Text>
          <View style={styles.badges}>
            <StatusBadge label={detail.data.statusLabel} tone={detail.data.tone} />
            <StatusBadge label={`${detail.data.integrity.label}${detail.data.reviewedAt ? ' · incelendi' : ''}`} tone={detail.data.integrity.tone} />
          </View>
          <Text tone="secondary" variant="secondary">{`Son sinyal ${TIME.format(new Date(detail.data.lastActivityAt))} · ${detail.data.answerCount} cevap${detail.data.reviewedAt ? ` · ${formatShortDateTime(detail.data.reviewedAt)} incelendi` : ''}`}</Text>
          <OfflineWriteNotice online={online} />
          <WriteBanner state={state} />
          {detail.data.canReview ? (
            <>
              <TextField label="İnceleme notu (isteğe bağlı)" value={note} onChangeText={setNote} maxLength={500} testID="ops-review-note" />
              {ACTIONS.map((action) => (
                <Button key={action.action} mutation label={action.action === 'MARK_REVIEWED' && detail.data.reviewedAt ? 'Yeniden incelendi say' : action.label} variant={action.action === 'MARK_REVIEWED' ? 'primary' : 'secondary'} loading={mutation.isPending && mutation.variables?.action === action.action} disabled={!online || mutation.isPending} onPress={() => void review(action)} testID={`ops-review-${action.action}`} />
              ))}
            </>
          ) : null}
          <Text variant="bodyStrong">Olaylar</Text>
          {detail.data.events.length ? detail.data.events.map((event) => <Row key={event.id} title={event.label} meta={TIME.format(new Date(event.at))} trailing={event.signal ? <StatusBadge label="Sinyal" tone="warning" /> : undefined} />) : <Text tone="secondary">Kayıtlı olay yok.</Text>}
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, sheet: { gap: 10 } });
