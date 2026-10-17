import type { MobileParentsPage } from '@contracts/admin';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { space } from '@/design/tokens';
import { createRelationship, fetchParentsPage, removeRelationship, updateRelationship, type ParentsQuery } from '@/lib/api/admin';

import { adminErrorText, QueryView, useAdminMutation, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips, SearchPicker } from './ui';

/**
 * YÖNETİM · VELİLER (Faz 2.2) — web `app/panel/yonetim/veliler` ile AYNI
 * yükleyici (`loadParentsPage`): süzgeçli veli listesi, bağlantısız veli
 * sayısı, aktif veli–öğrenci bağlantıları, bağlantı geçmişi. Bağlantı kurma,
 * yakınlık düzenleme ve kaldırma web ile AYNI `/api/panel/relationships`
 * uçlarına gider (taze step-up). Veli satırı kişi detayına açılır.
 */
export default function ParentsScreen() {
  const [query, setQuery] = useState<ParentsQuery>({ sayfa: 1 });
  const [text, setText] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery((current) => (current.q === text.trim() ? current : { ...current, q: text.trim(), sayfa: 1 })), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const page = useAdminQuery('parents', (api, signal) => fetchParentsPage(api, query, signal), { params: { q: query.q ?? '', durum: query.durum ?? '', sayfa: query.sayfa ?? 1 } });
  const refresh = usePullToRefresh(() => page.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-parents">
      <PageHeader title="Veliler" description="Veli hesapları ve öğrenci bağlantıları." />
      <TextField label="Ara" value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} placeholder="Ad, e-posta veya telefon" testID="admin-parents-search" />
      <QueryView query={page}>{(data) => <Body data={data} onQuery={(patch) => setQuery((current) => ({ ...current, ...patch }))} />}</QueryView>
    </Screen>
  );
}

function Body({ data, onQuery }: { data: MobileParentsPage; onQuery: (patch: ParentsQuery) => void }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ tone: 'info' | 'critical'; text: string } | null>(null);
  const [linking, setLinking] = useState(false);
  const [editing, setEditing] = useState<MobileParentsPage['relationships'][number] | null>(null);
  const remove = useAdminMutation((api, id: string) => removeRelationship(api, id));

  async function run(action: () => Promise<unknown>, success: string) {
    setNotice(null);
    try {
      await action();
      setNotice({ tone: 'info', text: success });
      return true;
    } catch (cause) {
      setNotice({ tone: 'critical', text: adminErrorText(cause) ?? 'İşlemi şu an kaydedemedik. Lütfen tekrar dener misiniz?' });
      return false;
    }
  }

  return (
    <>
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      {data.withoutRelationshipCount ? (
        <Banner tone="warning" title={`${data.withoutRelationshipCount} veli henüz bir öğrenciye bağlı değil`}>
          Bağlantı kurulana kadar veli panelinde öğrenci verisi görünmez.
        </Banner>
      ) : null}
      <FilterChips label="Veli durumu" value={data.query.durum} onChange={(durum) => onQuery({ durum, sayfa: 1 })} options={data.statuses} />
      <Section title={`${data.total} veli`} first>
        {data.parents.length ? (
          data.parents.map((parent) => (
            <Row
              key={parent.id}
              testID={`admin-parent-${parent.id}`}
              title={parent.name}
              subtitle={parent.email}
              meta={parent.studentCount ? parent.students : 'Bağlı öğrenci yok'}
              trailing={<StatusBadge label={parent.statusLabel} tone={parent.attention ? 'warning' : 'neutral'} />}
              onPress={() => router.push(`/admin/person/${encodeURIComponent(parent.id)}` as Href)}
            />
          ))
        ) : (
          <EmptyState title="Bu süzgeçte veli yok" />
        )}
      </Section>
      {data.pages > 1 ? (
        <View style={styles.pager}>
          <Button label="Önceki" variant="quiet" onPress={() => onQuery({ sayfa: data.page - 1 })} disabled={data.page <= 1} testID="admin-parents-prev" />
          <Text tone="secondary">{data.page} / {data.pages}</Text>
          <Button label="Sonraki" variant="quiet" onPress={() => onQuery({ sayfa: data.page + 1 })} disabled={data.page >= data.pages} testID="admin-parents-next" />
        </View>
      ) : null}
      <Section title="Veli–öğrenci bağlantıları" action={<Button label="Bağlantı kur" variant="secondary" onPress={() => setLinking(true)} testID="admin-relationship-create-open" />}>
        {data.relationships.length ? (
          data.relationships.map((link) => (
            <Row
              key={link.id}
              testID={`admin-relationship-${link.id}`}
              title={`${link.parentName} → ${link.studentName}`}
              subtitle={link.relationship ?? 'Yakınlık belirtilmedi'}
              onPress={() => setEditing(link)}
              trailing={
                <Button
                  label="Kaldır"
                  variant="quiet"
                  disabled={remove.isPending}
                  onPress={() =>
                    Alert.alert('Bağlantıyı kaldır', `${link.parentName} artık ${link.studentName} için veri göremez.`, [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: 'Kaldır', style: 'destructive', onPress: () => void run(() => remove.mutateAsync(link.id), 'Bağlantı kaldırıldı.') },
                    ])
                  }
                  testID={`admin-relationship-remove-${link.id}`}
                />
              }
            />
          ))
        ) : (
          <EmptyState title="Aktif bağlantı yok" />
        )}
      </Section>
      <Section title="Bağlantı geçmişi">
        {data.history.length ? data.history.map((entry) => <Row key={entry.id} title={entry.title} subtitle={entry.actionLabel} meta={entry.detail} />) : <EmptyState title="Geçmiş kaydı yok" />}
      </Section>
      <LinkSheet visible={linking} parentOptions={data.parentOptions} studentOptions={data.studentOptions} onClose={() => setLinking(false)} onDone={(ok) => ok && setLinking(false)} run={run} />
      {editing ? <EditSheet link={editing} onClose={() => setEditing(null)} run={run} /> : null}
    </>
  );
}

