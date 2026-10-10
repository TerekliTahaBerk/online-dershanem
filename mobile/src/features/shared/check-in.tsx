import type { MobileCheckInHistoryItem, MobileCheckInState, MobileCheckInTarget } from '@contracts/yon';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { color, radius, space, tone } from '@/design/tokens';
import { ApiError } from '@/lib/api/errors';
import { fetchCheckIn, sendHelpFeedback, submitCheckIn, type CheckInPayload } from '@/lib/api/yon';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatDayMonth } from '@/lib/format/istanbul';

import { QueryView, useInvalidateWorkspace, usePullToRefresh, useWorkspaceQuery, type WorkspaceProduct } from './workspace-data';

/**
 * ORTAK CHECK-IN (OD + Yön) — web `app/panel/ogrenci/check-in` ile TEK
 * uygulama. Okuma `GET /api/panel/student/check-in` (aynı yükleyici), yazma
 * mevcut `POST /api/panel/student-check-ins`. Sunucu kuralları DEĞİŞMEDİ:
 * destek alanı (OD grubu veya — grubu olmayan öğrencide — koç ataması),
 * haftalık hak, açık yardım isteği tekilliği sunucuda doğrulanır. Gönderim
 * otomatik tekrarlanmaz; düğme gönderim sürerken kapalıdır.
 */
const ENERGY = { LOW: 'Enerjim düşük', STEADY: 'İdare eder', GOOD: 'Enerjim iyi' } as const;
const CONFIDENCE = { NEED_GUIDANCE: 'Yönlendirmeye ihtiyacım var', BUILDING: 'Yavaş yavaş oturuyor', CONFIDENT: 'Kendime güveniyorum' } as const;
const BARRIER = {
  NONE: 'Belirgin bir engel yok',
  NOT_UNDERSTANDING: 'Bir konuyu anlamıyorum',
  TIME_LOAD: 'Çalışma yükünü yetiştiremiyorum',
  ACCESS_TECH: 'Erişim veya cihaz sorunu var',
  NEED_EXAMPLE: 'Bir örneğe daha ihtiyacım var',
  OTHER: 'Başka bir şey zorluyor',
} as const;

const targetKey = (target: MobileCheckInTarget) => (target.kind === 'GROUP' ? `group:${target.groupId}` : `coach:${target.coachAssignmentId}`);

export default function CheckInScreen() {
  const bootstrap = useReadyBootstrap();
  const product: WorkspaceProduct = bootstrap.workspace?.activeProduct === 'OK' ? 'OK' : 'OD';
  const query = useWorkspaceQuery(product, 'check-in', (api, signal) => fetchCheckIn(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="check-in">
      <PageHeader title="Check-in" description="Bu hafta nasıl gittiğini fark et, gerekirse yardım iste. Puan da sıralama da yok; ailen bu alanı göremez." />
      <QueryView query={query} disabledTitle="Check-in şimdilik kapalı.">
        {(data) =>
          data.state === 'NO_PROFILE' ? (
            <EmptyState title="Hesabını hazırlıyoruz." body="Her şey hazır olduğunda check-in yapabileceksin." />
          ) : (
            <>
              <CheckInForm key={data.remaining} data={data} product={product} />
              <History items={data.history} product={product} />
            </>
          )
        }
      </QueryView>
    </Screen>
  );
}

function Options<T extends string>({ label, values, selected, onSelect, testPrefix }: { label: string; values: Record<T, string>; selected: T; onSelect: (value: T) => void; testPrefix: string }) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text variant="label" tone="secondary">{label}</Text>
      {(Object.keys(values) as T[]).map((value) => (
        <Row key={value} title={values[value]} selected={selected === value} onPress={() => onSelect(value)} testID={`${testPrefix}-${value}`} />
      ))}
    </View>
  );
}

