import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { openOnWeb, webUrlFor } from '@/features/shell/web-continuation';
import { fetchMockExams } from '@/lib/api/student';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatDayMonth } from '@/lib/format/istanbul';
import { queryKeys } from '@/lib/query/keys';

import { QueryView, usePullToRefresh } from '../od/shared';

/**
 * DIŞ DENEMELERİM — okulda / kursta / başka platformda çözülen ve öğrencinin
 * kendi girdiği denemeler (`GET /api/panel/mock-exams`, bayrak
 * `mockExamAnalysis`). Bu Deneme Ligi DEĞİLDİR: Deneme Ligi uçları burada
 * hiç çağrılmaz. Uç OD veya Yön üyeliğini kabul eder; sorgu etkin çalışma
 * alanıyla kapsamlanır. Deneme GİRİŞİ (bölüm bölüm form) mobilde yok:
 * web paneline açık devam yolu verilir.
 */
export default function ExternalMockExamsScreen() {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const workspace = bootstrap.workspace?.activeProduct ?? null;
  const allowed = workspace === 'OD' || workspace === 'OK';
  const [examId, setExamId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: queryKeys.workspaceResource(bootstrap.user.id, workspace, 'mock-exams', { examId }),
    queryFn: ({ signal }) => fetchMockExams(api, examId, signal),
    enabled: allowed,
  });
  const refresh = usePullToRefresh(() => query.refetch());
  const entryUrl = webUrlFor('/panel/ogrenci/denemeler');

  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="external-mock-exams">
      <PageHeader title="Dış denemelerim" description="Okulda, kursta veya başka bir platformda çözdüğün deneme sonuçları." />
      {!allowed ? (
        <EmptyState title="Bu bölüm bu çalışma alanında yok" />
      ) : (
        <QueryView query={query} disabledTitle="Deneme analizi şu anda açık değil.">
          {(data) => {
            if (!data.profile) return <EmptyState title="Profilin hazırlanıyor." />;
            if (!data.exams.length) {
              return (
                <EmptyState
                  title="Henüz dış deneme sonucun yok."
                  body="Deneme sonucunu web panelinden ekleyebilirsin; burada analizini görürsün."
                  action={entryUrl ? <Button label="Web panelinde deneme ekle" variant="secondary" onPress={() => void openOnWeb('/panel/ogrenci/denemeler')} /> : undefined}
                />
              );
            }
            const current = data.current;
            return (
              <>
                {current ? (
                  <Section first title={current.title}>
                    <Row
                      title="Toplam net"
                      meta={current.total.toLocaleString('tr-TR')}
                      subtitle={current.delta === null ? 'Karşılaştırma için önceki deneme yok' : `Önceki denemene göre ${current.delta >= 0 ? '+' : ''}${current.delta.toLocaleString('tr-TR')}`}
                    />
                    {current.sections.map((section) => (
                      <Row key={section.id} title={section.subjectName} meta={`${section.net.toLocaleString('tr-TR')} net`} subtitle={`${section.correctCount} doğru · ${section.incorrectCount} yanlış`} />
                    ))}
                    {current.nextAction ? <Banner tone="info" title="Sonraki adım">{current.nextAction}</Banner> : null}
                    <Text tone="muted" variant="meta">Karşılaştırma yalnızca kendi geçmiş denemelerinle yapılır.</Text>
                  </Section>
                ) : null}
                <Section title="Tüm denemeler">
                  {data.exams.map((exam) => (
                    <Row
                      key={exam.id}
                      testID={`mock-exam-${exam.id}`}
                      title={exam.title}
                      meta={formatDayMonth(exam.takenAt)}
                      selected={current?.id === exam.id}
                      trailing={current?.id === exam.id ? <StatusBadge label="Gösteriliyor" tone="info" /> : null}
                      onPress={current?.id === exam.id ? undefined : () => setExamId(exam.id)}
                    />
                  ))}
                </Section>
                {entryUrl ? <Button label="Web panelinde deneme ekle" variant="quiet" onPress={() => void openOnWeb('/panel/ogrenci/denemeler')} /> : null}
              </>
            );
          }}
        </QueryView>
      )}
    </Screen>
  );
}
