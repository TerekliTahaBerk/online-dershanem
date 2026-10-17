import type { MobileStudent360, MobileStudentCard } from '@contracts/admin';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { space } from '@/design/tokens';
import { ApiError } from '@/lib/api/errors';
import { assignCoach, fetchStudent360, linkStudentTeacher, removeRelationship, retryProvisioning, unlinkStudentTeacher } from '@/lib/api/admin';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { LinkSheet, type Run } from './parents';
import { adminErrorText, QueryView, useAdminMutation, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips, MetricGrid, MetricTile, SearchPicker } from './ui';

/**
 * YÖNETİM · ÖĞRENCİ 360 (Faz 2.2) — web `app/panel/yonetim/ogrenciler/[id]`
 * ile AYNI yükleyici (`loadStudent360Bundle`), AYNI üst sekmeler ve Öğrenme
 * alt görünümleri. Bölümler sunucuda karta çevrilir; burada yalnız çizilir.
 * Operasyon kısayolları web ile aynı: kişi detayı, koç ata / devret (AYNI
 * `assignCoachService`) ve ödenmiş ama erişimi açılmamış siparişte yeniden
 * deneme (AYNI provisioning servisi).
 */
export default function Student360Screen({ studentProfileId }: { studentProfileId: string }) {
  const [nav, setNav] = useState<{ sekme?: string; gorunum?: string }>({});
  const query = useAdminQuery('student360', (api, signal) => fetchStudent360(api, studentProfileId, nav, signal), { params: { id: studentProfileId, sekme: nav.sekme ?? '', gorunum: nav.gorunum ?? '' } });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-student-360">
      <QueryView query={query}>{(data) => <Body data={data} onNav={(next) => setNav(next)} />}</QueryView>
    </Screen>
  );
}

function Body({ data, onNav }: { data: MobileStudent360; onNav: (next: { sekme?: string; gorunum?: string }) => void }) {
  const router = useRouter();
  const { summary } = data;
  return (
    <>
      <PageHeader
        title={summary.name}
        description={[summary.email, summary.detail, summary.lastActivityAt ? `son etkinlik ${formatShortDateTime(summary.lastActivityAt)}` : null].filter(Boolean).join(' · ')}
        context={
          <View style={styles.badges}>
            <StatusBadge label={summary.packageStatus.label} tone={summary.packageStatus.tone} />
            <StatusBadge label={`Risk: ${summary.risk.label}`} tone={summary.risk.tone} />
          </View>
        }
      />
      <Text tone="secondary" variant="meta">{[summary.products, summary.groups, summary.coach ? `Koç: ${summary.coach}` : 'Koç atanmadı'].filter(Boolean).join(' · ')}</Text>
      {summary.risk.reasons.length ? <Banner tone={summary.risk.tone === 'critical' ? 'critical' : 'warning'} title="Neden dikkat istiyor">{summary.risk.reasons.join(' · ')}</Banner> : null}
      <Operations data={data} onOpenPerson={() => router.push(`/admin/person/${encodeURIComponent(data.studentUserId)}` as Href)} />
      <FilterChips label="Öğrenci 360 sekmeleri" value={data.group} onChange={(sekme) => onNav({ sekme })} options={data.groups.map((group) => ({ value: group.id, label: group.label }))} />
      {data.views.length ? <FilterChips label="Öğrenme görünümleri" value={data.view ?? data.views[0].id} onChange={(gorunum) => onNav({ sekme: data.group, gorunum })} options={data.views.map((view) => ({ value: view.id, label: view.label }))} /> : null}
      {data.cards.length ? data.cards.map((item, index) => <CardSection key={item.id} card={item} first={index === 0} />) : <EmptyState title="Bu sekmede gösterilecek veri yok" />}
      {data.manage ? <ManageLinks studentProfileId={data.studentProfileId} manage={data.manage} /> : null}
    </>
  );
}

