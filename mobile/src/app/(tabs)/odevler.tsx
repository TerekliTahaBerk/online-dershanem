import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ListEmpty, PanelHeading, SectionLabel } from '@/components/panel-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError, apiFetch } from '@/lib/api';
import { useSession } from '@/lib/auth-context';

const DAY = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const TIME = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });

type Status = 'TODO' | 'IN_PROGRESS' | 'DONE';
type Submission = {
  id: string;
  attemptNumber: number;
  status: 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED';
  textEvidence: string;
  feedback: string | null;
};
type Assignment = {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  groupName: string;
  subject: string;
  status: Status;
  version: number;
  evidenceRequired: boolean;
  criteria: { id: string; label: string }[];
  submissions: Submission[];
};
type PlanTask = { id: string; title: string; durationMinutes: number; scheduledFor: string; done: boolean };
type AssignmentsData = { profile: { id: string } | null; evidenceEnabled: boolean; assignments: Assignment[]; planTasks: PlanTask[] };

const STATUS_COPY: Record<Status, string> = { TODO: 'Başlanmadı', IN_PROGRESS: 'Çalışıyorum', DONE: 'Tamamlandı' };

function idempotencyKey(): string {
  return `evidence_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function AssignmentCard({
  assignment,
  evidenceEnabled,
  onStatusChange,
  onEvidenceSubmit,
}: {
  assignment: Assignment;
  evidenceEnabled: boolean;
  onStatusChange: (id: string, status: Status) => Promise<void>;
  onEvidenceSubmit: (id: string, text: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [evidenceText, setEvidenceText] = useState('');
  const overdue = assignment.status !== 'DONE' && new Date(assignment.dueAt) < new Date();
  const latest = assignment.submissions[0];
  const showEvidenceUi = evidenceEnabled && assignment.evidenceRequired;
  const canSubmit = showEvidenceUi && (!latest || latest.status === 'CHANGES_REQUESTED');

  const badgeStyle = assignment.status === 'DONE' ? styles.badgeDone : overdue ? styles.badgeOverdue : styles.badgeOpen;
  const badgeTextStyle = assignment.status === 'DONE' ? styles.badgeDoneText : overdue ? styles.badgeOverdueText : styles.badgeOpenText;
  const badgeLabel = overdue ? 'Süresi geçti' : STATUS_COPY[assignment.status];

  async function handleStatusPress(status: Status) {
    if (busy) return;
    setBusy(true);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onStatusChange(assignment.id, status);
    setBusy(false);
  }

  async function handleSubmit() {
    if (busy || evidenceText.trim().length < 20) return;
    setBusy(true);
    await onEvidenceSubmit(assignment.id, evidenceText.trim());
    setBusy(false);
  }

  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={styles.tag}>
          <ThemedText type="small" style={styles.tagText}>
            {assignment.groupName} · {assignment.subject}
          </ThemedText>
        </View>
        <View style={[styles.badge, badgeStyle]}>
          <ThemedText type="small" style={badgeTextStyle}>
            {badgeLabel}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.cardTitle}>{assignment.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {assignment.description || 'Öğretmenin açıklama eklemedi.'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.dueText}>
        {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(assignment.dueAt))}
      </ThemedText>

      {showEvidenceUi ? (
        <View style={styles.evidenceBox}>
          <ThemedText type="smallBold">Kanıtlı teslim · ölçütler</ThemedText>
          {assignment.criteria.map((criterion) => (
            <ThemedText key={criterion.id} type="small" themeColor="textSecondary">
              • {criterion.label}
            </ThemedText>
          ))}
          {latest ? (
            <View style={styles.latestSubmission}>
              <ThemedText type="smallBold">
                {latest.attemptNumber}. deneme ·{' '}
                {latest.status === 'SUBMITTED' ? 'Öğretmeninde' : latest.status === 'APPROVED' ? 'Onaylandı' : 'Yeniden deneyebilirsin'}
              </ThemedText>
              {latest.feedback ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Geri bildirim: {latest.feedback}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
          {canSubmit ? (
            <View style={styles.evidenceForm}>
              <ThemedText type="small" themeColor="textSecondary">
                {latest ? 'Yeni denemende neyi değiştirdin?' : 'Çözüm yolunu ve kontrolünü kısaca açıkla'}
              </ThemedText>
              <TextInput
                value={evidenceText}
                onChangeText={setEvidenceText}
                multiline
                maxLength={2000}
                style={styles.evidenceInput}
              />
              <Pressable
                accessibilityRole="button"
                disabled={busy || evidenceText.trim().length < 20}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  (busy || evidenceText.trim().length < 20) && styles.submitButtonDisabled,
                  pressed && styles.submitButtonPressed,
                ]}>
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText type="smallBold" style={styles.submitButtonLabel}>
                    {latest ? 'Yeni denemeyi gönder' : 'Kanıtı gönder'}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.statusToggle}>
          {(['TODO', 'IN_PROGRESS', 'DONE'] as Status[]).map((status) => (
            <Pressable
              key={status}
              accessibilityRole="button"
              accessibilityState={{ selected: assignment.status === status }}
              disabled={busy}
              onPress={() => handleStatusPress(status)}
              style={[styles.statusOption, assignment.status === status && styles.statusOptionActive]}>
              <ThemedText
                type="small"
                style={assignment.status === status ? styles.statusOptionLabelActive : styles.statusOptionLabel}>
                {STATUS_COPY[status]}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

function TaskList({ label, tasks }: { label: string; tasks: PlanTask[] }) {
  if (tasks.length === 0) return null;
  return (
    <View style={styles.taskGroup}>
      <SectionLabel>{label}</SectionLabel>
      <View style={styles.taskListCard}>
        {tasks.map((task, i) => (
          <View key={task.id} style={[styles.taskRow, i > 0 && styles.taskRowDivider]}>
            <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
              {task.done ? <ThemedText style={styles.checkboxMark}>✓</ThemedText> : null}
            </View>
            <ThemedText type="small" themeColor={task.done ? 'textSecondary' : 'text'} style={styles.taskLabel}>
              {task.title} · {task.durationMinutes} dk
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {DAY.format(new Date(task.scheduledFor))} {TIME.format(new Date(task.scheduledFor))}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function OdevlerScreen() {
  const { token, signOut } = useSession();
  const [data, setData] = useState<AssignmentsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<AssignmentsData>('/api/panel/assignments', { token });
        setData(result);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Çalışmalar yüklenemedi. Bağlantınızı kontrol edin.');
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [token, signOut],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(id: string, status: Status) {
    if (!token) return;
    try {
      await apiFetch(`/api/panel/assignments/${id}/progress`, { method: 'PATCH', token, body: { status } });
      await load();
    } catch (err) {
      if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof ApiError ? err.message : 'Durum kaydedilemedi.');
    }
  }

  async function handleEvidenceSubmit(id: string, text: string) {
    if (!token) return;
    try {
      await apiFetch(`/api/panel/assignments/${id}/submissions`, {
        method: 'POST',
        token,
        body: { textEvidence: text, idempotencyKey: idempotencyKey() },
      });
      if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch (err) {
      if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof ApiError ? err.message : 'Kanıt gönderilemedi.');
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.centerFlex}>
        <ActivityIndicator color={BrandColors.brandStrong} size="large" />
      </ThemedView>
    );
  }

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(todayEnd);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const openTasks = (data?.planTasks ?? []).filter((t) => !t.done);
  const todayTasks = openTasks.filter((t) => new Date(t.scheduledFor) <= todayEnd);
  const weekTasks = openTasks.filter((t) => {
    const d = new Date(t.scheduledFor);
    return d > todayEnd && d <= weekEnd;
  });
  const laterTasks = openTasks.filter((t) => new Date(t.scheduledFor) > weekEnd);
  const doneTasks = (data?.planTasks ?? []).filter((t) => t.done).slice(0, 10);

  const isEmpty = !!data && data.assignments.length === 0 && data.planTasks.length === 0;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={BrandColors.brandStrong}
              colors={[BrandColors.brandStrong]}
            />
          }>
          <PanelHeading
            title="Çalışmalar"
            description="Dershanem ödevleri ile Koçum plan görevleri ayrı bölümlerde."
          />

          {error ? (
            <ThemedText type="small" style={styles.errorBanner}>
              {error}
            </ThemedText>
          ) : null}

          {!data?.profile ? (
            <ListEmpty title="Profilin hazırlanıyor." body="Öğrenci profilin tamamlandığında çalışmaların burada listelenir." />
          ) : isEmpty ? (
            <ListEmpty title="Bekleyen çalışma yok." body="Öğretmenin ya da koçun yeni bir çalışma eklediğinde burada görünecek." />
          ) : (
            <>
              {data.assignments.length ? (
                <View style={styles.section}>
                  <SectionLabel>Dershanem ödevleri</SectionLabel>
                  <View style={styles.assignmentList}>
                    {data.assignments.map((assignment) => (
                      <AssignmentCard
                        key={assignment.id}
                        assignment={assignment}
                        evidenceEnabled={data.evidenceEnabled}
                        onStatusChange={handleStatusChange}
                        onEvidenceSubmit={handleEvidenceSubmit}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {openTasks.length || doneTasks.length ? (
                <View style={styles.section}>
                  <SectionLabel>Koçum plan görevleri</SectionLabel>
                  <TaskList label="Bugün" tasks={todayTasks} />
                  <TaskList label="Bu hafta" tasks={weekTasks} />
                  <TaskList label="Sonraki" tasks={laterTasks} />
                  <TaskList label="Tamamlananlar" tasks={doneTasks} />
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerFlex: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  errorBanner: { color: '#B3261E' },
  section: { gap: Spacing.two },
  assignmentList: { gap: Spacing.two },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two },
  tag: { backgroundColor: BrandColors.brandSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: BrandColors.brandHover },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOpen: { backgroundColor: '#FFFBEB' },
  badgeOpenText: { color: '#92400E' },
  badgeOverdue: { backgroundColor: '#FFF1F2' },
  badgeOverdueText: { color: '#BE123C' },
  badgeDone: { backgroundColor: '#ECFDF5' },
  badgeDoneText: { color: '#047857' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  dueText: { marginTop: 4 },
  evidenceBox: { marginTop: Spacing.two, borderRadius: 16, backgroundColor: '#FAF8F4', padding: Spacing.three, gap: 6 },
  latestSubmission: { marginTop: Spacing.one, backgroundColor: '#ffffff', borderRadius: 12, padding: Spacing.two, gap: 4 },
  evidenceForm: { marginTop: Spacing.one, gap: Spacing.one },
  evidenceInput: {
    minHeight: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.line,
    backgroundColor: '#ffffff',
    padding: Spacing.two,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitButton: { height: 44, borderRadius: 10, backgroundColor: BrandColors.brandStrong, alignItems: 'center', justifyContent: 'center' },
  submitButtonPressed: { backgroundColor: BrandColors.brandHover },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonLabel: { color: '#ffffff' },
  statusToggle: { flexDirection: 'row', gap: 4, marginTop: Spacing.two, backgroundColor: '#FAF8F4', borderRadius: 14, padding: 4 },
  statusOption: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusOptionActive: { backgroundColor: BrandColors.brand },
  statusOptionLabel: { color: '#5C6B65' },
  statusOptionLabelActive: { color: '#ffffff', fontWeight: '700' },
  taskGroup: { gap: Spacing.one },
  taskListCard: { borderRadius: 14, borderWidth: 1, borderColor: BrandColors.line, backgroundColor: '#ffffff', overflow: 'hidden' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  taskRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BrandColors.lineSoft },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: BrandColors.line, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: BrandColors.brandStrong, borderColor: BrandColors.brandStrong },
  checkboxMark: { color: '#ffffff', fontSize: 12, fontWeight: '700', lineHeight: 14 },
  taskLabel: { flex: 1 },
});
