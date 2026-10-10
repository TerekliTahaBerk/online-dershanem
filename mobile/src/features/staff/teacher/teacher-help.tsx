import type { HelpAction, MobileHelpInbox } from '@contracts/staff';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchHelpInbox, respondHelp } from '@/lib/api/staff';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { OfflineWriteNotice, QueryView, staffStyles, useInvalidateStaff, useOnline, usePullToRefresh, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';

type Item = MobileHelpInbox['items'][number];

/**
 * YARDIM İSTEYENLER — yalnız öğrencinin öğretmenle paylaşmayı seçtiği
 * check-in'ler (`shareWithTeacher`). Yanıt MEVCUT uçla, sunucunun izin verdiği
 * eylemlerden biri seçilerek; serbest metin / danışmanlık özelliği yok.
 */
export default function TeacherHelpScreen() {
  // S-3: yardım kutusu web'de Yön menüsünde; yanıt ucu OD öğretmen rolü ister.
  // Sorgu etkin çalışma alanında tutulur; yetki kararı sunucuda (OD + izin).
  const product = useReadyBootstrap().workspace?.activeProduct === 'OK' ? 'OK' : 'OD';
  const query = useStaffQuery(product, 'teacher-help', (api, signal) => fetchHelpInbox(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="teacher-help">
      <PageHeader title="Yardım isteyenler" description="Öğrencinin seçtiği engel gösterilir; check-in yanıtlarının tamamı paylaşılmaz." />
      <QueryView query={query} disabledTitle="Yardım kutusu şu anda açık değil.">{(data) => <Inbox data={data} product={product} refetch={() => query.refetch()} />}</QueryView>
    </Screen>
  );
}

function Inbox({ data, refetch, product }: { data: MobileHelpInbox; refetch: () => Promise<unknown>; product: 'OD' | 'OK' }) {
  const { api } = useSession();
  const online = useOnline();
  const invalidate = useInvalidateStaff(product);
  const [selected, setSelected] = useState<Item | null>(null);
  const [state, setState] = useState<WriteState>(null);
  const mutation = useMutation({ mutationFn: (input: { item: Item; action: HelpAction }) => respondHelp(api, input.item.id, { expectedVersion: input.item.version, action: input.action }) });
  const open = data.items.filter((item) => item.status === 'OPEN');
  const responded = data.items.filter((item) => item.status === 'RESPONDED');

  async function respond(action: HelpAction) {
    if (!selected || mutation.isPending || !online) return;
    setState(null);
    try {
      await mutation.mutateAsync({ item: selected, action });
      setSelected(null);
      setState({ tone: 'success', message: 'Yanıtın öğrenciye iletildi.' });
      await invalidate();
    } catch (error) {
      setSelected(null);
      const next = writeError(error, 'Bu istek başka bir yerde yanıtlandı. Liste yenilendi.');
      setState(next);
      if (next?.tone === 'warning') await refetch();
    }
  }

  return (
    <>
      <OfflineWriteNotice online={online} />
      <WriteBanner state={state} webPath="/panel/ogretmen/yardim" />
      <Section title={`Yanıt bekleyen (${open.length})`} first>
        {open.length ? (
          open.map((item) => (
            <Row
              key={item.id}
              testID={`help-${item.id}`}
              title={item.studentName}
              subtitle={`${item.groupName} · ${item.barrierLabel}`}
              meta={`Son: ${formatShortDateTime(item.dueAt)}`}
              trailing={new Date(item.dueAt) < new Date() ? <StatusBadge label="Gecikti" tone="warning" /> : undefined}
              onPress={data.canRespond && online ? () => setSelected(item) : undefined}
            />
          ))
        ) : (
          <EmptyState title="Yanıt bekleyen yardım isteği yok" />
        )}
      </Section>
      {responded.length ? (
        <Section title="Yanıtlananlar">
          {responded.map((item) => <Row key={item.id} title={item.studentName} subtitle={item.responseLabel ?? item.barrierLabel} />)}
        </Section>
      ) : null}
      <BottomSheet visible={Boolean(selected)} title={selected ? `${selected.studentName} için destek adımı` : ''} onClose={() => setSelected(null)}>
        <View style={staffStyles.gap}>
          <Text tone="secondary">Seçtiğin adım öğrenciye bildirilir.</Text>
          {data.actions.map((action) => (
            <Row key={action.value} title={action.label} disabled={mutation.isPending} onPress={() => void respond(action.value)} testID={`help-action-${action.value}`} />
          ))}
        </View>
      </BottomSheet>
    </>
  );
}