function CardSection({ card, first }: { card: MobileStudentCard; first: boolean }) {
  return (
    <Section title={card.title} first={first}>
      <View testID={`student-card-${card.id}`} style={styles.card}>
        {card.metrics.length ? (
          <MetricGrid>
            {card.metrics.map((item) => (
              <MetricTile key={item.label} label={item.label} value={item.value} hint={item.hint ?? undefined} tone={item.tone} />
            ))}
          </MetricGrid>
        ) : null}
        {card.rows.map((item, index) => (
          <Row key={`${item.title}-${index}`} title={item.title} subtitle={item.subtitle} meta={item.meta} trailing={item.badge ? <StatusBadge label={item.badge.label} tone={item.badge.tone} /> : undefined} />
        ))}
        {card.empty ? <Text tone="muted">{card.empty}</Text> : null}
      </View>
    </Section>
  );
}

function Operations({ data, onOpenPerson }: { data: MobileStudent360; onOpenPerson: () => void }) {
  const { coach } = data;
  const [coachId, setCoachId] = useState<string>(coach.currentCoachId ?? coach.options[0]?.id ?? '');
  const [cadence, setCadence] = useState(coach.cadenceDays ? String(coach.cadenceDays) : '');
  const [overrideReason, setOverrideReason] = useState('');
  const [needsReason, setNeedsReason] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'info' | 'critical'; text: string } | null>(null);
  const assign = useAdminMutation((api, input: { studentId: string; coachId: string; cadenceDays?: string; overrideReason?: string; expectedRevision: string }, { idempotencyKey }) => assignCoach(api, input, idempotencyKey));
  const retry = useAdminMutation((api, input: { orderId: string; revision?: string }, { idempotencyKey }) => retryProvisioning(api, input.orderId, idempotencyKey, input.revision));
  const transferring = Boolean(coach.currentCoachId);

  async function onAssign() {
    setNotice(null);
    try {
      await assign.mutateAsync({
        expectedRevision: coach.revision!,
        studentId: data.studentProfileId,
        coachId,
        ...(cadence.trim() ? { cadenceDays: cadence.trim() } : {}),
        ...(overrideReason.trim() ? { overrideReason: overrideReason.trim() } : {}),
      });
      setNeedsReason(false);
      setOverrideReason('');
      setNotice({ tone: 'info', text: transferring ? 'Koçluk devredildi.' : 'Koç atandı.' });
    } catch (cause) {
      // Kapasite dolu: web ile aynı kural — atama ancak gerekçeyle (denetime yazılır).
      if (cause instanceof ApiError && cause.code === 'CAPACITY') setNeedsReason(true);
      setNotice({ tone: 'critical', text: adminErrorText(cause) ?? 'Koç atanamadı.' });
    }
  }

  async function onRetry(order: MobileStudent360['blockedOrders'][number]) {
    setNotice(null);
    try {
      const result = await retry.mutateAsync({ orderId: order.id, revision: order.revision ?? undefined });
      setNotice({ tone: result.succeeded ? 'info' : 'critical', text: `${order.packageName}: ${result.message}` });
    } catch (cause) {
      setNotice({ tone: 'critical', text: adminErrorText(cause) ?? 'Yeniden deneme başarısız.' });
    }
  }

  return (
    <Section title="Operasyon kısayolları" first>
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      <Button label="Kişi detayını aç" variant="secondary" onPress={onOpenPerson} testID="student-open-person" />
      <Text variant="label">{transferring ? 'Koç devret' : 'Koç ata'}</Text>
      {coach.options.length ? (
        <>
          <FilterChips label="Koç" value={coachId} onChange={setCoachId} options={coach.options.map((option) => ({ value: option.id, label: option.label }))} />
          <TextField label="Görüşme sıklığı (gün)" value={cadence} onChangeText={setCadence} keyboardType="number-pad" maxLength={3} testID="student-coach-cadence" />
          {needsReason ? <TextField label="Kapasite aşımı gerekçesi" value={overrideReason} onChangeText={setOverrideReason} maxLength={500} hint="En az 3 karakter; denetim kaydına yazılır." testID="student-coach-reason" /> : null}
          <Button label={transferring ? 'Devret' : 'Koç ata'} onPress={onAssign} disabled={!coach.revision || !coachId || assign.isPending || (needsReason && overrideReason.trim().length < 3)} loading={assign.isPending} testID="student-coach-submit" />
        </>
      ) : (
        <Text tone="muted">Aktif koç bulunamadı.</Text>
      )}
      {data.blockedOrders.map((order) => (
        <Button key={order.id} label={`${order.packageName} erişimini yeniden dene`} variant="secondary" onPress={() => void onRetry(order)} disabled={retry.isPending} testID={`student-retry-${order.id}`} />
      ))}
    </Section>
  );
}