export type Run = (action: () => Promise<unknown>, success: string) => Promise<boolean>;

const PERMISSIONS = [
  { key: 'primaryContact', label: 'Birincil iletişim' },
  { key: 'canViewAcademic', label: 'Akademik veriyi görebilir' },
  { key: 'canViewPayments', label: 'Ödemeleri görebilir' },
] as const;

/**
 * Veli–öğrenci bağlantı formu (web `StudentParentLinkForm` alanları). Öğrenci
 * 360'tan açılınca öğrenci sabittir (`fixedStudentId`).
 */
export function LinkSheet({ visible, parentOptions, studentOptions = [], fixedStudentId, onClose, onDone, run }: { visible: boolean; parentOptions: { id: string; name: string }[]; studentOptions?: { id: string; name: string }[]; fixedStudentId?: string; onClose: () => void; onDone: (ok: boolean) => void; run: Run }) {
  const [parentId, setParentId] = useState<string | null>(null);
  const [chosenStudentId, setStudentId] = useState<string | null>(null);
  const studentId = fixedStudentId ?? chosenStudentId;
  const [relationship, setRelationship] = useState('');
  const [flags, setFlags] = useState({ primaryContact: true, canViewAcademic: true, canViewPayments: true });
  const create = useAdminMutation((api, input: Parameters<typeof createRelationship>[1]) => createRelationship(api, input));

  async function submit() {
    if (!parentId || !studentId) return;
    const ok = await run(() => create.mutateAsync({ parentId, studentId, relationship: relationship.trim() || undefined, ...flags }), 'Bağlantı kuruldu.');
    if (ok) {
      setParentId(null);
      setStudentId(null);
      setRelationship('');
    }
    onDone(ok);
  }

  return (
    <BottomSheet visible={visible} title="Veli–öğrenci bağlantısı" onClose={onClose}>
      <SearchPicker label="Veli" options={parentOptions} value={parentId} onChange={setParentId} testID="admin-link-parent" />
      {fixedStudentId ? null : <SearchPicker label="Öğrenci" options={studentOptions} value={studentId} onChange={setStudentId} testID="admin-link-student" />}
      <TextField label="Yakınlık (isteğe bağlı)" value={relationship} onChangeText={setRelationship} maxLength={30} placeholder="Anne, baba, vasi…" testID="admin-link-relationship" />
      {PERMISSIONS.map((item) => (
        <Row key={item.key} title={item.label} selected={flags[item.key]} onPress={() => setFlags((current) => ({ ...current, [item.key]: !current[item.key] }))} testID={`admin-link-${item.key}`} />
      ))}
      <Button label="Bağlantıyı kur" onPress={submit} disabled={!parentId || !studentId || create.isPending} loading={create.isPending} testID="admin-link-submit" />
      <Text tone="muted" variant="meta">Yalnız Deneme Ligi KPSS üyeliği olan öğrenciye veli bağlanamaz; kural sunucuda uygulanır.</Text>
    </BottomSheet>
  );
}

function EditSheet({ link, onClose, run }: { link: MobileParentsPage['relationships'][number]; onClose: () => void; run: Run }) {
  const [relationship, setRelationship] = useState(link.relationship ?? '');
  const update = useAdminMutation((api, value: string) => updateRelationship(api, link.id, value));
  return (
    <BottomSheet visible title={`${link.parentName} → ${link.studentName}`} onClose={onClose}>
      <TextField label="Yakınlık" value={relationship} onChangeText={setRelationship} maxLength={30} testID="admin-relationship-edit" />
      <Button
        label="Kaydet"
        onPress={async () => {
          if (await run(() => update.mutateAsync(relationship.trim()), 'Yakınlık güncellendi.')) onClose();
        }}
        disabled={update.isPending}
        loading={update.isPending}
        testID="admin-relationship-edit-submit"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] } });
