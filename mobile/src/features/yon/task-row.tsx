import type { MobileYonTask } from '@contracts/yon';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Row, StatusBadge } from '@/design/primitives';
import { space } from '@/design/tokens';
import { formatDayMonth, formatTime } from '@/lib/format/istanbul';

import { PRIORITY_LABEL, TASK_STATUS_LABEL, taskHref, taskMeta, taskTone } from './model';

/**
 * Yön plan görevi satırı (Bugün, Planım, Çalışmalarım). Durum rozeti web
 * etiketleriyle aynı. `canOpen` yalnız tamamlama açıkken (`adaptivePlan`
 * açık + onaylı plan) görev sayfasına götürür; aksi halde satır salt okunur.
 */
export function YonTaskRow({ task, canOpen, showDate = false, testID }: { task: MobileYonTask; canOpen: boolean; showDate?: boolean; testID?: string }) {
  const router = useRouter();
  const href = canOpen ? taskHref(task.id) : null;
  const priority = PRIORITY_LABEL[task.priority];
  return (
    <Row
      testID={testID ?? `yon-task-${task.id}`}
      title={task.title}
      subtitle={taskMeta(task, { date: showDate ? formatDayMonth(task.scheduledFor) : null, time: task.isFlexible ? 'Esnek' : formatTime(task.scheduledFor) })}
      meta={`${task.durationMinutes} dk`}
      trailing={
        <View style={styles.badges}>
          <StatusBadge label={TASK_STATUS_LABEL[task.status]} tone={taskTone(task.status)} />
          {priority ? <StatusBadge label={priority} tone="warning" /> : null}
        </View>
      }
      onPress={href ? () => router.push(href as Href) : undefined}
      accessibilityHint={href ? 'Görevin ayrıntısı ve durum seçenekleri açılır.' : undefined}
    />
  );
}

const styles = StyleSheet.create({ badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1], alignItems: 'flex-start' } });
