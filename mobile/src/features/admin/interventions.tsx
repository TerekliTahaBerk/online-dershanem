import type { MobileInterventionInbox, MobileInterventionRow } from '@contracts/admin';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { space, type Tone } from '@/design/tokens';
import { createIntervention, fetchInterventionInbox, generateInterventions, updateIntervention, type InterventionPatch } from '@/lib/api/admin';
import { formatShortDateTime, istanbulDateKey } from '@/lib/format/istanbul';

import { adminErrorText, QueryView, useAdminMutation, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips } from './ui';

type Filter = 'ACTIVE' | 'CLOSED' | 'ALL';
const CLOSED = new Set(['RESOLVED', 'FALSE_POSITIVE']);
const STATUS_TONE: Record<MobileInterventionRow['status'], Tone> = { OPEN: 'warning', IN_PROGRESS: 'info', SNOOZED: 'neutral', RESOLVED: 'success', FALSE_POSITIVE: 'neutral' };
const DAY = 86_400_000;

/**
 * YÖNETİM · MÜDAHALE KUTUSU (Faz 2.1) — web `app/panel/yonetim/mudahale`
 * ile AYNI kayıtlar ve AYNI yazma uçları. Her işlem kaydın sürümüyle
 * gönderilir; başka yerde değişmişse sunucu 409 döner ve liste yenilenir.
 * Etiketler sunucunun tek sözlüğünden gelir.
 */
export default function InterventionsScreen() {
  const query = useAdminQuery('interventions', (api, signal) => fetchInterventionInbox(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-interventions">
      <PageHeader title="Müdahale" description="Hiçbir sinyal sahipsiz kalmasın: kural, 24 saat hedefi, sahiplik ve sonuç tek yerde." />
      <QueryView query={query} disabledTitle="Müdahale kutusu şu anda açık değil.">
        {(inbox) => <Body inbox={inbox} />}
      </QueryView>
    </Screen>
  );
}

function Body({ inbox }: { inbox: MobileInterventionInbox }) {
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const labels = useMemo(() => ({
    reason: Object.fromEntries(inbox.vocabulary.reasons.map((entry) => [entry.value, entry.label])),
    status: Object.fromEntries(inbox.vocabulary.statuses.map((entry) => [entry.value, entry.label])),
  }), [inbox.vocabulary]);
  const generate = useAdminMutation((api) => generateInterventions(api));
  const now = Date.now();
  const active = inbox.rows.filter((row) => !CLOSED.has(row.status));
  const overdue = active.filter((row) => row.status !== 'SNOOZED' && Date.parse(row.dueAt) < now);
  const visible = inbox.rows.filter((row) => filter === 'ALL' || (filter === 'ACTIVE' ? !CLOSED.has(row.status) : CLOSED.has(row.status)));
  const selected = inbox.rows.find((row) => row.id === selectedId) ?? null;

  async function runRules() {
    setNotice(null);
    try {
      const result = await generate.mutateAsync(undefined);
      setNotice(`${result.createdCount} yeni açıklanabilir kayıt eklendi${result.reactivatedCount ? `, ${result.reactivatedCount} bekletilen kayıt yeniden açıldı` : ''}.`);
    } catch (error) {
      setNotice(adminErrorText(error));
    }
  }

  return (
    <>
      <Text tone="secondary" testID="admin-interventions-counts">
        {active.length} açık · {overdue.length} gecikmiş · {inbox.rows.filter((row) => row.status === 'FALSE_POSITIVE').length} yanlış işaret
      </Text>
      {notice ? <Banner tone="info">{notice}</Banner> : null}
      <View style={styles.actions}>
        <Button label="Elle kayıt" variant="secondary" onPress={() => setCreating(true)} testID="admin-intervention-create-open" />
        <Button label="Kuralları çalıştır" variant="secondary" onPress={runRules} loading={generate.isPending} testID="admin-intervention-generate" />
      </View>
      <FilterChips label="Durum süzgeci" value={filter} onChange={setFilter} options={[{ value: 'ACTIVE', label: 'Açık', count: active.length }, { value: 'CLOSED', label: 'Kapanan' }, { value: 'ALL', label: 'Tümü' }]} />
      <Section title="Kayıtlar" first>
        {visible.length ? (
          visible.map((row) => {
            const late = !CLOSED.has(row.status) && row.status !== 'SNOOZED' && Date.parse(row.dueAt) < now;
            return (
              <Row
                key={row.id}
                testID={`admin-intervention-${row.id}`}
                title={row.studentName}
                subtitle={`${labels.reason[row.reasonCode] ?? row.reasonCode} · ${row.ownerName ?? 'Sahipsiz'}`}
                meta={late ? `Gecikti · ${formatShortDateTime(row.dueAt)}` : `Hedef ${formatShortDateTime(row.dueAt)}`}
                trailing={<StatusBadge label={labels.status[row.status] ?? row.status} tone={STATUS_TONE[row.status]} />}
                onPress={() => setSelectedId(row.id)}
              />
            );
          })
        ) : (
          <EmptyState title={filter === 'ACTIVE' ? 'Açık müdahale yok' : 'Kayıt yok'} />
        )}
      </Section>
      {selected ? <CaseSheet row={selected} inbox={inbox} labels={labels} onClose={() => setSelectedId(null)} /> : null}
      <CreateSheet visible={creating} inbox={inbox} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setNotice('Müdahale kaydı oluşturuldu.'); }} />
    </>
  );
}

