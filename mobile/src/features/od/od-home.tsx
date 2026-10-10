import type { MobileProductCode } from '@contracts/bootstrap';
import type { MobileOdAction, MobileOdHome, MobileOdTodayItem, MobileOdWeek } from '@contracts/student';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { PRODUCT_FALLBACK_LABEL } from '@/design/products';
import { ProductLogo } from '@/design/brand';
import { color, radius, space } from '@/design/tokens';
import { openOnWeb, webUrlFor } from '@/features/shell/web-continuation';
import { fetchOdHome } from '@/lib/api/student';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatLongDate, formatTime, greetingFor, isSameIstanbulDay, formatShortDateTime } from '@/lib/format/istanbul';
import { hrefForOdTarget } from '@/navigation/od-targets';
import { expoHrefFor, targetForNavId } from '@/navigation/route-map';

import { QueryView, useOdNavigation, useOdQuery, usePullToRefresh } from './shared';

/**
 * OD · BUGÜN — web `app/panel/ogrenci/page.tsx`'in OD kapsamlı native
 * karşılığı. Veri `GET /api/panel/student/home?scope=OD`: öncelik ve akış
 * sunucudan gelir; burada kural üretilmez. Yön planı ve Deneme Ligi verisi
 * bu ekrana HİÇ gelmez; erişilen diğer çalışma alanları yalnız ayrı giriş
 * satırı olarak gösterilir.
 */

const KIND_LABEL: Record<MobileOdTodayItem['kind'], string> = {
  LESSON: 'Ders',
  ASSIGNMENT_DUE: 'Ödev teslimi',
  RECOVERY: 'Telafi',
  REVIEW: 'Tekrar',
  OTHER: 'Çalışma',
};

function itemTime(item: MobileOdTodayItem, now: Date): string | null {
  if (item.isFlexible) return null;
  const value = item.startsAt ?? item.dueAt;
  if (!value) return null;
  return isSameIstanbulDay(value, now) ? formatTime(value) : formatShortDateTime(value);
}

function summaryLine(home: MobileOdHome): string | undefined {
  const lessons = home.today.filter((item) => item.kind === 'LESSON').length + (home.now?.kind === 'OPEN_LESSON' ? 1 : 0);
  const due = home.today.filter((item) => item.kind === 'ASSIGNMENT_DUE').length;
  const parts = [lessons ? `${lessons} ders` : null, due ? `${due} ödev teslimi` : null, home.week?.dueReviews ? `${home.week.dueReviews} tekrar` : null].filter(Boolean);
  if (parts.length) return `Bugün ${parts.join(' · ')}.`;
  return home.now ? undefined : 'Bugün için planlanmış bir çalışma görünmüyor.';
}

