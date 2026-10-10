import { ASSIGNMENT_EVIDENCE_MAX, type AssignmentProgressStatus, type MobileAssignment } from '@contracts/student';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { color, radius, space, touchTarget } from '@/design/tokens';
import { useDesign } from '@/design/theme';
import { formatDateTime } from '@/lib/format/istanbul';

import { QueryView, usePullToRefresh } from '../shared';
import { useAssignments, useEvidenceSubmit, useProgressWrite } from './hooks';
import { allowedProgress, canSubmitEvidence, evidenceLengthError, latestSubmission, PROGRESS_LABEL, RUBRIC_LABEL, statusPresentation, usesEvidenceFlow } from './model';

/**
 * Çalışma detayı (web Çalışmalar yan paneli). Veri liste sorgusunun aynısı:
 * detay ile liste ve Bugün aynı sunucu yanıtından beslenir; yazma sonrası OD
 * kapsamı birlikte yenilenir.
 */
export function AssignmentDetailScreen({ assignmentId }: { assignmentId: string }) {
  const query = useAssignments();
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="assignment-detail">
      <QueryView query={query}>
        {(data) => {
          const assignment = data.assignments.find((item) => item.id === assignmentId);
          if (!assignment) return <EmptyState title="Bu çalışmayı bulamadık." body="Kaldırılmış ya da artık grubunda olmayabilir. Çalışmalarım ekranından güncel listene bakabilirsin." />;
          return <AssignmentDetailBody assignment={assignment} evidenceEnabled={data.evidenceEnabled} />;
        }}
      </QueryView>
    </Screen>
  );
}

function AssignmentDetailBody({ assignment, evidenceEnabled }: { assignment: MobileAssignment; evidenceEnabled: boolean }) {
  const status = statusPresentation(assignment, evidenceEnabled, new Date());
  const evidenceFlow = usesEvidenceFlow(assignment, evidenceEnabled);
  const latest = latestSubmission(assignment);
  return (
    <>
      <PageHeader title={assignment.title} context={<StatusBadge label={status.label} tone={status.tone} />} />
      <Section first>
        <Row title="Teslim" meta={formatDateTime(assignment.dueAt)} />
        <Row title="Ders" meta={assignment.subject} subtitle={assignment.groupName} />
        {assignment.teacherName ? <Row title="Öğretmen" meta={assignment.teacherName} /> : null}
      </Section>
      <Section title="Yönerge">
        <Text tone="secondary">{assignment.description || 'Öğretmenin bu çalışma için ek bir açıklama yazmadı.'}</Text>
      </Section>
      {evidenceFlow && assignment.criteria.length ? (
        <Section title="Değerlendirme ölçütleri">
          {assignment.criteria.map((criterion) => (
            <Row key={criterion.id} title={criterion.label} trailing={<CriterionScore assignment={assignment} criterionId={criterion.id} />} />
          ))}
        </Section>
      ) : null}
      <ProgressSection assignment={assignment} evidenceEnabled={evidenceEnabled} />
      {evidenceFlow ? <EvidenceSection assignment={assignment} evidenceEnabled={evidenceEnabled} /> : null}
      {latest?.feedback ? (
        <Section title="Öğretmeninden geri bildirim">
          <Text tone="secondary">{latest.feedback}</Text>
        </Section>
      ) : null}
      {assignment.submissions.length ? (
        <Section title="Teslim geçmişi">
          {assignment.submissions.map((submission) => (
            <Row
              key={submission.id}
              title={`${submission.attemptNumber}. deneme`}
              subtitle={submission.textEvidence}
              meta={submission.submittedAt ? formatDateTime(submission.submittedAt) : null}
              trailing={
                <StatusBadge
                  label={submission.status === 'APPROVED' ? 'Onaylandı' : submission.status === 'CHANGES_REQUESTED' ? 'Küçük bir düzeltme istendi' : 'Öğretmeninde'}
                  tone={submission.status === 'APPROVED' ? 'success' : submission.status === 'CHANGES_REQUESTED' ? 'warning' : 'info'}
                />
              }
            />
          ))}
        </Section>
      ) : null}
    </>
  );
}

