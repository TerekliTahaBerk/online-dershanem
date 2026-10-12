import type { AdminOrder } from '@contracts/admin-orders';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { fetchAdminOrder, fetchAdminOrders } from '@/lib/api/admin-orders';
import { fetchActivationDesk, retryProvisioning } from '@/lib/api/admin';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { LinkOrderSheet, OnboardingSheet } from './activation-desk';
import { adminErrorText, QueryView, useAdminMutation, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips } from './ui';
const paymentLabels = { PAID: 'Alındı', PENDING: 'Bekliyor', CANCELLED: 'İptal', REFUNDED: 'İade' };
const accessLabels = { SUCCEEDED: 'Açıldı', PENDING: 'Bekliyor', RUNNING: 'Çalışıyor', RETRY_PENDING: 'Yeniden denenecek', MANUAL_REVIEW: 'Elle inceleme gerekiyor', REVOKED: 'Geri alındı' };
const paymentRecordLabels = { SUCCEEDED: 'Alındı', PENDING: 'Bekliyor', FAILED: 'Başarısız', REFUNDED: 'İade' };
const money = (cents: number) => `${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

export default function AdminOrdersScreen() {
  const router = useRouter();
  const [filtre, setFilter] = useState(''); const [sayfa, setPage] = useState(1); const [search, setSearch] = useState(''); const [q, setQuery] = useState('');
  const query = useAdminQuery('orders', (api, signal) => fetchAdminOrders(api, { filtre, sayfa, q }, signal), { params: { filtre, sayfa, q } });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-orders">
    <PageHeader title="Siparişler" description="Ödeme ve ürün erişimi ayrı izlenir." />
    <FilterChips label="Sipariş görünümleri" value={filtre} onChange={(value) => { setFilter(value); setPage(1); }} options={[{ value: '', label: 'Tümü' }, { value: 'sorun', label: 'Erişim sorunu', count: query.data?.problemCount }, { value: 'ay', label: 'Bu ay' }]} />
    <TextField label="Paket, ad veya e-posta ara" value={search} onChangeText={setSearch} maxLength={80} autoCorrect={false} testID="orders-search" />
    <Button label="Ara" variant="secondary" onPress={() => { setQuery(search.trim()); setPage(1); }} testID="orders-search-submit" />
    <QueryView query={query}>{(data) => <>
      <Section title={`Siparişler (${data.total})`} first>{data.orders.length ? data.orders.map((o) => <Row key={o.id} title={o.packageName} subtitle={`${o.customer} · ${money(o.totalCents)}`} meta={`${o.products.join(' + ') || 'Ürün kaydı yok'} · ${formatShortDateTime(o.createdAt)} · Ödeme: ${paymentLabels[o.status]} · Erişim: ${o.status === 'PAID' ? accessLabels[o.provisioningStatus] : '—'}`} onPress={() => router.push(`/admin/order/${encodeURIComponent(o.id)}` as Href)} testID={`orders-row-${o.id}`} />) : <EmptyState title={filtre === 'sorun' ? 'Erişim sorunu olan sipariş yok' : 'Sipariş yok'} />}</Section>
      <Text>Sayfa {data.page} / {data.pageCount}</Text>
      {sayfa > 1 ? <Button label="Önceki" variant="secondary" onPress={() => setPage(sayfa - 1)} /> : null}
      {sayfa < data.pageCount ? <Button label="Sonraki" variant="secondary" onPress={() => setPage(sayfa + 1)} testID="orders-next" /> : null}
    </>}</QueryView>
  </Screen>;
}
export function AdminOrderScreen({ id }: { id: string }) {
  const query = useAdminQuery('order', (api, signal) => fetchAdminOrder(api, id, signal), { params: { id } });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-order"><QueryView query={query}>{({ order }) => <OrderBody order={order} />}</QueryView></Screen>;
}
function OrderBody({ order: o }: { order: AdminOrder }) {
  const router = useRouter(); const [notice, setNotice] = useState<{ message: string; succeeded: boolean } | null>(null); const [activation, setActivation] = useState(false);
  const retry = useAdminMutation((api, _: void, { idempotencyKey }) => retryProvisioning(api, o.id, idempotencyKey, o.revision));
  async function run() { setNotice(null); try { const result = await retry.mutateAsync(); setNotice(result); } catch { /* Ortak hata metni aşağıda. */ } }
  const refund = o.status === 'REFUNDED' || o.status === 'CANCELLED' || o.payments[0]?.status === 'REFUNDED';
  return <>
    <PageHeader title={o.packageName} description={`Sipariş detayı · ${formatShortDateTime(o.createdAt)}`} />
    {notice ? <Banner tone={notice.succeeded ? 'success' : 'warning'}>{notice.message}</Banner> : null}{retry.error ? <Banner tone="critical">{adminErrorText(retry.error)}</Banner> : null}
    <Section title="Ne oldu?" first>
      <Text>{money(o.totalCents)} · Ödeme: {paymentLabels[o.status]}</Text>
      <StatusBadge label={`Erişim: ${accessLabels[o.provisioningStatus]}`} tone={o.provisioningStatus === 'SUCCEEDED' ? 'success' : 'warning'} />
      <Text>{o.status !== 'PAID' ? 'Önce ödeme veya iade durumunu netleştirin.' : o.provisioningStatus === 'SUCCEEDED' ? 'Ödeme alındı ve ürün erişimi açıldı.' : 'Ödeme alındı; erişim için operasyon takibi gerekiyor.'}</Text>
    </Section>
    <Section title="Kimi etkiliyor?">
      <Text>{o.customer}</Text>
      {o.userId ? <Button label="Kişi detayını aç" variant="secondary" onPress={() => router.push(`/admin/person/${encodeURIComponent(o.userId!)}` as Href)} /> : null}
      {o.studentProfileId ? <Button label="Öğrenci 360'ı aç" variant="secondary" onPress={() => router.push(`/admin/student/${encodeURIComponent(o.studentProfileId!)}` as Href)} /> : null}
      {o.onboarding ? <><Text>{o.onboarding.label} · {o.onboarding.owner ?? 'Sorumlu atanmamış'}</Text><Text>Son tarih: {o.onboarding.dueAt ? formatShortDateTime(o.onboarding.dueAt) : 'Tanımsız'}</Text></> : <Text>Onboarding kaydı yok.</Text>}
    </Section>
    <Section title="Şimdi ne yapacağım?">
      {o.onboarding ? <Text>{o.onboarding.nextAction}</Text> : null}
      {refund ? <Banner tone="warning">İade veya iptal sonrası erişim ve onboarding kapanışını kontrol edin.</Banner> : null}
      {!o.userId || o.onboarding ? <Button label={!o.userId ? 'Siparişi öğrenci hesabına bağla' : 'Aktivasyon adımlarını yönet'} variant="secondary" onPress={() => setActivation(true)} testID="order-activation" /> : null}
      {o.canRetry ? <Button label="Erişim açmayı yeniden dene" disabled={retry.isPending} loading={retry.isPending} onPress={() => Alert.alert('Erişim açmayı yeniden dene', `${o.packageName} · ${o.customer}. Ürün erişimi yeniden hazırlanacak.`, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla', onPress: () => void run() }])} testID="order-retry" /> : null}
    </Section>
    <Section title="Ürün erişimleri">{o.lines.length ? o.lines.map((line) => <Row key={line.id} title={line.productName} subtitle={accessLabels[line.status]} meta={`${line.attempts} deneme${line.error ? ` · ${line.error}` : ''}`} />) : <EmptyState title="Ürün satırı kaydı yok" />}</Section>
    <Section title="Ödeme geçmişi">{o.payments.length ? o.payments.map((p, i) => <Row key={i} title={`${paymentRecordLabels[p.status]} · ${money(p.amountCents)}`} subtitle={p.provider} meta={`${p.paidAt ? formatShortDateTime(p.paidAt) : 'Ödeme tarihi yok'}${p.failureReason ? ` · ${p.failureReason}` : ''}`} />) : <EmptyState title="Ödeme kaydı yok" />}</Section>
    <Section title="Teknik ayrıntılar"><Text>{o.provisioningAttempts} erişim açma denemesi · Son başarı: {o.provisionedAt ? formatShortDateTime(o.provisionedAt) : 'Yok'}</Text>{o.provisioningError ? <Text tone="secondary">{o.provisioningError}</Text> : null}</Section>
    {activation ? <OrderActivation order={o} onClose={() => setActivation(false)} /> : null}
  </>;
}
/** Var olan aktivasyon formları ve servisleri tekrar kullanılır. */
function OrderActivation({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const query = useAdminQuery('activation-desk', (api, signal) => fetchActivationDesk(api, signal));
  const [link, setLink] = useState(!order.userId);
  return <QueryView query={query}>{(desk) => {
    const item = desk.onboardings.find((entry) => entry.orderId === order.id);
    if (link) return <LinkOrderSheet orderId={order.id} desk={desk} onClose={onClose} />;
    if (item) return <OnboardingSheet item={item} desk={desk} onClose={onClose} onLink={() => setLink(true)} />;
    return <Section title="Aktivasyon"><Text>Bu sipariş açık aktivasyon kuyruğunda değil. Güncel durumunu kontrol edin.</Text><Button label="Kapat" onPress={onClose} /></Section>;
  }}</QueryView>;
}
