import type { MobileActivationDesk, MobileOnboarding } from '@contracts/admin';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { space, type Tone } from '@/design/tokens';
import { fetchActivationDesk, linkOrderToStudent, retryEmail, transitionOnboarding, updateLeadStatus } from '@/lib/api/admin';
import { useReadyBootstrap } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { expoHrefFor, mapAdminWebPath } from '@/navigation/route-map';

import { adminErrorText, QueryView, useAdminMutation, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips, MetricGrid, MetricTile, SEVERITY } from './ui';

type Tab = 'aktivasyon' | 'istisnalar' | 'siparisler' | 'sistem';
const CRON_TONE: Record<MobileActivationDesk['cron']['jobs'][number]['status'], Tone> = { healthy: 'success', stale: 'warning', failed: 'critical', missing: 'neutral' };
const hours = (value: number | null) => (value === null ? '—' : `${value.toLocaleString('tr-TR')} sa`);

/**
 * YÖNETİM · AKTİVASYON MASASI (Faz 2.1) — web `app/panel/yonetim/isler`
 * ile AYNI veri (`loadActivationDesk`) ve AYNI yazma uçları. Sekmeler web ile
 * aynıdır. Onboarding geçişi ve sipariş bağlama hassas işlemdir: sunucu taze
 * step-up ister, mobil kod sorar ve isteği bir kez tekrarlar. İzinli geçişler
 * sunucudan gelir; istemci durum makinesi kurmaz.
 */
export default function ActivationDeskScreen() {
  const query = useAdminQuery('activation-desk', (api, signal) => fetchActivationDesk(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-activation-desk">
      <PageHeader title="Aktivasyon masası" description="Ödeme sonrası hesap, veli, grup ve ilk ders adımları; operasyon istisnaları, siparişler ve sistem işleri." />
      <QueryView query={query}>{(desk) => <Body desk={desk} />}</QueryView>
    </Screen>
  );
}

function Body({ desk }: { desk: MobileActivationDesk }) {
  const [tab, setTab] = useState<Tab>('aktivasyon');
  const [onboardingId, setOnboardingId] = useState<string | null>(null);
  const [linkOrderId, setLinkOrderId] = useState<string | null>(null);
  const onboarding = desk.onboardings.find((item) => item.id === onboardingId) ?? null;
  return (
    <>
      <Text tone="secondary" testID="admin-desk-counts">
        {desk.counts.openExceptions} açık operasyon istisnası · {desk.counts.activations} aktivasyon bekliyor
      </Text>
      <FilterChips
        label="Aktivasyon masası"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'aktivasyon', label: 'Aktivasyon', count: desk.counts.activations },
          { value: 'istisnalar', label: 'İstisnalar', count: desk.counts.openExceptions },
          { value: 'siparisler', label: 'Siparişler ve talepler' },
          { value: 'sistem', label: 'Sistem', count: desk.counts.emailQueue },
        ]}
      />
      {tab === 'aktivasyon' ? <ActivationTab desk={desk} onOpen={setOnboardingId} /> : null}
      {tab === 'istisnalar' ? <ExceptionsTab desk={desk} /> : null}
      {tab === 'siparisler' ? <OrdersTab desk={desk} onLink={setLinkOrderId} /> : null}
      {tab === 'sistem' ? <SystemTab desk={desk} /> : null}
      {onboarding ? <OnboardingSheet item={onboarding} desk={desk} onClose={() => setOnboardingId(null)} onLink={() => { setOnboardingId(null); setLinkOrderId(onboarding.orderId); }} /> : null}
      {linkOrderId ? <LinkOrderSheet orderId={linkOrderId} desk={desk} onClose={() => setLinkOrderId(null)} /> : null}
    </>
  );
}

