import { RECOVERY_CHECKPOINT_RESPONSES, type MobileRecovery, type MobileReviewQueue } from '@contracts/student';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, SegmentedTabs, StatusBadge, Text } from '@/design/primitives';
import { color, radius, space } from '@/design/tokens';
import { completeRecoveryItem, deferReview, fetchRecovery, fetchReviewQueue, respondReview, submitRecoveryCheckpoint } from '@/lib/api/student';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { formatDayMonth, formatShortDateTime } from '@/lib/format/istanbul';
import { newUuid } from '@/lib/ids';
import { expoHrefFor, targetForNavId } from '@/navigation/route-map';

import { QueryView, useInvalidateOd, useOdFlag, useOdNavigation, useOdQuery, usePullToRefresh } from './shared';
import { canOpenMaterial, useMaterialOpener } from './use-material-opener';

/**
 * OD · TEKRAR VE TELAFİ — web `app/panel/ogrenci/{tekrar,telafi}`.
 * Sekmeler YALNIZ ilgili bayrak açıkken görünür (`reviewQueue`,
 * `recoveryPackage`); sunucu yine her istekte bayrağı doğrular. Aralık
 * tekrarı algoritması sunucudadır (`lib/review-scheduler.ts`); burada
 * yalnız öğrencinin yanıtı gönderilir.
 */
type Tab = 'tekrar' | 'telafi';

export default function OdReviewRecoveryScreen({ initialTab, lessonId }: { initialTab?: Tab; lessonId?: string | null }) {
  const reviewOn = useOdFlag('reviewQueue');
  const recoveryOn = useOdFlag('recoveryPackage');
  const available: Tab[] = [...(reviewOn ? (['tekrar'] as const) : []), ...(recoveryOn ? (['telafi'] as const) : [])];
  const [tab, setTab] = useState<Tab>(initialTab && available.includes(initialTab) ? initialTab : (available[0] ?? 'tekrar'));
  const invalidate = useInvalidateOd();
  const refresh = usePullToRefresh(() => invalidate());
  if (!available.length) {
    return (
      <Screen testID="od-review-recovery">
        <PageHeader title="Tekrar ve telafi" />
        <EmptyState title="Bu bölüm şimdilik kapalı." body="Açıldığında seni burada bekliyor olacak." />
      </Screen>
    );
  }
  return (
    <Screen testID="od-review-recovery" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <PageHeader title="Tekrar ve telafi" />
      {available.length > 1 ? (
        <SegmentedTabs
          label="Tekrar ve telafi"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'tekrar', label: 'Tekrar' },
            { value: 'telafi', label: 'Telafi' },
          ]}
        />
      ) : null}
      {tab === 'tekrar' ? <ReviewTab /> : <RecoveryTab lessonId={lessonId ?? null} />}
    </Screen>
  );
}

/* ---------------- Tekrar ---------------- */

function ReviewTab() {
  const query = useOdQuery('review-queue', (api, signal) => fetchReviewQueue(api, signal));
  return (
    <QueryView query={query} disabledTitle="Tekrarlar şimdilik kapalı.">
      {(data) => <ReviewBody data={data} onRefresh={() => void query.refetch()} />}
    </QueryView>
  );
}

const REVIEW_CHOICES = [
  { value: 'WRONG' as const, label: 'Yanlış' },
  { value: 'UNSURE' as const, label: 'Emin değilim' },
  { value: 'CORRECT' as const, label: 'Doğru' },
];

function ReviewBody({ data, onRefresh }: { data: MobileReviewQueue; onRefresh: () => void }) {
  if (data.state === 'NO_PROFILE') return <EmptyState title="Tekrarlarını hazırlıyoruz." body="Çok yakında burada olacak." />;
  return (
    <>
      <Text tone="secondary">{`Bugün için birkaç kısa tekrar ayırdık (en fazla ${data.dailyLimit}). Yanlış yapmak ya da emin olmamak sorun değil; ilerlemen silinmez.`}</Text>
      <Text tone="muted" variant="meta">{`${data.activeCount} aktif · ${data.masteredCount} öğrenildi`}</Text>
      {data.items.length ? (
        data.items.map((item) => <ReviewItem key={item.id} item={item} />)
      ) : (
        <EmptyState title="Bugünlük tekrarların bitti." body="Bir sonraki tekrar zamanı geldiğinde burada olacak." action={<Button label="Yenile" variant="quiet" onPress={onRefresh} />} />
      )}
    </>
  );
}

