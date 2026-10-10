import type { MobileYonPlan, MobileYonPreference, YonOverloadOption } from '@contracts/yon';
import { YON_MINUTES_PER_DAY, YON_OVERLOAD_OPTIONS } from '@contracts/yon';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { color, radius, space } from '@/design/tokens';
import { fetchYonPlan } from '@/lib/api/yon';
import { formatDayMonth } from '@/lib/format/istanbul';

import { usePlanChangeRequest, usePreferenceSave } from './hooks';
import { CHANGE_CATEGORY_LABEL, isDoneTask, OVERLOAD_LABEL, WEEK_DAYS } from './model';
import { QueryView, usePullToRefresh, useYonQuery } from './shared';
import { YonTaskRow } from './task-row';

/**
 * YÖN · PLANIM — web `app/panel/ogrenci/plan` (`StudentAdaptivePlan`).
 * Veri `GET /api/panel/student/plan` (aynı yükleyici `loadStudentPlan`).
 * Görevler gün seçiciyle gezilir; her görev tek bir günde görünür. Tamamlama
 * görev sayfasında (`/yon/task/[id]`), değişiklik talebi ve tercihler web ile
 * aynı uçlarla. Taslak plan görevleri sunucudan gelmez.
 */
const DAY_SHORT = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', weekday: 'short', day: 'numeric' });

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

export default function YonPlanScreen() {
  const query = useYonQuery('yon-plan', (api, signal) => fetchYonPlan(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  const data = query.data;
  const description =
    data?.state === 'READY' && data.plan ? `${formatDayMonth(data.plan.weekStart)} – ${formatDayMonth(data.plan.weekEnd)}` : 'Uygun günlerini ve ayırabileceğin süreyi söyle; planını buna göre kuralım.';
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="yon-plan">
      <PageHeader title="Bu haftanın planı" description={description} />
      <QueryView query={query} disabledTitle="Haftalık plan şimdilik kapalı.">
        {(plan) => <PlanBody data={plan} />}
      </QueryView>
    </Screen>
  );
}

function PlanBody({ data }: { data: MobileYonPlan }) {
  if (data.state === 'NO_PROFILE') {
    return <EmptyState title="Hesabını hazırlıyoruz." body="Her şey hazır olduğunda koçunun senin için kurduğu planı burada göreceksin." />;
  }
  const plan = data.plan;
  return (
    <>
      {!plan ? (
        <EmptyState title="Henüz bir planın yok." body="Uygun günlerini ve ayırabileceğin süreyi aşağıdan söyle; koçun planını buna göre kursun." />
      ) : (
        <>
          <PlanStatus plan={plan} requiresApproval={data.requiresApproval} />
          {plan.tasks.length ? <WeekView plan={plan} todayKey={data.todayKey} /> : null}
          {plan.canRequestChange ? <ChangeRequest plan={plan} /> : null}
        </>
      )}
      {data.coachSummary ? (
        <Section title="Koçunun haftalık özeti">
          {data.coachSummary.studentVisibleText ? <Text>{data.coachSummary.studentVisibleText}</Text> : null}
          {data.coachSummary.strengths ? <Row title="Güçlü yanların" subtitle={data.coachSummary.strengths} /> : null}
          {data.coachSummary.focusAreas ? <Row title="Odak alanları" subtitle={data.coachSummary.focusAreas} /> : null}
          {data.coachSummary.nextWeekFocus ? <Row title="Gelecek hafta" subtitle={data.coachSummary.nextWeekFocus} /> : null}
        </Section>
      ) : null}
      <Preferences initial={data.preference} />
    </>
  );
}

type Plan = NonNullable<Extract<MobileYonPlan, { state: 'READY' }>['plan']>;

function PlanStatus({ plan, requiresApproval }: { plan: Plan; requiresApproval: boolean }) {
  const tone = plan.status === 'APPROVED' ? 'success' : plan.status === 'CHANGE_REQUESTED' ? 'warning' : 'neutral';
  return (
    <Section title="Plan durumu" first>
      <View style={styles.statusRow}>
        <StatusBadge label={plan.status === 'DRAFT' && requiresApproval ? 'Koçunun onayında' : plan.statusLabel} tone={tone} />
        {plan.status === 'CHANGE_REQUESTED' && plan.changeRequestCategory ? <Text tone="secondary" variant="secondary">{CHANGE_CATEGORY_LABEL[plan.changeRequestCategory] ?? ''}</Text> : null}
      </View>
      {plan.status === 'DRAFT' ? (
        <Text tone="secondary">{`Planın hazırlanıyor${plan.draftTaskCount ? ` (${plan.draftTaskCount} çalışma)` : ''}. Koçun onayladığında görevlerin burada açılacak.`}</Text>
      ) : (
        <>
          <Text tone="secondary">{`${plan.progress.completed}/${plan.progress.total} görev tamamlandı · ${minutesLabel(plan.progress.completedMinutes)} / ${minutesLabel(plan.progress.plannedMinutes)}${plan.progress.remaining ? ` · ${plan.progress.remaining} görev kaldı` : ''}`}</Text>
          {plan.progress.percent !== null ? (
            <View style={styles.track} accessible accessibilityRole="progressbar" accessibilityLabel="Haftalık plan ilerlemesi" accessibilityValue={{ min: 0, max: 100, now: Math.round(plan.progress.percent) }}>
              <ProgressFill percent={plan.progress.percent} />
            </View>
          ) : null}
          {!plan.canComplete ? <Text tone="muted" variant="meta">Plan onaylanınca görevlerini buradan işaretleyebileceksin.</Text> : null}
        </>
      )}
    </Section>
  );
}

function ProgressFill({ percent }: { percent: number }) {
  const { product } = useDesign();
  return <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: product.accent }]} />;
}

