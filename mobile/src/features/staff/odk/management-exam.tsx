import { parseOdkExamWorkspace, type OdkExamTab, type OdkExamWorkspaceView } from '@contracts/odk-management-exam';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { FilterChips, MetricGrid, MetricTile } from '@/features/admin/ui';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { openOnWeb } from '../../shell/web-continuation';
import { QueryView, usePullToRefresh } from '../shared';
import { AssignmentWrites, ContentWrites, ScheduleWrites, SessionWrites } from './management-exam-writes';
import { AttemptSheet } from './management-operations';
import { useOdkManagementQuery } from './management-shared';

/**
 * K03 · DENEME ÇALIŞMA ALANI — web `/panel/odk/yonetim/sinavlar/[id]`
 * (aynı yükleyici, aynı izinli sekmeler). K03a okuma; K03b hazırlık yazmaları
 * (zamanlama/güvenlik, hazır/planla, oturumlar, katılımcılar, JSON içe aktarma,
 * PDF); bütünlük incelemesi K04 paneliyle. Soru bazında düzenleme ve
 * puanlama/yayın (K03c) web'de açılır.
 */
const base = (examId: string) => `/api/panel/odk/management/exams/${encodeURIComponent(examId)}`;
const date = (value: string | null) => (value ? formatShortDateTime(value) : '—');
const net = (value: number | null) => (value === null ? '—' : value.toFixed(2));
const WRITE_LATER: Partial<Record<OdkExamTab, string>> = {
  sorular: 'Soru bazında anahtar, zorluk ve kazanım düzenleme (toplu değişiklik için İçerik sekmesindeki JSON içe aktarma kullanılabilir)',
  puanlama: 'Puanlama, yeniden puanlama ve yayın',
};

export function OdkManagementExamScreen({ examId, initialTab }: { examId: string; initialTab?: string }) {
  const bootstrap = useReadyBootstrap();
  const allowed = (bootstrap.user.role === 'ADMIN' || bootstrap.user.role === 'TEACHER') && bootstrap.workspace?.activeProduct === 'ODK';
  const [tab, setTab] = useState<string | undefined>(initialTab);
  const [filter, setFilter] = useState('tumu');
  const qs = new URLSearchParams({ ...(tab ? { sekme: tab } : {}), ...(tab === 'sorular' && filter !== 'tumu' ? { filtre: filter } : {}) }).toString();
  const query = useOdkManagementQuery(`exam:${examId}:${qs}`, async (api, signal) => {
    const parsed = parseOdkExamWorkspace(await api.request(`${base(examId)}${qs ? `?${qs}` : ''}`, { signal }));
    if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    return parsed.value;
  });
  const refresh = usePullToRefresh(() => query.refetch());
  if (!allowed) {
    return (
      <Screen testID="odk-management-exam">
        <EmptyState title="Bu ekran Deneme Ligi yönetim çalışma alanında açılır" />
      </Screen>
    );
  }
  return (
    <Screen testID="odk-management-exam" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <QueryView query={query}>{(data) => <Workspace data={data} examId={examId} onTab={setTab} onFilter={setFilter} onChanged={() => void query.refetch()} />}</QueryView>
    </Screen>
  );
}