function ActivationTab({ desk, onOpen }: { desk: MobileActivationDesk; onOpen: (id: string) => void }) {
  const lesson = desk.firstLesson;
  const placement = desk.placement;
  return (
    <>
      <Section title="İlk ders göstergeleri" first>
        <MetricGrid>
          <MetricTile label="Ödemeden ilk derse" value={lesson.medianHours === null ? 'Yetersiz veri' : `${lesson.medianHours.toLocaleString('tr-TR')} sa`} hint={`${lesson.durationSample} ilk ders · ortanca`} />
          <MetricTile label="İlk derse katılım" value={lesson.participationRate === null ? 'Yetersiz veri' : `%${lesson.participationRate.toLocaleString('tr-TR')}`} hint={`${lesson.participationSample} sonuç`} />
        </MetricGrid>
        <Text tone="muted" variant="meta">
          En az beş örnek gerekir. {lesson.waitingCount} ilk ders bekliyor; {lesson.missingAttendanceCount} katılım sonucu bekliyor. {lesson.paidCount} ödenmiş başlangıcın {lesson.linkedLeadCount} tanesinde lead bağlantısı var.
        </Text>
      </Section>
      <Section title="Yerleştirme (son 90 gün)">
        <MetricGrid>
          <MetricTile label="İlk iletişim" value={hours(placement.firstContactHours)} hint={`${placement.firstContactSample} ölçüm · hedef ≤24 sa`} />
          <MetricTile label="Yerleştirme süresi" value={hours(placement.placementHours)} hint={`${placement.placementSample} ölçüm · hedef ≤48 sa`} />
          <MetricTile label="Uygun slot bulunamadı" value={placement.noSlotRate === null ? '—' : `%${placement.noSlotRate.toLocaleString('tr-TR')}`} hint={`${placement.onboardingCount} onboarding`} />
          <MetricTile label="Sonuçlar" value={`${placement.outcomes.assigned} grup`} hint={`${placement.outcomes.alternate} alternatif · ${placement.outcomes.waitlist} bekleme · ${placement.outcomes.refund} iade`} />
        </MetricGrid>
      </Section>
      <Section title="Yeni öğrenciyi aktif et">
        {desk.onboardings.length ? (
          desk.onboardings.map((item) => {
            const missing = item.checklist.filter((entry) => !entry.done).length;
            return (
              <Row
                key={item.id}
                testID={`admin-onboarding-${item.id}`}
                title={`${item.packageName} · ${item.customer}`}
                subtitle={`${item.nextAction} · ${item.ownerName ?? 'Atanmamış'}`}
                meta={item.overdue ? 'Son tarih geçti' : missing ? `${missing} adım eksik` : 'Checklist tamam'}
                trailing={<StatusBadge label={item.stateLabel} tone={item.critical ? 'critical' : 'warning'} />}
                onPress={() => onOpen(item.id)}
              />
            );
          })
        ) : (
          <EmptyState title="Aktivasyon bekleyen ödenmiş sipariş yok ✅" />
        )}
      </Section>
    </>
  );
}

function ExceptionsTab({ desk }: { desk: MobileActivationDesk }) {
  const router = useRouter();
  const bootstrap = useReadyBootstrap();
  const navigation = bootstrap.workspace?.navigation ?? null;
  return (
    <>
      <Section title="Birleşik iş kutusu" first>
        {desk.exceptions.length ? (
          desk.exceptions.map((item) => {
            const href = expoHrefFor(mapAdminWebPath(item.webPath, navigation, bootstrap.business));
            return (
              <Row
                key={item.id}
                testID={`admin-exception-${item.id}`}
                title={item.title}
                subtitle={`${item.detail} · ${item.owner} · Sıradaki: ${item.nextAction}`}
                meta={item.resolved ? 'Çözüldü' : item.overdue ? 'Son tarih geçti' : item.dueAt ? `Hedef ${formatShortDateTime(item.dueAt)}` : 'Hedef tanımsız'}
                trailing={<StatusBadge label={SEVERITY[item.severity].label} tone={item.resolved ? 'success' : SEVERITY[item.severity].tone} />}
                onPress={href ? () => router.push(href as Href) : undefined}
                accessibilityHint={href ? item.ctaLabel : undefined}
              />
            );
          })
        ) : (
          <EmptyState title="Açık operasyon istisnası yok ✅" />
        )}
      </Section>
      <Section title="Operasyon hazırlık kontrolü">
        <StatusBadge label={desk.readiness.statusLabel} tone={desk.readiness.status === 'GO' ? 'success' : 'warning'} />
        {desk.readiness.rows.map((row) => (
          <Row key={row.task} title={row.task} subtitle={`${row.coverage} · ${row.note}`} trailing={<StatusBadge label={row.statusLabel} tone={row.status === 'GO' ? 'success' : 'warning'} />} />
        ))}
      </Section>
    </>
  );
}

