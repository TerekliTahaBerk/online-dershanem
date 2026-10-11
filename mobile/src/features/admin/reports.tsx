import type { MobileAdminReports } from '@contracts/admin';
import { StyleSheet, View } from 'react-native';

import { PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { color, radius, space, type Tone } from '@/design/tokens';
import { fetchAdminReports } from '@/lib/api/admin';

import { QueryView, useAdminQuery, usePullToRefresh } from './shared';
import { MetricGrid, MetricTile } from './ui';

const SLO_TONE: Record<MobileAdminReports['slo'][number]['status'], Tone> = { healthy: 'success', breached: 'critical', observing: 'info', insufficient_data: 'neutral' };
const pct = (value: number | null) => (value === null ? '—' : `%${value}`);

/**
 * YÖNETİM · RAPORLAR (Faz 2.1) — web `app/panel/yonetim/raporlar` ile AYNI
 * model (son 30 gün): ders tamamlama, katılım, ödevler, bayrağa bağlı
 * tekrar / plan / AI bölümleri, kritik yolculuk SLO'ları, öğretmen ve grup
 * ilerlemesi. Salt okuma; CSV indirme mobil kapsamı dışında (E5).
 */
export default function AdminReportsScreen() {
  const query = useAdminQuery('reports', (api, signal) => fetchAdminReports(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-reports">
      <PageHeader title="Raporlar" description="Son 30 gün · eğitimin nabzı, sayılarla." />
      <QueryView query={query}>{(reports) => <Body reports={reports} />}</QueryView>
    </Screen>
  );
}

function Body({ reports }: { reports: MobileAdminReports }) {
  return (
    <>
      <Text tone="muted" variant="meta">{reports.lessonCount} ders</Text>
      <Section title="Özet" first>
        <MetricGrid>
          <MetricTile label="Ders tamamlama" value={`%${reports.noteRate}`} testID="report-note-rate" />
          <MetricTile label="Katılım" value={`%${reports.attendanceRate}`} />
          <MetricTile label="Aktif ödev" value={String(reports.activeAssignments)} />
          <MetricTile label="Gecikmiş çalışma" value={String(reports.overdueAssignments)} tone={reports.overdueAssignments ? 'warning' : 'neutral'} />
          <MetricTile label="Boş grup" value={String(reports.emptyGroups)} />
          <MetricTile label="Bekleyen ödeme" value={String(reports.pendingPayments)} />
        </MetricGrid>
      </Section>
      {reports.review ? (
        <Section title="Tekrar">
          <MetricGrid>
            <MetricTile label="7 günde yeniden çözüm" value={pct(reports.review.sevenDayRate)} hint={`${reports.review.eligible} uygun öğe · hedef ≥%60`} />
            <MetricTile label="Doğru geri çağırma" value={pct(reports.review.retentionRate)} hint={`${reports.review.retentionAttempts} deneme`} />
          </MetricGrid>
        </Section>
      ) : null}
      {reports.plan ? (
        <Section title="Haftalık plan">
          <MetricTile label="Plan görevi tamamlama" value={pct(reports.plan.completionRate)} hint={`${reports.plan.completed}/${reports.plan.generated} · pilot baz çizgisi`} />
        </Section>
      ) : null}
      {reports.ai ? (
        <Section title="AI taslakları">
          <MetricGrid>
            <MetricTile label="Taslak onayı" value={pct(reports.ai.approvalRate)} hint={`${reports.ai.reviewed} inceleme`} />
            <MetricTile label="Güvenli fallback" value={pct(reports.ai.fallbackRate)} hint={`${reports.ai.drafts} üretim`} />
            <MetricTile label="Hata işareti" value={pct(reports.ai.flagRate)} />
            <MetricTile label="Bilinen model maliyeti" value={reports.ai.knownCostUsd === null ? 'Eksik' : `$${reports.ai.knownCostUsd.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}`} />
          </MetricGrid>
        </Section>
      ) : null}
      <Section title="Kritik yolculuk SLO'ları">
        <Text tone="muted" variant="meta">En az 5 örnek olmadan durum kararı verilmez.</Text>
        {reports.slo.map((metric) => (
          <Row
            key={metric.key}
            testID={`report-slo-${metric.key}`}
            title={metric.label}
            subtitle={`${metric.display} · ${metric.sampleSize} örnek · ${metric.targetDisplay === null ? 'Hedef iş kararı bekliyor' : `${metric.comparison === 'gte' ? '≥' : '≤'}${metric.targetDisplay}`}`}
            trailing={<StatusBadge label={metric.statusLabel} tone={SLO_TONE[metric.status]} />}
          />
        ))}
      </Section>
      <Section title="Öğretmen ders tamamlama">
        {reports.teachers.map((teacher) => (
          <Progress key={teacher.name} label={teacher.name} detail={`${teacher.completed}/${teacher.total} · %${teacher.percent}`} percent={teacher.percent} />
        ))}
      </Section>
      <Section title="Grup ödev ilerlemesi">
        {reports.groups.map((group) => (
          <Progress key={group.id} label={group.name} detail={`${group.students} öğrenci · %${group.percent}`} percent={group.percent} />
        ))}
      </Section>
    </>
  );
}

function Progress({ label, detail, percent }: { label: string; detail: string; percent: number }) {
  return (
    <View style={styles.progress} accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: percent }}>
      <View style={styles.progressLabel}>
        <Text variant="bodyStrong" style={styles.flex}>{label}</Text>
        <Text tone="secondary" variant="meta">{detail}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, percent))}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { gap: space[1], paddingVertical: space[2] },
  progressLabel: { flexDirection: 'row', gap: space[2], alignItems: 'center' },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: color.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: color.primary },
});