/**
 * Yönetici bağlantı yönetimi (web Veli ve Branş öğretmenleri panelleri):
 * veli bağla / kaldır, branş öğretmeni bağla / kaldır. Uçlar web ile aynı.
 */
function ManageLinks({ studentProfileId, manage }: { studentProfileId: string; manage: NonNullable<MobileStudent360['manage']> }) {
  const [notice, setNotice] = useState<{ tone: 'info' | 'critical'; text: string } | null>(null);
  const [linkingParent, setLinkingParent] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const removeParent = useAdminMutation((api, id: string) => removeRelationship(api, id));
  const linkTeacher = useAdminMutation((api, input: { studentId: string; teacherId: string; subject: string }) => linkStudentTeacher(api, input));
  const unlinkTeacher = useAdminMutation((api, id: string) => unlinkStudentTeacher(api, id));
  const run: Run = async (action, success) => {
    setNotice(null);
    try {
      await action();
      setNotice({ tone: 'info', text: success });
      return true;
    } catch (cause) {
      setNotice({ tone: 'critical', text: adminErrorText(cause) ?? 'İşlemi şu an kaydedemedik. Lütfen tekrar dener misiniz?' });
      return false;
    }
  };
  const confirm = (title: string, body: string, action: () => void) => Alert.alert(title, body, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Kaldır', style: 'destructive', onPress: action }]);
  if (!manage.parents && !manage.teachers) return null;
  return (
    <>
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      {manage.parents ? (
        <Section title="Bağlı veliler" action={<Button label="Veli bağla" variant="secondary" onPress={() => setLinkingParent(true)} testID="student-parent-link-open" />}>
          {manage.parents.length ? (
            manage.parents.map((parent) => (
              <Row
                key={parent.id}
                title={parent.name}
                subtitle={parent.detail}
                trailing={<Button label="Kaldır" variant="quiet" disabled={removeParent.isPending} onPress={() => confirm('Veli bağlantısını kaldır', `${parent.name} bu öğrencinin verisini artık göremez.`, () => void run(() => removeParent.mutateAsync(parent.id), 'Veli bağlantısı kaldırıldı.'))} testID={`student-parent-remove-${parent.id}`} />}
              />
            ))
          ) : (
            <Text tone="muted">Aktif veli bağlantısı yok.</Text>
          )}
        </Section>
      ) : null}
      {manage.teachers ? (
        <Section title="Branş öğretmenleri">
          {manage.teachers.length ? (
            manage.teachers.map((link) => (
              <Row
                key={link.id}
                title={link.name}
                subtitle={link.subject}
                trailing={<Button label="Kaldır" variant="quiet" disabled={unlinkTeacher.isPending} onPress={() => confirm('Branş bağlantısını kaldır', `${link.name} · ${link.subject}`, () => void run(() => unlinkTeacher.mutateAsync(link.id), 'Branş bağlantısı kaldırıldı.'))} testID={`student-teacher-remove-${link.id}`} />}
              />
            ))
          ) : (
            <Text tone="muted">Henüz branş öğretmeni bağlı değil.</Text>
          )}
          <SearchPicker label="Öğretmen" options={manage.teacherOptions} value={teacherId} onChange={setTeacherId} testID="student-teacher" />
          <TextField label="Branş" value={subject} onChangeText={setSubject} placeholder="Matematik" testID="student-teacher-subject" />
          <Button
            label="Branş öğretmeni bağla"
            variant="secondary"
            disabled={!teacherId || subject.trim().length < 2 || linkTeacher.isPending}
            loading={linkTeacher.isPending}
            onPress={async () => {
              if (!teacherId) return;
              if (await run(() => linkTeacher.mutateAsync({ studentId: studentProfileId, teacherId, subject: subject.trim() }), 'Branş öğretmeni bağlandı.')) {
                setTeacherId(null);
                setSubject('');
              }
            }}
            testID="student-teacher-link"
          />
        </Section>
      ) : null}
      <LinkSheet visible={linkingParent} parentOptions={manage.parentOptions} fixedStudentId={studentProfileId} onClose={() => setLinkingParent(false)} onDone={(ok) => ok && setLinkingParent(false)} run={run} />
    </>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  card: { gap: space[2] },
});