function CheckInForm({ data, product }: { data: Extract<MobileCheckInState, { state: 'READY' }>; product: WorkspaceProduct }) {
  const { api } = useSession();
  const { product: theme } = useDesign();
  const invalidate = useInvalidateWorkspace(product);
  const [target, setTarget] = useState(data.targets[0] ? targetKey(data.targets[0]) : '');
  const [energy, setEnergy] = useState<keyof typeof ENERGY>('STEADY');
  const [confidence, setConfidence] = useState<keyof typeof CONFIDENCE>('BUILDING');
  const [barrier, setBarrier] = useState<keyof typeof BARRIER>('NONE');
  const [share, setShare] = useState(false);
  const [help, setHelp] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'critical' | 'warning'; text: string } | null>(null);
  const mutation = useMutation({ mutationFn: (payload: CheckInPayload) => submitCheckIn(api, payload) });
  const selected = data.targets.find((item) => targetKey(item) === target) ?? null;

  async function submit() {
    if (!selected || mutation.isPending || data.remaining < 1) return;
    setMessage(null);
    try {
      await mutation.mutateAsync({
        target: selected.kind === 'GROUP' ? { kind: 'GROUP', groupId: selected.groupId } : { kind: 'COACH', coachAssignmentId: selected.coachAssignmentId },
        energy,
        confidence,
        barrier,
        // Web ile aynı: yardım isteği paylaşımı zorunlu kılar (sunucu da doğrular).
        shareWithTeacher: share || help,
        helpRequested: help,
      });
      setMessage({ tone: 'success', text: help ? 'Check-in\'ini kaydettik ve yardım isteğini ilettik. Yalnız değilsin.' : "Check-in'ini kaydettik, teşekkürler!" });
      await invalidate();
    } catch (error) {
      const uncertain = error instanceof ApiError && (error.transient || error.kind === 'invalid_response');
      setMessage({
        tone: error instanceof ApiError && error.kind === 'conflict' ? 'warning' : 'critical',
        text: uncertain ? 'Bağlantı koptu; check-in\'in kaydedilmiş olabilir. Geçmişini yenileyip bir bakar mısın?' : error instanceof ApiError ? error.message : 'Check-in\'ini kaydedemedik. Bir daha dener misin?',
      });
      if (uncertain || (error instanceof ApiError && error.kind === 'conflict')) await invalidate();
    }
  }

  if (!data.targets.length) {
    return <EmptyState title="Check-in için henüz bir dersin ya da koçun yok." body="Bir derse kaydolduğunda ya da koçunla eşleştiğinde check-in burada açılacak." />;
  }

  return (
    <Section title="60 saniyelik check-in" first action={<StatusBadge label={`Bu hafta ${data.remaining} hakkın var`} tone="info" />}>
      <Text tone="secondary" variant="secondary">Bu bir sınav değil; doğru ya da yanlış cevap yok. Sadece nasıl hissettiğini anlamana yardımcı olur.</Text>
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      {data.targets.length > 1 ? (
        <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel="Hangi ders ya da koçluk için?">
          <Text variant="label" tone="secondary">Hangi ders ya da koçluk için?</Text>
          {data.targets.map((item) => (
            <Row key={targetKey(item)} title={item.name} subtitle={item.kind === 'GROUP' ? item.subject : 'Koçunla birlikte'} selected={target === targetKey(item)} onPress={() => setTarget(targetKey(item))} />
          ))}
        </View>
      ) : (
        <Row title="Check-in alanı" meta={data.targets[0].name} />
      )}
      <Options label="Enerjin nasıl?" values={ENERGY} selected={energy} onSelect={setEnergy} testPrefix="check-energy" />
      <Options label="Çalışmana ne kadar güveniyorsun?" values={CONFIDENCE} selected={confidence} onSelect={setConfidence} testPrefix="check-confidence" />
      <Options label="Seni en çok ne zorluyor?" values={BARRIER} selected={barrier} onSelect={setBarrier} testPrefix="check-barrier" />
      <View style={styles.toggle}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{product === 'OK' ? 'Koçum görsün' : 'Öğretmenim görsün'}</Text>
          <Text tone="muted" variant="meta">Kapalıysa yalnızca sen görürsün. Ailene hiçbir durumda gösterilmez.</Text>
        </View>
        <Switch value={share || help} disabled={help} onValueChange={setShare} trackColor={{ true: theme.accent }} accessibilityLabel={product === 'OK' ? 'Koçum görsün' : 'Öğretmenim görsün'} testID="check-share" />
      </View>
      <View style={[styles.toggle, styles.help]}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{product === 'OK' ? 'Koçumdan yardım istiyorum' : 'Öğretmenimden yardım istiyorum'}</Text>
          <Text tone="muted" variant="meta">Hemen haber veririz; 24 saat içinde sana küçük bir destek adımıyla dönmeye çalışırız. Açık bir isteğin varken yenisini açamazsın.</Text>
        </View>
        <Switch
          value={help}
          onValueChange={(value) => {
            setHelp(value);
            if (value) setShare(true);
          }}
          trackColor={{ true: theme.accent }}
          accessibilityLabel="Yardım istiyorum"
          testID="check-help"
        />
      </View>
      <Banner tone="critical" title="Burası acil durumlar için değil.">
        Kendine veya başkasına zarar verme riski varsa 112’yi ara ve güvendiğin bir yetişkine hemen söyle.
      </Banner>
      <Button label="Check-in'i kaydet" loading={mutation.isPending} disabled={data.remaining < 1 || !selected} onPress={() => void submit()} testID="check-submit" />
      {data.remaining < 1 ? <Text tone="muted" variant="meta">{"Bu haftaki iki check-in'ini yaptın, teşekkürler! Yeni hafta başlayınca yine bekleriz."}</Text> : null}
    </Section>
  );
}