function WeekView({ plan, todayKey }: { plan: Plan; todayKey: string }) {
  const { product } = useDesign();
  const dayKeys = [...new Set(plan.tasks.map((task) => task.dayKey))].sort();
  const [selected, setSelected] = useState(dayKeys.includes(todayKey) ? todayKey : (dayKeys.find((key) => key >= todayKey) ?? dayKeys[0]));
  const tasks = plan.tasks.filter((task) => task.dayKey === selected && task.status !== 'SKIPPED');
  return (
    <Section title="Haftalık plan">
      <View style={styles.dayRow} accessibilityRole="tablist" accessibilityLabel="Plan günleri">
        {dayKeys.map((key) => {
          const dayTasks = plan.tasks.filter((task) => task.dayKey === key && task.status !== 'SKIPPED');
          const active = key === selected;
          const label = DAY_SHORT.format(new Date(`${key}T12:00:00+03:00`));
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}${key === todayKey ? ', bugün' : ''}: ${dayTasks.filter(isDoneTask).length}/${dayTasks.length} görev`}
              onPress={() => setSelected(key)}
              style={[styles.dayChip, active && { borderColor: product.accent, backgroundColor: product.accentSoft }]}>
              <Text variant="meta" tone={active ? 'accent' : 'muted'} accentColor={product.accent}>{label}</Text>
              <Text variant="numeric">{`${dayTasks.filter(isDoneTask).length}/${dayTasks.length}`}</Text>
            </Pressable>
          );
        })}
      </View>
      {tasks.length ? tasks.map((task) => <YonTaskRow key={task.id} task={task} canOpen={plan.canComplete} />) : <Text tone="secondary">Bu gün için bir görevin yok; dinlenmek de planın bir parçası.</Text>}
    </Section>
  );
}

function ChangeRequest({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const [option, setOption] = useState<YonOverloadOption>('REDUCE_LIGHT');
  const request = usePlanChangeRequest({ id: plan.id, version: plan.version });
  return (
    <Section title="Plan sana uymuyor mu?">
      {request.feedback ? <Banner tone={request.feedback.tone}>{request.feedback.message}</Banner> : null}
      <Text tone="secondary">Fazla yoğun geldiyse ya da günler uymuyorsa koçuna söyle. Koçun planını senin için yeniden düzenler.</Text>
      <Button label="Değişiklik iste" variant="secondary" onPress={() => setOpen(true)} testID="yon-plan-change" />
      <BottomSheet visible={open} title="Değişiklik iste" onClose={() => setOpen(false)}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Değişiklik seçeneği" style={styles.options}>
          {YON_OVERLOAD_OPTIONS.map((value) => (
            <Row key={value} title={OVERLOAD_LABEL[value]} selected={option === value} onPress={() => setOption(value)} testID={`yon-change-${value}`} />
          ))}
        </View>
        <Button
          label="Koçuma ilet"
          loading={request.submitting}
          testID="yon-change-submit"
          onPress={async () => {
            if (await request.submit(option)) setOpen(false);
          }}
        />
      </BottomSheet>
    </Section>
  );
}

/**
 * Tercihler — web'deki seçeneklerle aynı: günler ve günlük süre. Sınav
 * bilgisi ve planlama durumu mobilde düzenlenmez; mevcut değerleri aynen
 * korunur.
 */
function Preferences({ initial }: { initial: MobileYonPreference }) {
  const { product } = useDesign();
  const [draft, setDraft] = useState(initial);
  const saver = usePreferenceSave();
  const changed = draft.minutesPerDay !== initial.minutesPerDay || draft.availableDays.join(',') !== initial.availableDays.join(',');
  return (
    <Section title="Çalışma tercihlerin">
      {saver.feedback ? <Banner tone={saver.feedback.tone}>{saver.feedback.message}</Banner> : null}
      <Text variant="label" tone="secondary">Çalışmak istediğim günler</Text>
      <View style={styles.dayRow}>
        {WEEK_DAYS.map((day) => {
          const on = draft.availableDays.includes(day.id);
          return (
            <Pressable
              key={day.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={day.label}
              onPress={() =>
                setDraft((current) => ({
                  ...current,
                  availableDays: on ? current.availableDays.filter((id) => id !== day.id) : [...current.availableDays, day.id].sort((a, b) => a - b),
                }))
              }
              style={[styles.dayChip, on && { borderColor: product.accent, backgroundColor: product.accentSoft }]}>
              <Text variant="meta" tone={on ? 'accent' : 'muted'} accentColor={product.accent}>{day.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="label" tone="secondary">Bir günde ayırabileceğim süre</Text>
      <View style={styles.dayRow} accessibilityRole="radiogroup" accessibilityLabel="Günlük süre">
        {YON_MINUTES_PER_DAY.map((minutes) => {
          const on = draft.minutesPerDay === minutes;
          return (
            <Pressable
              key={minutes}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${minutes} dakika`}
              onPress={() => setDraft((current) => ({ ...current, minutesPerDay: minutes }))}
              style={[styles.dayChip, on && { borderColor: product.accent, backgroundColor: product.accentSoft }]}>
              <Text variant="meta" tone={on ? 'accent' : 'muted'} accentColor={product.accent}>{`${minutes} dk`}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        label="Tercihleri kaydet"
        variant="secondary"
        disabled={!changed || draft.availableDays.length === 0}
        loading={saver.saving}
        testID="yon-pref-save"
        onPress={() => void saver.save(draft)}
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[2] },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: color.surfaceSubtle, overflow: 'hidden', marginTop: space[1] },
  fill: { height: '100%', borderRadius: radius.pill },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginVertical: space[2] },
  dayChip: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[2], borderRadius: radius.control, borderWidth: 1, borderColor: color.border, gap: 2 },
  options: { marginBottom: space[3] },
});