function CaseSheet({ row, inbox, labels, onClose }: { row: MobileInterventionRow; inbox: MobileInterventionInbox; labels: { reason: Record<string, string>; status: Record<string, string> }; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState(inbox.vocabulary.outcomes.find((entry) => entry.value === 'SUPPORT_PLANNED')?.value ?? inbox.vocabulary.outcomes[0]?.value ?? '');
  const [falseReason, setFalseReason] = useState(inbox.vocabulary.falsePositiveReasons[0]?.value ?? '');
  const [error, setError] = useState<string | null>(null);
  const mutation = useAdminMutation((api, patch: InterventionPatch) => updateIntervention(api, row.id, row.version, patch));
  const activityLabel = Object.fromEntries(inbox.vocabulary.activities.map((entry) => [entry.value, entry.label]));
  const outcomeLabel = Object.fromEntries(inbox.vocabulary.outcomes.map((entry) => [entry.value, entry.label]));
  const closed = CLOSED.has(row.status);
  const trimmed = note.trim();
  const withNote = trimmed ? { note: trimmed } : {};

  async function act(patch: InterventionPatch) {
    setError(null);
    try {
      await mutation.mutateAsync(patch);
      onClose();
    } catch (cause) {
      setError(adminErrorText(cause));
    }
  }

  return (
    <BottomSheet visible title={row.studentName} onClose={onClose}>
      <View style={styles.badges}>
        <StatusBadge label={labels.status[row.status] ?? row.status} tone={STATUS_TONE[row.status]} />
        <StatusBadge label={labels.reason[row.reasonCode] ?? row.reasonCode} />
      </View>
      {error ? <Banner tone="critical" title="Kaydedilmedi">{error}</Banner> : null}
      <Text>{row.explanation}</Text>
      <Text tone="secondary">Önerilen adım: {row.suggestedAction}</Text>
      <Text tone="muted" variant="meta">
        {row.evidenceCount} kanıt · Hedef {formatShortDateTime(row.dueAt)} · {row.ownerName ?? 'Sahipsiz'}
        {row.outcomeCode ? ` · ${outcomeLabel[row.outcomeCode] ?? row.outcomeCode}` : ''}
      </Text>
      {!row.canAct ? (
        <Banner tone="info">Bu kayıt başka bir sorumluya ait.</Banner>
      ) : closed ? (
        <Button label="Yeniden aç" variant="secondary" onPress={() => act({ action: 'REOPEN' })} loading={mutation.isPending} testID="intervention-reopen" />
      ) : (
        <>
          <TextField label="İç aksiyon notu" value={note} onChangeText={setNote} multiline maxLength={500} testID="intervention-note" />
          <View style={styles.actions}>
            {!row.ownerName ? <Button label="Üstlen" variant="secondary" onPress={() => act({ action: 'ASSIGN_SELF' })} disabled={mutation.isPending} testID="intervention-assign" /> : null}
            {row.status === 'OPEN' ? <Button label="İncelemeye başla" variant="secondary" onPress={() => act({ action: 'START', ...withNote })} disabled={mutation.isPending} testID="intervention-start" /> : null}
            <Button label="Notu kaydet" variant="secondary" onPress={() => act({ action: 'LOG_ACTION', note: trimmed })} disabled={!trimmed || mutation.isPending} testID="intervention-log" />
          </View>
          <Text variant="label">Beklet</Text>
          <View style={styles.actions}>
            {inbox.vocabulary.snoozeDays.map((days) => (
              <Button key={days} label={`${days} gün`} variant="quiet" onPress={() => act({ action: 'SNOOZE', days, ...withNote })} disabled={mutation.isPending} testID={`intervention-snooze-${days}`} />
            ))}
          </View>
          <Section title="Çöz">
            {inbox.vocabulary.outcomes.map((entry) => (
              <Row key={entry.value} title={entry.label} selected={outcome === entry.value} onPress={() => setOutcome(entry.value)} testID={`intervention-outcome-${entry.value}`} />
            ))}
            <Button label="Çözüldü olarak kapat" onPress={() => act({ action: 'RESOLVE', outcomeCode: outcome, ...withNote })} disabled={!outcome || mutation.isPending} loading={mutation.isPending} testID="intervention-resolve" />
          </Section>
          <Section title="Yanlış işaret">
            {inbox.vocabulary.falsePositiveReasons.map((entry) => (
              <Row key={entry.value} title={entry.label} selected={falseReason === entry.value} onPress={() => setFalseReason(entry.value)} testID={`intervention-false-${entry.value}`} />
            ))}
            <Button label="Yanlış işaret olarak kapat" variant="destructive" onPress={() => act({ action: 'FALSE_POSITIVE', falsePositiveReason: falseReason, ...withNote })} disabled={!falseReason || mutation.isPending} testID="intervention-false-positive" />
          </Section>
        </>
      )}
      {row.activities.length ? (
        <Section title="Geçmiş">
          {row.activities.map((activity) => (
            <Row key={activity.id} title={activityLabel[activity.type] ?? activity.type} subtitle={activity.note} meta={`${activity.actorName} · ${formatShortDateTime(activity.createdAt)}`} />
          ))}
        </Section>
      ) : null}
    </BottomSheet>
  );
}

const FOLLOW_UPS = [
  { days: 1, label: 'Yarın' },
  { days: 3, label: '3 gün' },
  { days: 7, label: '1 hafta' },
] as const;

function CreateSheet({ visible, inbox, onClose, onCreated }: { visible: boolean; inbox: MobileInterventionInbox; onClose: () => void; onCreated: () => void }) {
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState(inbox.vocabulary.manualReasons[0]?.value ?? '');
  const [explanation, setExplanation] = useState('');
  const [suggestedAction, setSuggestedAction] = useState('');
  const [followUpDays, setFollowUpDays] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);
  const mutation = useAdminMutation((api, input: Parameters<typeof createIntervention>[1]) => createIntervention(api, input));
  const needle = search.trim().toLocaleLowerCase('tr-TR');
  const matches = needle ? inbox.students.filter((student) => student.name.toLocaleLowerCase('tr-TR').includes(needle)).slice(0, 20) : [];
  const student = inbox.students.find((entry) => entry.id === studentId) ?? null;
  // Sunucu şeması: açıklama ≥ 8, önerilen adım ≥ 4 karakter.
  const valid = Boolean(student && reasonCode && explanation.trim().length >= 8 && suggestedAction.trim().length >= 4);

  async function submit() {
    if (!student) return;
    setError(null);
    try {
      await mutation.mutateAsync({ studentId: student.id, reasonCode, explanation: explanation.trim(), suggestedAction: suggestedAction.trim(), followUpDate: istanbulDateKey(new Date(Date.now() + followUpDays * DAY)) });
      setSearch('');
      setStudentId(null);
      setExplanation('');
      setSuggestedAction('');
      onCreated();
    } catch (cause) {
      setError(adminErrorText(cause));
    }
  }

  return (
    <BottomSheet visible={visible} title="Elle müdahale kaydı" onClose={onClose}>
      {error ? <Banner tone="critical" title="Kaydedilmedi">{error}</Banner> : null}
      {student ? (
        <Row title={student.name} subtitle="Seçili öğrenci" trailing={<Text tone="muted" variant="meta">Değiştir</Text>} onPress={() => setStudentId(null)} testID="intervention-create-student-selected" />
      ) : (
        <>
          <TextField label="Öğrenci ara" value={search} onChangeText={setSearch} autoCorrect={false} testID="intervention-create-search" />
          {matches.map((entry) => (
            <Row key={entry.id} title={entry.name} onPress={() => setStudentId(entry.id)} testID={`intervention-create-student-${entry.id}`} />
          ))}
        </>
      )}
      <Text variant="label">Neden</Text>
      <FilterChips label="Neden" value={reasonCode} onChange={setReasonCode} options={inbox.vocabulary.manualReasons.map((entry) => ({ value: entry.value, label: entry.label }))} />
      <TextField label="Gözlem / açıklama" value={explanation} onChangeText={setExplanation} multiline maxLength={500} hint="En az 8 karakter" testID="intervention-create-explanation" />
      <TextField label="Önerilen adım" value={suggestedAction} onChangeText={setSuggestedAction} maxLength={300} hint="En az 4 karakter" testID="intervention-create-action" />
      <Text variant="label">Takip</Text>
      <FilterChips label="Takip tarihi" value={String(followUpDays)} onChange={(value) => setFollowUpDays(Number(value))} options={FOLLOW_UPS.map((entry) => ({ value: String(entry.days), label: entry.label }))} />
      <Button label="Kaydı oluştur" onPress={submit} disabled={!valid || mutation.isPending} loading={mutation.isPending} testID="intervention-create-submit" />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  badges: { flexDirection: 'row', gap: space[2] },
});