function History({ items, product }: { items: MobileCheckInHistoryItem[]; product: WorkspaceProduct }) {
  return (
    <Section title="Geçmişim">
      {items.length ? items.map((item) => <HistoryItem key={item.id} item={item} product={product} />) : <Text tone="secondary">Henüz check-in yapmadın. İlkini yapmaya ne dersin?</Text>}
    </Section>
  );
}

function HistoryItem({ item, product }: { item: MobileCheckInHistoryItem; product: WorkspaceProduct }) {
  const { api } = useSession();
  const invalidate = useInvalidateWorkspace(product);
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: (helpful: boolean) => sendHelpFeedback(api, item.request!.id, { expectedVersion: item.request!.version, helpful }) });

  async function feedback(helpful: boolean) {
    if (mutation.isPending) return;
    setMessage(null);
    try {
      await mutation.mutateAsync(helpful);
      await invalidate();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Geri bildirimini kaydedemedik. Bir daha dener misin?');
      if (error instanceof ApiError && error.kind === 'conflict') await invalidate();
    }
  }

  const request = item.request;
  return (
    <View style={styles.history} testID={`check-history-${item.id}`}>
      <View style={styles.head}>
        <Text variant="bodyStrong" style={styles.historyTitle}>{item.targetName}</Text>
        <Text tone="muted" variant="meta">{`${formatDayMonth(item.createdAt)} · ${item.shared ? 'Paylaşıldı' : 'Yalnızca bende'}`}</Text>
      </View>
      <Text tone="secondary" variant="secondary">{`${ENERGY[item.energy]} · ${CONFIDENCE[item.confidence]} · ${BARRIER[item.barrier]}`}</Text>
      {request ? (
        <View style={styles.request}>
          <Text variant="bodyStrong">{request.status === 'OPEN' ? 'Yanıt yolda' : request.status === 'CLOSED' ? 'Destek tamamlandı' : 'Sana önerilen adım'}</Text>
          {request.actionLabel ? <Text tone="secondary">{request.actionLabel}</Text> : null}
          {message ? <Banner tone="critical">{message}</Banner> : null}
          {request.status === 'RESPONDED' && request.helpful === null ? (
            <View style={styles.actions}>
              <Button label="İşime yaradı" disabled={mutation.isPending} onPress={() => void feedback(true)} testID={`help-yes-${request.id}`} />
              <Button label="Henüz değil" variant="secondary" disabled={mutation.isPending} onPress={() => void feedback(false)} testID={`help-no-${request.id}`} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[1], marginTop: space[3] },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[3], padding: space[3], borderRadius: radius.card, borderWidth: 1, borderColor: color.border },
  help: { backgroundColor: tone.warning.soft, borderColor: tone.warning.soft },
  flex: { flex: 1 },
  history: { gap: space[1], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  historyTitle: { flexGrow: 1, flexShrink: 1, flexBasis: 160 },
  request: { gap: space[1], marginTop: space[2], padding: space[3], borderRadius: radius.card, backgroundColor: color.surfaceSubtle },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[1] },
});