function CriterionScore({ assignment, criterionId }: { assignment: MobileAssignment; criterionId: string }) {
  const score = latestSubmission(assignment)?.scores.find((item) => item.criterionId === criterionId);
  if (!score) return null;
  return <StatusBadge label={RUBRIC_LABEL[score.level]} tone={score.level === 'MEETS' ? 'success' : score.level === 'DEVELOPING' ? 'info' : 'warning'} />;
}

function ProgressSection({ assignment, evidenceEnabled }: { assignment: MobileAssignment; evidenceEnabled: boolean }) {
  const { product } = useDesign();
  const write = useProgressWrite(assignment);
  const options = allowedProgress(assignment, evidenceEnabled);
  if (!options.length && !write.feedback) return null;
  return (
    <Section title="Durumun">
      {write.feedback ? (
        <Banner tone={write.feedback.tone}>{write.feedback.message}</Banner>
      ) : null}
      {options.length ? (
        <View accessibilityRole="radiogroup" accessibilityLabel={`${assignment.title} durumu`} style={styles.progress}>
          {options.map((value) => {
            const selected = assignment.status === value;
            const busy = write.pendingStatus === value;
            return (
              <Pressable
                key={value}
                testID={`progress-${value}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled: write.pendingStatus !== null, busy }}
                accessibilityLabel={PROGRESS_LABEL[value]}
                disabled={write.pendingStatus !== null || selected}
                onPress={() => void write.setStatus(value as AssignmentProgressStatus)}
                style={({ pressed }) => [styles.option, selected && { borderColor: product.accent, backgroundColor: product.accentSoft }, pressed && { backgroundColor: color.pressed }, write.pendingStatus !== null && !busy && styles.dim]}>
                <Text variant={selected ? 'bodyStrong' : 'secondary'} style={selected ? { color: product.accent } : undefined}>
                  {busy ? 'Kaydediliyor…' : PROGRESS_LABEL[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Section>
  );
}

function EvidenceSection({ assignment, evidenceEnabled }: { assignment: MobileAssignment; evidenceEnabled: boolean }) {
  const evidence = useEvidenceSubmit(assignment);
  const [draft, setDraft] = useState('');
  const [touched, setTouched] = useState(false);
  const latest = latestSubmission(assignment);
  const open = canSubmitEvidence(assignment, evidenceEnabled);
  const lengthError = evidenceLengthError(draft);
  return (
    <Section title="Kanıt">
      {evidence.feedback ? <Banner tone={evidence.feedback.tone}>{evidence.feedback.message}</Banner> : null}
      {open ? (
        <>
          <Text tone="secondary">{latest ? 'Öğretmenin küçük bir düzeltme istedi. Geri bildirime göz at, yeni denemeni yazıp gönder.' : 'Çalışmanı nasıl yaptığını kısaca anlat; öğretmenin ölçütlere göre bakıp sana dönecek.'}</Text>
          <TextField
            testID="evidence-input"
            label="Ne yaptığını anlat"
            value={draft}
            onChangeText={setDraft}
            onBlur={() => setTouched(true)}
            multiline
            maxLength={ASSIGNMENT_EVIDENCE_MAX}
            editable={!evidence.submitting}
            hint={`${draft.trim().length}/${ASSIGNMENT_EVIDENCE_MAX} karakter (en az 20)`}
            error={touched && draft.length > 0 ? lengthError : null}
          />
          <Button
            testID="evidence-submit"
            label={latest ? 'Yeni deneme gönder' : 'Kanıt gönder'}
            loading={evidence.submitting}
            disabled={Boolean(lengthError)}
            onPress={() => {
              setTouched(true);
              void evidence.submit(draft).then((ok) => ok && setDraft(''));
            }}
          />
        </>
      ) : (
        <Text tone="secondary">{latest?.status === 'APPROVED' ? 'Öğretmenin bu çalışmanı onayladı, eline sağlık!' : 'Gönderin öğretmeninde; değerlendirdiğinde burada göreceksin.'}</Text>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  option: { flex: 1, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.borderStrong, borderRadius: radius.control, paddingHorizontal: space[2] },
  dim: { opacity: 0.5 },
});