function OrdersTab({ desk, onLink }: { desk: MobileActivationDesk; onLink: (orderId: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const lead = useAdminMutation((api, input: { id: string; status: string }) => updateLeadStatus(api, input.id, input.status));
  async function setLead(id: string, status: string) {
    setError(null);
    try {
      await lead.mutateAsync({ id, status });
    } catch (cause) {
      setError(adminErrorText(cause));
    }
  }
  return (
    <>
      {error ? <Banner tone="critical" title="Kaydedilmedi">{error}</Banner> : null}
      <Section title="Siparişler" first>
        {desk.orders.length ? (
          desk.orders.map((order) => (
            <Row
              key={order.id}
              testID={`admin-order-${order.id}`}
              title={order.packageName}
              subtitle={order.customer}
              meta={`${order.statusLabel} · ${order.totalLabel}`}
              trailing={!order.linkedToAccount ? <Text tone="muted" variant="meta">Hesaba bağla</Text> : <StatusBadge label={order.statusLabel} tone={order.paid ? 'success' : 'warning'} />}
              onPress={!order.linkedToAccount ? () => onLink(order.id) : undefined}
            />
          ))
        ) : (
          <EmptyState title="Henüz sipariş yok." />
        )}
      </Section>
      <Section title="Talepler">
        {desk.leads.length ? (
          desk.leads.map((entry) => (
            <View key={entry.id} style={styles.lead} testID={`admin-lead-${entry.id}`}>
              <Text variant="bodyStrong">{entry.fullName}</Text>
              <Text tone="secondary">{entry.detail}</Text>
              <FilterChips label={`${entry.fullName} talep durumu`} value={entry.status} onChange={(status) => void setLead(entry.id, status)} options={desk.leadStatuses} />
            </View>
          ))
        ) : (
          <EmptyState title="Henüz talep yok." />
        )}
      </Section>
    </>
  );
}

function SystemTab({ desk }: { desk: MobileActivationDesk }) {
  const [message, setMessage] = useState<string | null>(null);
  const retry = useAdminMutation((api, id: string) => retryEmail(api, id));
  async function run(id: string) {
    setMessage(null);
    try {
      await retry.mutateAsync(id);
      setMessage('E-posta yeniden kuyruğa alındı.');
    } catch (cause) {
      setMessage(adminErrorText(cause));
    }
  }
  const alarms = desk.cron.jobs.filter((job) => job.status !== 'healthy').length;
  return (
    <>
      {message ? <Banner tone="info">{message}</Banner> : null}
      <Section title="Kritik cron heartbeat'leri" first action={<StatusBadge label={desk.cron.ok ? 'Tümü sağlıklı' : `${alarms} alarm`} tone={desk.cron.ok ? 'success' : 'critical'} />}>
        {desk.cron.jobs.map((job) => (
          <Row
            key={job.name}
            testID={`admin-cron-${job.name}`}
            title={job.label}
            subtitle={`Son başarı: ${job.lastSucceededAt ? formatShortDateTime(job.lastSucceededAt) : 'Henüz yok'} · ${job.lastDurationMs === null ? '—' : `${job.lastDurationMs} ms`} · ${job.processedCount} işlendi · ${job.failedCount} hata${job.errorCode ? ` · ${job.errorCode}` : ''}`}
            trailing={<StatusBadge label={job.statusLabel} tone={CRON_TONE[job.status]} />}
          />
        ))}
      </Section>
      <Section title="E-posta kuyruğu">
        {desk.emails.length ? (
          desk.emails.map((email) => (
            <Row
              key={email.id}
              testID={`admin-email-${email.id}`}
              title={email.subject}
              subtitle={`${formatShortDateTime(email.createdAt)} · ${email.attempts} deneme`}
              meta={email.retryable ? null : 'Otomatik gönderilecek'}
              trailing={email.retryable ? <Button label="Tekrar dene" variant="quiet" onPress={() => void run(email.id)} disabled={retry.isPending} testID={`admin-email-retry-${email.id}`} /> : <StatusBadge label={email.statusLabel} tone="warning" />}
            />
          ))
        ) : (
          <EmptyState title="Bekleyen e-posta yok." />
        )}
      </Section>
    </>
  );
}

export function OnboardingSheet({ item, desk, onClose, onLink }: { item: MobileOnboarding; desk: MobileActivationDesk; onClose: () => void; onLink: () => void }) {
  const [toState, setToState] = useState<string | null>(item.allowedTransitions[0]?.value ?? null);
  const [ownerId, setOwnerId] = useState<string | null>(item.ownerId);
  const [blocker, setBlocker] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useAdminMutation((api, input: Parameters<typeof transitionOnboarding>[2]) => transitionOnboarding(api, item.orderId, input));

  async function submit() {
    if (!toState) return;
    setError(null);
    try {
      await mutation.mutateAsync({ toState, ownerId, blockerReason: blocker.trim() || null, note: note.trim() || null });
      onClose();
    } catch (cause) {
      setError(adminErrorText(cause));
    }
  }

  return (
    <BottomSheet visible title={item.packageName} onClose={onClose}>
      <View style={styles.badges}>
        <StatusBadge label={item.stateLabel} tone={item.critical ? 'critical' : 'warning'} />
        <StatusBadge label={item.flowLabel} />
      </View>
      {error ? <Banner tone="critical" title="Kaydedilmedi">{error}</Banner> : null}
      <Text>{item.customer} · {item.totalLabel}</Text>
      <Text tone="secondary">Sıradaki işlem: {item.nextAction}</Text>
      <Text tone="muted" variant="meta">
        Son tarih: {item.dueAt ? formatShortDateTime(item.dueAt) : 'Tanımsız'} · Bu aşamada: {formatShortDateTime(item.stateEnteredAt)}
      </Text>
      {item.preferences ? <Text tone="secondary">{item.preferences}</Text> : null}
      <View style={styles.badges}>
        {item.checklist.map((entry) => (
          <StatusBadge key={entry.key} label={`${entry.label} ${entry.done ? 'hazır' : 'eksik'}`} tone={entry.done ? 'success' : 'critical'} />
        ))}
      </View>
      {item.blockerReason ? <Banner tone="warning" title="Bloker">{item.blockerReason}</Banner> : null}
      {!item.linkedToAccount ? <Button label="Siparişi öğrenci hesabına bağla" variant="secondary" onPress={onLink} testID="onboarding-link-order" /> : null}
      {item.allowedTransitions.length ? (
        <>
          <Section title="Sıradaki işlem sonucu">
            {item.allowedTransitions.map((entry) => (
              <Row key={entry.value} title={entry.label} selected={toState === entry.value} onPress={() => setToState(entry.value)} testID={`onboarding-to-${entry.value}`} />
            ))}
          </Section>
          <Section title="Sorumlu">
            <Row title="Atanmamış" selected={ownerId === null} onPress={() => setOwnerId(null)} testID="onboarding-owner-none" />
            {desk.staff.map((person) => (
              <Row key={person.id} title={person.name} selected={ownerId === person.id} onPress={() => setOwnerId(person.id)} testID={`onboarding-owner-${person.id}`} />
            ))}
          </Section>
          <TextField label="Bloker nedeni (varsa)" value={blocker} onChangeText={setBlocker} maxLength={500} testID="onboarding-blocker" />
          <TextField label="Not" value={note} onChangeText={setNote} multiline maxLength={500} testID="onboarding-note" />
          <Button label="Geçişi kaydet" onPress={submit} disabled={!toState || mutation.isPending} loading={mutation.isPending} testID="onboarding-submit" />
          <Text tone="muted" variant="meta">Bu işlem hassastır; kimliğini yeniden doğrulaman istenebilir.</Text>
        </>
      ) : (
        <Text tone="secondary">Aktivasyon tamamlandı.</Text>
      )}
      {item.transitions.length ? (
        <Section title={`Son geçişler (${item.transitions.length})`}>
          {item.transitions.map((transition) => (
            <Row key={transition.id} title={transition.text} meta={formatShortDateTime(transition.occurredAt)} />
          ))}
        </Section>
      ) : null}
    </BottomSheet>
  );
}

export function LinkOrderSheet({ orderId, desk, onClose }: { orderId: string; desk: MobileActivationDesk; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useAdminMutation((api, userId: string) => linkOrderToStudent(api, orderId, userId));
  const needle = search.trim().toLocaleLowerCase('tr-TR');
  const matches = needle ? desk.students.filter((student) => student.name.toLocaleLowerCase('tr-TR').includes(needle)).slice(0, 20) : [];
  const student = desk.students.find((entry) => entry.id === studentId) ?? null;

  async function submit() {
    if (!student) return;
    setError(null);
    try {
      await mutation.mutateAsync(student.id);
      onClose();
    } catch (cause) {
      setError(adminErrorText(cause));
    }
  }

  return (
    <BottomSheet visible title="Siparişi hesaba bağla" onClose={onClose}>
      <Text tone="secondary">Bağlantı bir kez yapılır; sipariş farklı bir öğrenciye bağlıysa değiştirilemez.</Text>
      {error ? <Banner tone="critical" title="Bağlanmadı">{error}</Banner> : null}
      {student ? (
        <Row title={student.name} subtitle="Seçili öğrenci" trailing={<Text tone="muted" variant="meta">Değiştir</Text>} onPress={() => setStudentId(null)} />
      ) : (
        <>
          <TextField label="Öğrenci ara" value={search} onChangeText={setSearch} autoCorrect={false} testID="link-order-search" />
          {matches.map((entry) => (
            <Row key={entry.id} title={entry.name} onPress={() => setStudentId(entry.id)} testID={`link-order-student-${entry.id}`} />
          ))}
        </>
      )}
      <Button label="Bağla" onPress={submit} disabled={!student || mutation.isPending} loading={mutation.isPending} testID="link-order-submit" />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  lead: { gap: space[1], paddingVertical: space[2] },
});