function ReviewItem({ item }: { item: Extract<MobileReviewQueue, { state: 'READY' }>['items'][number] }) {
  const { api } = useSession();
  const invalidate = useInvalidateOd();
  const [noteOpen, setNoteOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'critical'; text: string } | null>(null);
  // Bir öğe için tek mantıksal yanıt: ağ belirsizliğinde tekrar aynı anahtarla.
  const key = useRef<{ response: string; key: string } | null>(null);
  const respond = useMutation({ mutationFn: (input: { response: 'WRONG' | 'UNSURE' | 'CORRECT'; idempotencyKey: string }) => respondReview(api, { itemId: item.id, ...input }) });
  const defer = useMutation({ mutationFn: () => deferReview(api, item.id) });
  const busy = respond.isPending || defer.isPending;

  async function answer(response: 'WRONG' | 'UNSURE' | 'CORRECT') {
    setMessage(null);
    if (!key.current || key.current.response !== response) key.current = { response, key: newUuid() };
    try {
      const result = await respond.mutateAsync({ response, idempotencyKey: key.current.key });
      key.current = null;
      setMessage({ tone: 'success', text: result.status === 'MASTERED' ? 'Harika, bu konuyu artık biliyorsun!' : result.nextDueAt ? `Tamam, ${formatDayMonth(result.nextDueAt)} tarihinde bu soruya tekrar bakacağız.` : 'Yanıtını kaydettik.' });
      await invalidate();
    } catch (error) {
      if (!(error instanceof ApiError && error.transient)) key.current = null;
      setMessage({ tone: 'critical', text: error instanceof ApiError ? error.message : 'Yanıtını kaydedemedik. Bir daha dener misin?' });
    }
  }

  async function postpone() {
    setMessage(null);
    try {
      await defer.mutateAsync();
      setMessage({ tone: 'success', text: 'Tamam, bu tekrarı yarına bıraktık.' });
      await invalidate();
    } catch (error) {
      setMessage({ tone: 'critical', text: error instanceof ApiError ? error.message : 'Ertelenemedi.' });
    }
  }

  return (
    <View style={styles.card} testID={`review-${item.id}`}>
      <Text variant="bodyStrong">{item.title}</Text>
      <Text tone="muted" variant="meta">{item.sourceReference}</Text>
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      {item.solutionNote ? (
        <>
          <Button label={noteOpen ? 'Çözüm notunu gizle' : 'Çözüm notunu göster'} variant="quiet" onPress={() => setNoteOpen((value) => !value)} />
          {noteOpen ? <Text tone="secondary">{item.solutionNote}</Text> : null}
        </>
      ) : null}
      <Text variant="label" tone="secondary">Bu soruyu bu sefer nasıl çözdün?</Text>
      <View style={styles.choices}>
        {REVIEW_CHOICES.map((choice) => (
          <View key={choice.value} style={styles.choice}>
            <Button testID={`review-${item.id}-${choice.value}`} label={choice.label} variant="secondary" disabled={busy} loading={respond.isPending && respond.variables?.response === choice.value} onPress={() => void answer(choice.value)} />
          </View>
        ))}
      </View>
      <Button testID={`review-${item.id}-defer`} label="Yarına ertele" variant="quiet" disabled={busy} onPress={() => void postpone()} />
    </View>
  );
}

/* ---------------- Telafi ---------------- */

const CHECKPOINT_LABEL: Record<(typeof RECOVERY_CHECKPOINT_RESPONSES)[number], string> = { NOT_YET: 'Henüz değil', NEED_HELP: 'Yardım istiyorum', READY: 'Hazırım' };

function RecoveryTab({ lessonId }: { lessonId: string | null }) {
  const query = useOdQuery('recovery', (api, signal) => fetchRecovery(api, signal));
  return (
    <QueryView query={query} disabledTitle="Telafiler şimdilik kapalı.">
      {(data) => <RecoveryBody data={data} lessonId={lessonId} />}
    </QueryView>
  );
}

function RecoveryBody({ data, lessonId }: { data: MobileRecovery; lessonId: string | null }) {
  if (data.state === 'NO_PROFILE') return <EmptyState title="Hesabını hazırlıyoruz." body="Her şey hazır olduğunda telafilerini burada göreceksin." />;
  if (!data.packages.length) return <EmptyState title="Bekleyen telafin yok." body="Bir dersi kaçırırsan öğretmenin senin için bir telafi hazırlar; burada bulursun." />;
  // Bağlantıdaki ders öne alınır (web ile aynı sıralama kuralı).
  const ordered = lessonId ? [...data.packages].sort((a, b) => (a.lessonId === lessonId ? -1 : b.lessonId === lessonId ? 1 : 0)) : data.packages;
  return (
    <>
      <Text tone="secondary">Kaçırdığın dersi kısa sürede yakalayabilirsin: konu özeti, materyal ve küçük bir çalışma seni sırayla bekliyor.</Text>
      {ordered.map((item) => (
        <RecoveryPackage key={item.id} item={item} highlighted={item.lessonId === lessonId} />
      ))}
    </>
  );
}

type RecoveryPackageRow = Extract<MobileRecovery, { state: 'READY' }>['packages'][number];