export default function OdHomeScreen() {
  const query = useOdQuery('od-home', (api, signal) => fetchOdHome(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  const bootstrap = useReadyBootstrap();
  const now = new Date();
  const name = query.data?.firstName ?? bootstrap.user.fullName?.split(' ')[0] ?? null;

  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="od-home">
      <PageHeader
        title={`${greetingFor(now)}${name ? `, ${name}` : ''}.`}
        context={<Text tone="muted" variant="meta">{formatLongDate(now)}</Text>}
        description={query.data?.state === 'READY' ? summaryLine(query.data) : undefined}
      />
      <QueryView query={query}>{(home) => <OdHomeBody home={home} now={now} />}</QueryView>
    </Screen>
  );
}

function OdHomeBody({ home, now }: { home: MobileOdHome; now: Date }) {
  if (home.state === 'NO_PROFILE') {
    return <EmptyState title="Profilin hazırlanıyor." body="Öğrenci profilin tamamlandığında derslerin ve çalışmaların burada görünecek." />;
  }
  return (
    <>
      <NowBlock action={home.now} />
      <TodaySection items={home.today} now={now} />
      {home.week ? <WeekSection week={home.week} /> : null}
      {home.insight ? <InsightSection sentence={home.insight.sentence} /> : null}
      <OtherWorkspaces />
    </>
  );
}

function NowBlock({ action }: { action: MobileOdAction | null }) {
  const nav = useOdNavigation();
  if (!action) {
    const insights = nav.has('analiz') ? 'analiz' : nav.has('progress') ? 'progress' : null;
    return (
      <View style={styles.now} testID="od-now-empty">
        <Text variant="caption" tone="muted">Şimdi</Text>
        <Text variant="sectionTitle" accessibilityRole="header">Bekleyen bir çalışma görünmüyor</Text>
        <Text tone="secondary">Derslerine göz atabilir veya gidişatını inceleyebilirsin.</Text>
        <View style={styles.actions}>
          {nav.has('lessons') && nav.navigation ? <Button label="Derslerim" variant="secondary" onPress={() => nav.push(expoHrefFor(targetForNavId(nav.navigation!, 'lessons')))} /> : null}
          {insights && nav.navigation ? <Button label="Gidişatıma Bak" variant="secondary" onPress={() => nav.push(expoHrefFor(targetForNavId(nav.navigation!, insights)))} /> : null}
        </View>
      </View>
    );
  }
  const href = hrefForOdTarget(action.target, nav.navigation);
  const webFallback = !href && webUrlFor(action.webPath);
  return (
    <View style={styles.now} testID="od-now">
      <Text variant="caption" tone="muted">Şimdi</Text>
      <Text variant="sectionTitle" accessibilityRole="header">{action.title}</Text>
      <Text tone="secondary">{[action.description, action.reason].filter(Boolean).join(' · ')}</Text>
      <View style={styles.actions}>
        {href ? (
          <Button label={action.ctaLabel} onPress={() => nav.push(href)} testID="od-now-cta" accessibilityHint={action.joinable ? 'Ders detayında katılım bağlantısı açılır.' : undefined} />
        ) : webFallback ? (
          <Button label="Web panelinde aç" variant="secondary" onPress={() => void openOnWeb(action.webPath)} />
        ) : null}
      </View>
    </View>
  );
}

function TodaySection({ items, now }: { items: MobileOdTodayItem[]; now: Date }) {
  const nav = useOdNavigation();
  return (
    <Section title="Bugün">
      {items.length ? (
        items.map((item) => {
          const href = hrefForOdTarget(item.target, nav.navigation);
          return (
            <Row
              key={item.id}
              testID={`od-today-${item.id}`}
              title={item.title}
              subtitle={item.subtitle}
              meta={itemTime(item, now)}
              leading={<StatusBadge label={KIND_LABEL[item.kind]} tone={item.kind === 'LESSON' ? 'info' : item.kind === 'RECOVERY' ? 'warning' : 'neutral'} />}
              onPress={href ? () => nav.push(href) : undefined}
            />
          );
        })
      ) : (
        <Text tone="secondary">Bugün için planlanmış bir ders veya teslim yok. Yeni ders veya ödev geldiğinde burada görünecek.</Text>
      )}
    </Section>
  );
}

function WeekSection({ week }: { week: MobileOdWeek }) {
  const nav = useOdNavigation();
  const assignments = nav.navigation ? expoHrefFor(targetForNavId(nav.navigation, 'assignments')) : null;
  return (
    <Section title="Bu hafta">
      <Row title="Dersler" meta={week.lessonsPlanned ? `${week.lessonsPlanned} ders` : 'Ders yok'} subtitle={week.lessonsRemainingToday ? `Bugün ${week.lessonsRemainingToday} ders kaldı` : null} />
      <Row
        title="Bu hafta teslim edilecekler"
        meta={week.assignmentsDue ? `${week.assignmentsCompleted}/${week.assignmentsDue} tamamlandı` : 'Teslim yok'}
        onPress={assignments && week.assignmentsDue ? () => nav.push(assignments) : undefined}
      />
      {week.pendingAssignments ? (
        <Row
          title="Bekleyen çalışmalar"
          meta={`${week.pendingAssignments}`}
          subtitle={week.overdueAssignments ? `${week.overdueAssignments} çalışmanın süresi geçti` : null}
          onPress={assignments ? () => nav.push(assignments) : undefined}
        />
      ) : null}
      {week.dueReviews !== null && week.dueReviews > 0 ? (
        <Row title="Bugünkü tekrarlar" meta={`${week.dueReviews}`} onPress={nav.has('review-recovery') ? () => nav.push(hrefForOdTarget({ type: 'review' }, nav.navigation)) : undefined} />
      ) : null}
    </Section>
  );
}

function InsightSection({ sentence }: { sentence: string }) {
  const nav = useOdNavigation();
  const target = nav.has('analiz') ? 'analiz' : nav.has('progress') ? 'progress' : null;
  return (
    <Section title="Akademik gidişat">
      <Text tone="secondary">{sentence}</Text>
      {target && nav.navigation ? <Button label="Gidişatım" variant="quiet" onPress={() => nav.push(expoHrefFor(targetForNavId(nav.navigation!, target)))} /> : null}
    </Section>
  );
}

/**
 * Erişilen diğer çalışma alanları: yalnız sunucunun ACTIVE dediği ürünler,
 * ayrı ve açıkça etiketli giriş satırı olarak. İçerikleri (Yön görevleri,
 * Deneme Ligi sonuçları) burada gösterilmez; seçim sunucuya yazılır.
 */
function OtherWorkspaces() {
  const bootstrap = useReadyBootstrap();
  const { selectWorkspace } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState<MobileProductCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const others = (bootstrap.workspace?.products ?? []).filter((product) => product.state === 'ACTIVE' && product.code !== 'OD');
  if (!others.length) return null;

  async function open(code: MobileProductCode) {
    setPending(code);
    setError(null);
    try {
      await selectWorkspace(code);
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Çalışma alanı değiştirilemedi.');
    } finally {
      setPending(null);
    }
  }

  return (
    <Section title="Diğer çalışma alanların">
      {error ? <Banner tone="critical">{error}</Banner> : null}
      {others.map((product) => (
        <Row
          key={product.code}
          testID={`od-other-${product.code}`}
          title={product.label || PRODUCT_FALLBACK_LABEL[product.code]}
          subtitle="Ayrı çalışma alanı · geçiş yapar"
          leading={<ProductLogo product={product.code} size={32} />}
          trailing={pending === product.code ? <Text tone="muted">…</Text> : null}
          disabled={pending !== null}
          onPress={() => void open(product.code)}
          accessibilityHint={`${product.label} çalışma alanına geçer`}
        />
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  now: { borderWidth: 1, borderColor: color.border, borderRadius: radius.card, padding: space[4], gap: space[1] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] },
});