function Workspace({ data, examId, onTab, onFilter, onChanged }: { data: OdkExamWorkspaceView; examId: string; onTab: (tab: OdkExamTab) => void; onFilter: (filter: string) => void; onChanged: () => void }) {
  const { exam, counts } = data;
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const later = WRITE_LATER[data.tab];
  return (
    <>
      <PageHeader title={exam.title} description={`${exam.description}. Sonuçlar yayınlanmadan öğrenciye açılmaz.`} />
      <View style={styles.badges}>
        <StatusBadge label={exam.familyCode} />
        <StatusBadge label={exam.statusLabel} tone={exam.tone} />
        <Text tone="muted" variant="meta">{`sürüm ${exam.versionNumber} · ${exam.durationMinutes} dk · başlangıç ${date(exam.startsAt)}`}</Text>
      </View>
      <Text tone="secondary" variant="secondary">{`Atanan ${counts.assigned} · Katılım ${counts.submitted}/${counts.attempts}`}</Text>
      {data.primaryAction && data.primaryAction.tab !== data.tab ? <Button label={data.primaryAction.label} onPress={() => onTab(data.primaryAction!.tab)} testID="exam-primary" /> : null}
      <FilterChips label="Çalışma alanı sekmesi" value={data.tab} onChange={onTab} options={data.tabs.map((item) => ({ value: item.id, label: item.label }))} />
      {later ? (
        <Banner tone="info" action={<Button label="Web'de aç" variant="secondary" onPress={() => void openOnWeb(`/panel/odk/yonetim/sinavlar/${encodeURIComponent(examId)}?sekme=${data.tab}`)} />}>
          {`${later} şimdilik web panelinde.`}
        </Banner>
      ) : null}

      {data.tab === 'genel' ? (
        <>
          <Section first title="Yaşam döngüsü">
            <Row title="Taslak" meta={date(exam.createdAt)} />
            <Row title="Sürüm kilidi" meta={date(exam.contentLockedAt)} />
            <Row title="Planlandı" meta={date(exam.publishedAt)} />
            <Row title="Pencere" subtitle={`${date(exam.startsAt)} – ${date(exam.endsAt)}${exam.lateEntryMinutes ? ` · ${exam.lateEntryMinutes} dk geç giriş` : ''}`} />
            <Row title="Sonuç yayını" meta={date(exam.resultsReleasedAt)} />
            <Row title="Meet" meta={exam.meet} />
          </Section>
          <Section title="Katılım">
            <MetricGrid>
              <MetricTile label="Atanan" value={String(counts.assigned)} />
              <MetricTile label="Başlayan" value={String(counts.attempts)} />
              <MetricTile label="Teslim" value={String(counts.submitted)} />
              <MetricTile label="Puanlandı" value={String(counts.scored)} />
            </MetricGrid>
          </Section>
          {data.issues.total ? (
            <Section title="Hazırlık sorunları">
              {data.issues.items.map((issue, index) => <Row key={index} title={`${issue.questionNumber ? `Soru ${issue.questionNumber}: ` : ''}${issue.message}`} trailing={<StatusBadge label={issue.level === 'error' ? 'Engel' : 'Uyarı'} tone={issue.level === 'error' ? 'critical' : 'warning'} />} />)}
              {data.issues.total > data.issues.items.length ? <Text tone="muted" variant="meta">{`+${data.issues.total - data.issues.items.length} sorun daha`}</Text> : null}
            </Section>
          ) : null}
        </>
      ) : null}

      {data.files ? (
        <Section first title="Dosyalar">
          {data.files.length ? data.files.map((file) => <Row key={file.id} title={file.fileName} meta={file.type} />) : <EmptyState title="Yüklenmiş dosya yok" />}
        </Section>
      ) : null}
      {data.files ? <ContentWrites data={data} examId={examId} onChanged={onChanged} /> : null}

      {data.questions ? (
        <Section first title="Sorular">
          <FilterChips label="Soru süzgeci" value={data.questions.filter} onChange={onFilter} options={[{ value: 'tumu', label: 'Tümü', count: data.questions.counts.tumu }, { value: 'kazanimsiz', label: 'Kazanımsız', count: data.questions.counts.kazanimsiz }, { value: 'anahtarsiz', label: 'Anahtarsız', count: data.questions.counts.anahtarsiz }]} />
          {data.questions.rows.length ? data.questions.rows.map((question) => (
            <Row key={question.id} title={`Soru ${question.number} · ${question.section}`} subtitle={`Anahtar ${question.correctOption ?? '—'} · ${question.outcomeCount} kazanım${question.hasPrimaryOutcome ? ' (birincil var)' : ''}${question.bookletPage ? ` · kitapçık s. ${question.bookletPage}` : ''}`} trailing={!question.correctOption ? <StatusBadge label="Anahtarsız" tone="warning" /> : undefined} />
          )) : <EmptyState title="Süzgece uyan soru yok" />}
        </Section>
      ) : null}

      {data.sessions ? (
        <Section first title="Oturumlar">
          {data.sessions.map((item) => <Row key={item.key} title={item.title} subtitle={`${item.sections.join(', ')} · ${item.durationMinutes} dk${item.breakAfterMinutes ? ` · ardından ${item.breakAfterMinutes} dk ara` : ''}`} />)}
        </Section>
      ) : null}
      {data.sessions ? <SessionWrites key={data.revision} data={data} examId={examId} onChanged={onChanged} /> : null}

      {data.schedule ? (
        <Section first title="Zamanlama ve güvenlik">
          <Row title="Pencere" subtitle={`${date(exam.startsAt)} – ${date(exam.endsAt)}`} />
          <Row title="Süre" meta={`${exam.durationMinutes} dk`} />
          <Row title="Tam ekran" meta={data.schedule.fullscreenLabel} />
          <Row title="Kopyala / yapıştır" meta={data.schedule.blockCopyPaste ? 'Engellenir' : 'Serbest'} />
          <Row title="Sekme değişimi izleme" meta={data.schedule.trackVisibility ? 'Açık' : 'Kapalı'} />
          <Row title="Ek süre" meta={`${data.schedule.allowExtraTimeMinutes} dk`} />
          <Row title="Otomatik teslim" meta={data.schedule.autoSubmit ? 'Açık' : 'Kapalı'} />
        </Section>
      ) : null}
      {data.schedule ? <ScheduleWrites key={data.revision} data={data} examId={examId} onChanged={onChanged} /> : null}
      {data.assignments ? <AssignmentWrites data={data} examId={examId} onChanged={onChanged} /> : null}
      {data.previews ? (
        <Section first title="Önizleme">
          <Text tone="muted" variant="meta">Önizleme gerçek sınav oturumu başlatmaz; süre işlemez ve cevap kaydı oluşmaz.</Text>
          {data.previews.map((preview) => (
            <View key={preview.kind} style={styles.preview} testID={`preview-${preview.kind}`}>
              <Text variant="bodyStrong">{preview.label}</Text>
              <Text tone="secondary" variant="secondary">{preview.disclaimer}</Text>
              {preview.lines.map((line, index) => <Text key={index}>{`• ${line}`}</Text>)}
            </View>
          ))}
        </Section>
      ) : null}

      {data.live ? (
        <Section first title="Canlı durum">
          <MetricGrid>
            <MetricTile label="Başlamadı" value={String(data.live.notStarted)} />
            <MetricTile label="Devam ediyor" value={String(data.live.inProgress)} />
            <MetricTile label="Bağlantı koptu" value={String(data.live.disconnected)} tone={data.live.disconnected ? 'warning' : 'neutral'} />
            <MetricTile label="Teslim" value={String(data.live.submitted)} />
            <MetricTile label="Otomatik teslim" value={String(data.live.autoSubmitted)} />
            <MetricTile label="İnceleme" value={String(data.live.review)} tone={data.live.review ? 'warning' : 'neutral'} />
          </MetricGrid>
          <Text tone="muted" variant="meta">Kayıt bazında izleme ve müdahale için menüdeki Canlı Operasyon ekranını kullanın.</Text>
        </Section>
      ) : null}

      {data.integrity ? (
        <Section first title="Bütünlük incelemesi">
          {data.integrity.length ? data.integrity.map((row) => (
            <Row key={row.id} title={row.name} subtitle={`${row.statusLabel} · ${row.levelLabel}${row.reviewed ? ' · incelendi' : ''}`} trailing={<StatusBadge label={row.levelLabel} tone={row.levelTone} />} onPress={() => setAttemptId(row.id)} testID={`exam-integrity-${row.id}`} />
          )) : <EmptyState title="Henüz deneme kaydı yok" />}
        </Section>
      ) : null}

      {data.report ? (
        <>
          <Section first title="Özet">
            <MetricGrid>
              <MetricTile label="Teslim" value={`${data.report.submitted}/${data.report.participation}`} />
              <MetricTile label="Ortalama net" value={net(data.report.averageNet)} />
              <MetricTile label="Medyan net" value={net(data.report.medianNet)} />
              <MetricTile label="Bütünlük incelemesi" value={String(data.report.integrityReviewCount)} />
            </MetricGrid>
          </Section>
          <Section title="Bölüm ortalamaları">
            {data.report.sections.length ? data.report.sections.map((section) => <Row key={section.code} title={section.title} meta={`${net(section.averageNet)} net · ${section.averageAccuracy === null ? '—' : `%${Math.round(section.averageAccuracy)}`}`} />) : <Text tone="secondary">Puanlanmış teslim olunca bölüm ortalamaları burada görünür.</Text>}
          </Section>
          <Section title="En zayıf kazanımlar">
            {data.report.weakest.length ? data.report.weakest.map((row) => <Row key={row.outcomeId} title={row.title} meta={`%${row.accuracy}`} />) : <Text tone="secondary">Kazanım bazlı sonuç henüz yok.</Text>}
          </Section>
        </>
      ) : null}

      {data.history ? (
        <Section first title="Geçmiş">
          {data.history.length ? data.history.map((event) => <Row key={event.id} title={event.label} subtitle={event.actor} meta={date(event.at)} />) : <EmptyState title="Henüz kayıtlı olay yok." />}
        </Section>
      ) : null}

      {data.tab === 'genel' || data.tab === 'icerik' || data.tab === 'sorular' ? (
        <Section title={`Hazırlık durumu · ${data.readiness.done}/${data.readiness.items.length}`}>
          {data.readiness.items.map((item) => <Row key={item.id} title={item.label} subtitle={item.detail} trailing={<StatusBadge label={item.ok ? 'Tamam' : 'Eksik'} tone={item.ok ? 'success' : 'warning'} />} />)}
        </Section>
      ) : null}

      {attemptId ? <AttemptSheet key={attemptId} attemptId={attemptId} basePath={`${base(examId)}/attempts`} onClose={() => setAttemptId(null)} onChanged={onChanged} /> : null}
    </>
  );
}

const styles = StyleSheet.create({ badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, preview: { gap: 4, paddingVertical: 8 } });