function RecoveryPackage({ item, highlighted }: { item: RecoveryPackageRow; highlighted: boolean }) {
  const { api } = useSession();
  const invalidate = useInvalidateOd();
  const nav = useOdNavigation();
  const opener = useMaterialOpener();
  const [message, setMessage] = useState<{ tone: 'success' | 'critical'; text: string } | null>(null);
  const completeItem = useMutation({ mutationFn: (itemId: string) => completeRecoveryItem(api, item.id, itemId) });
  const checkpoint = useMutation({ mutationFn: (response: (typeof RECOVERY_CHECKPOINT_RESPONSES)[number]) => submitRecoveryCheckpoint(api, item.id, response) });
  const done = item.status === 'COMPLETED';
  const busy = completeItem.isPending || checkpoint.isPending;

  async function run<T>(action: () => Promise<T>, success: (result: T) => string) {
    setMessage(null);
    try {
      const result = await action();
      setMessage({ tone: 'success', text: success(result) });
      await invalidate();
    } catch (error) {
      setMessage({ tone: 'critical', text: error instanceof ApiError ? error.message : 'Kaydedemedik. Bir daha dener misin?' });
    }
  }

  return (
    <View style={[styles.card, highlighted && styles.highlight]} testID={`recovery-${item.id}`}>
      <View style={styles.headerRow}>
        <Text variant="bodyStrong" style={styles.flex}>{item.lessonTitle}</Text>
        <StatusBadge label={done ? 'Tamamlandı' : 'Bekliyor'} tone={done ? 'success' : 'warning'} />
      </View>
      <Text tone="muted" variant="meta">{`Ders: ${formatDayMonth(item.lessonDate)} · Son tarih: ${formatShortDateTime(item.dueAt)}`}</Text>
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      <Section title="Konu özeti" first>
        <Text tone="secondary">{item.summaryTopic}</Text>
        {item.sharedNote ? <Text tone="secondary">{item.sharedNote}</Text> : null}
        {item.outcomeTitles.length ? <Text tone="muted" variant="meta">{item.outcomeTitles.join(' · ')}</Text> : null}
        <Text tone="secondary">{item.summaryNextStep}</Text>
      </Section>
      <Section title="Adımlar">
        {item.items.map((step) => {
          const material = step.target.type === 'material' ? step.target : null;
          const openable = material ? canOpenMaterial(material) : false;
          const assignmentsHref = step.target.type === 'assignments' && nav.navigation ? expoHrefFor(targetForNavId(nav.navigation, 'assignments')) : null;
          return (
            <View key={step.id} style={styles.step}>
              <Row title={step.title} trailing={<StatusBadge label={step.completed ? 'Tamamlandı' : step.kind === 'MATERIAL' ? 'Materyal' : 'Çalışma'} tone={step.completed ? 'success' : 'neutral'} />} />
              {opener.errorFor(material?.materialId ?? '') ? <Banner tone="critical">{opener.errorFor(material?.materialId ?? '')}</Banner> : null}
              <View style={styles.choices}>
                {material && openable ? (
                  <Button
                    label="Materyali aç"
                    variant="secondary"
                    loading={opener.openingId === material.materialId}
                    onPress={() => void opener.open({ id: material.materialId, hasFile: material.hasFile, url: material.url, fileName: null, mimeType: null, kind: 'LINK', title: step.title })}
                  />
                ) : null}
                {assignmentsHref ? <Button label="Çalışmalara git" variant="secondary" onPress={() => nav.push(assignmentsHref)} /> : null}
                {!step.completed && !done ? (
                  <Button testID={`recovery-step-${step.id}`} label="Tamamladım" disabled={busy} loading={completeItem.isPending && completeItem.variables === step.id} onPress={() => void run(() => completeItem.mutateAsync(step.id), (result) => (result.completed ? 'Telafi tamamlandı.' : 'Adım tamamlandı olarak kaydedildi.'))} />
                ) : null}
              </View>
            </View>
          );
        })}
      </Section>
      <Section title="Mini kontrol">
        <Text tone="secondary">{item.checkpointPrompt}</Text>
        {item.checkpointResponse ? <Text tone="muted" variant="meta">{`Son yanıtın: ${CHECKPOINT_LABEL[item.checkpointResponse]}`}</Text> : null}
        {!done ? (
          <View style={styles.choices}>
            {RECOVERY_CHECKPOINT_RESPONSES.map((response) => (
              <Button
                key={response}
                testID={`recovery-${item.id}-${response}`}
                label={CHECKPOINT_LABEL[response]}
                variant={item.checkpointResponse === response ? 'primary' : 'secondary'}
                disabled={busy}
                loading={checkpoint.isPending && checkpoint.variables === response}
                onPress={() => void run(() => checkpoint.mutateAsync(response), (result) => (result.completed ? 'Telafiyi tamamladın, aferin!' : 'Yanıtını kaydettik.'))}
              />
            ))}
          </View>
        ) : null}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space[2], borderWidth: 1, borderColor: color.border, borderRadius: radius.card, padding: space[4] },
  highlight: { borderColor: color.borderStrong, backgroundColor: color.surfaceSubtle },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  choice: { flexGrow: 1 },
  step: { gap: space[1] },
});
