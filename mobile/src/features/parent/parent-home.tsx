import type { MobileParentHome } from '@contracts/parent';
import { View } from 'react-native';

import { Button, Row, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchParentHome } from '@/lib/api/parent';

import { useParentQuery } from './parent-context';
import { NavButton, ParentQueryView, ParentScreen, parentStyles, useParentNav, usePullToRefresh } from './parent-shared';

const STATUS_TONE = { ON_TRACK: 'success', NEEDS_SUPPORT: 'warning', LIMITED_DATA: 'neutral' } as const;

/**
 * VELİ · BUGÜN — web `app/panel/veli` (`loadParentCalmHome`). Durum cümlesi,
 * destek alanları ve "Sizden beklenen" eylemleri SUNUCUDA üretilir; mobil
 * risk skoru veya yeni bir durum türetmez. Eylem / yaklaşan hedefleri yalnız
 * yetkili menüdeki native ekranlara açılır (keyfi web adresi açılmaz).
 */
export default function ParentHomeScreen() {
  const query = useParentQuery('home', fetchParentHome);
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <ParentScreen title="Bugün" testID="parent-home" refresh={refresh}>
      {(child) => <ParentQueryView query={query} child={child}>{(home) => <HomeBody home={home} />}</ParentQueryView>}
    </ParentScreen>
  );
}

function HomeBody({ home }: { home: MobileParentHome }) {
  const nav = useParentNav();
  return (
    <>
      <Section title="Genel durum" first>
        <View style={parentStyles.row}>
          <StatusBadge label={home.status.label} tone={STATUS_TONE[home.status.code]} />
        </View>
        <Text>{home.status.sentence}</Text>
        {home.weekSummary ? <Text tone="secondary">{home.weekSummary}</Text> : null}
      </Section>

      {home.academic.supportAreas.length || home.digest.supportArea ? (
        <Section title="Göz atmanızda fayda var">
          {home.academic.supportAreas.map((line, index) => <Text key={`${index}-${line}`} tone="secondary">{line}</Text>)}
          {home.digest.supportArea ? <Text tone="secondary">{`Öğretmen özeti: ${home.digest.supportArea}`}</Text> : null}
        </Section>
      ) : null}

      {home.actions.length ? (
        <Section title="Sizden beklenen">
          {home.actions.map((action) => {
            const href = nav.hrefFor(action.navId);
            return (
              <View key={action.id} style={parentStyles.card} testID={`parent-action-${action.id}`}>
                <Text variant="bodyStrong">{action.title}</Text>
                <Text tone="secondary">{action.body}</Text>
                {href ? <Button label={action.ctaLabel} variant="secondary" onPress={() => nav.open(action.navId)} /> : null}
              </View>
            );
          })}
        </Section>
      ) : null}

      <Section title="Bu hafta">
        {[home.thisWeek.attendanceLabel, home.thisWeek.assignmentsLabel, home.thisWeek.planLabel].filter((line): line is string => Boolean(line)).map((line, index) => (
          <Text key={`${index}-${line}`} tone="secondary">{line}</Text>
        ))}
        {home.thisWeek.upcoming.map((item) => (
          <Row key={item.id} title={item.title} subtitle={item.detail} onPress={nav.hrefFor(item.navId) ? () => nav.open(item.navId) : undefined} />
        ))}
        {!home.thisWeek.attendanceLabel && !home.thisWeek.assignmentsLabel && !home.thisWeek.planLabel && !home.thisWeek.upcoming.length ? (
          <Text tone="secondary">Bu hafta için henüz bir kayıt oluşmadı.</Text>
        ) : null}
      </Section>

      <Section title="Akademik gelişim">
        {home.academic.examTrendSentence ? <Text>{home.academic.examTrendSentence}</Text> : null}
        {home.academic.subjectTrends.map((trend) => <Text key={trend.subject} tone="secondary">{trend.sentence}</Text>)}
        {home.academic.strengths.map((line, index) => <Text key={`${index}-${line}`} tone="secondary">{line}</Text>)}
        {!home.academic.examTrendSentence && !home.academic.subjectTrends.length && !home.academic.strengths.length ? (
          <Text tone="secondary">Eğilimi görebilmek için henüz yeterli kayıt yok. Dersler ve denemeler biriktikçe burada oluşacak.</Text>
        ) : null}
        <NavButton navId="analiz" label="Gelişimi aç" testID="parent-home-insights" />
      </Section>

      {home.coaching ? (
        <Section title="Yön Koçluk">
          {home.coaching.coachName ? <Row title="Koç" meta={home.coaching.coachName} /> : null}
          {home.coaching.weeklyGoal ? <Row title="Haftalık hedef" subtitle={home.coaching.weeklyGoal} /> : null}
          {home.coaching.planRealization ? <Text tone="secondary">{home.coaching.planRealization}</Text> : null}
          {home.coaching.sharedNote ? <Text tone="secondary">{`Koçun paylaştığı not: ${home.coaching.sharedNote}`}</Text> : null}
          <NavButton navId="coaching" label="Koçluğu aç" />
        </Section>
      ) : null}

      {home.digest.available ? (
        <Section title="Haftalık özet">
          <Text tone="secondary">{home.digest.published && home.digest.preview ? home.digest.preview : 'Öğretmen haftalık özeti yayınladığında burada okuyabilirsiniz.'}</Text>
          <NavButton navId="weekly-digest" label="Haftalık özeti aç" />
        </Section>
      ) : null}
    </>
  );
}
