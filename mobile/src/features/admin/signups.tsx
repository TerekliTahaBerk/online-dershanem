import type { MobileSignups } from '@contracts/admin';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { space } from '@/design/tokens';
import { createChildAccount, fetchSignups, updateSignupContact, type SignupsQuery } from '@/lib/api/admin';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { InviteSheet } from './people';
import { adminErrorText, QueryView, useAdminMutation, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips } from './ui';

type Signup = MobileSignups['signups'][number];
type Child = MobileSignups['children'][number];
type Invite = NonNullable<Awaited<ReturnType<typeof createChildAccount>>['invite']>;

/**
 * YÖNETİM · YENİ KAYITLAR (Faz 2.2) — web `app/panel/yonetim/basvurular`
 * ile AYNI yükleyiciler: kendi kaydolan hesaplar (süzgeç + sayfa) ve
 * velilerin eklediği, hesabı açılmamış çocuklar. İletişim durumu / notu web
 * ile AYNI `PATCH /api/panel/signups/:id/contact` ucuna gider (yalnız takip;
 * erişim açmaz). Çocuk hesabı `POST /api/panel/signups/children/:id/account`
 * ile açılır (taze step-up); yeni hesapta tek kullanımlık davet paylaşılır.
 */
export default function SignupsScreen() {
  const [query, setQuery] = useState<SignupsQuery>({ sekme: 'kayitlar', filtre: 'tumu', sayfa: 1 });
  const signups = useAdminQuery('signups', (api, signal) => fetchSignups(api, query, signal), { params: { sekme: query.sekme ?? '', filtre: query.filtre ?? '', sayfa: query.sayfa ?? 1 } });
  const refresh = usePullToRefresh(() => signups.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-signups">
      <PageHeader title="Yeni kayıtlar" description="Kendi kaydolan hesaplar ve velilerin eklediği çocuklar." />
      <QueryView query={signups}>{(data) => <Body data={data} onQuery={(patch) => setQuery((current) => ({ ...current, ...patch }))} />}</QueryView>
    </Screen>
  );
}

function Body({ data, onQuery }: { data: MobileSignups; onQuery: (patch: SignupsQuery) => void }) {
  const [contact, setContact] = useState<Signup | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [notice, setNotice] = useState<{ tone: 'info' | 'critical'; text: string } | null>(null);
  return (
    <>
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      <FilterChips
        label="Kayıt sekmeleri"
        value={data.tab}
        onChange={(sekme) => onQuery({ sekme, sayfa: 1 })}
        options={[
          { value: 'kayitlar', label: 'Kayıtlar', count: data.counts.newCount },
          { value: 'cocuklar', label: 'Hesap bekleyen çocuklar', count: data.counts.pendingCount },
        ]}
      />
      {data.tab === 'kayitlar' ? (
        <>
          <FilterChips label="Kayıt süzgeci" value={data.filter} onChange={(filtre) => onQuery({ filtre, sayfa: 1 })} options={data.filters} />
          <Section title={`${data.total} kayıt`} first>
            {data.signups.length ? data.signups.map((item) => <SignupRow key={item.id} item={item} onContact={() => setContact(item)} />) : <EmptyState title="Bu süzgeçte kayıt yok" />}
          </Section>
          {data.pages > 1 ? (
            <View style={styles.pager}>
              <Button label="Önceki" variant="quiet" onPress={() => onQuery({ sayfa: data.page - 1 })} disabled={data.page <= 1} testID="admin-signups-prev" />
              <Text tone="secondary">{data.page} / {data.pages}</Text>
              <Button label="Sonraki" variant="quiet" onPress={() => onQuery({ sayfa: data.page + 1 })} disabled={data.page >= data.pages} testID="admin-signups-next" />
            </View>
          ) : null}
        </>
      ) : (
        <Section title={`${data.children.length} çocuk`} first>
          {data.children.length ? (
            data.children.map((item) => (
              <Row
                key={item.id}
                testID={`admin-child-${item.id}`}
                title={item.name}
                subtitle={[item.detail, `Veli: ${item.parentName} · ${item.parentContact}`].filter(Boolean).join(' · ')}
                meta={item.paid ? item.packages : 'Ödeme yok'}
                trailing={<Button label="Hesap aç" variant="secondary" onPress={() => setChild(item)} testID={`admin-child-account-${item.id}`} />}
              />
            ))
          ) : (
            <EmptyState title="Hesap bekleyen çocuk yok" />
          )}
        </Section>
      )}
      {contact ? <ContactSheet item={contact} statuses={data.contactStatuses} onClose={() => setContact(null)} onSaved={() => { setContact(null); setNotice({ tone: 'info', text: 'İletişim durumu kaydedildi.' }); }} /> : null}
      {child ? (
        <ChildAccountSheet
          item={child}
          onClose={() => setChild(null)}
          onCreated={(result) => {
            setChild(null);
            const orders = result.provisioning;
            const failed = orders.filter((order) => !order.outcome.startsWith('succeeded')).length;
            const base = `${result.student.fullName} için öğrenci hesabı ${result.student.linkedExisting ? 'mevcut hesaba bağlandı' : 'açıldı'} ve veliye bağlandı.`;
            setNotice({ tone: failed ? 'critical' : 'info', text: orders.length ? `${base} ${orders.length - failed}/${orders.length} siparişin erişimi açıldı.${failed ? ' Bazı siparişler tamamlanamadı; Aktivasyon masasından yeniden deneyin.' : ''}` : base });
            if (result.invite) setInvite(result.invite);
          }}
        />
      ) : null}
      {invite ? <InviteSheet invite={invite} title="Öğrenci hesabı açıldı" onClose={() => setInvite(null)} /> : null}
    </>
  );
}

function SignupRow({ item, onContact }: { item: Signup; onContact: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Row
        testID={`admin-signup-${item.id}`}
        title={item.name}
        subtitle={[item.roleLabel, item.email, item.interested].filter(Boolean).join(' · ')}
        meta={[`${formatShortDateTime(item.createdAt)}`, item.contactStatusLabel, item.formDone ? null : 'form eksik'].filter(Boolean).join(' · ')}
        trailing={<StatusBadge label={item.purchase.label} tone={item.purchase.tone} />}
        onPress={() => setOpen((value) => !value)}
      />
      {open ? (
        <View style={styles.detail}>
          {item.details.map((entry) => (
            <Text key={entry.label} variant="meta" tone="secondary">
              {entry.label}: {entry.value}
            </Text>
          ))}
          {item.contactNote ? <Text variant="meta">Not: {item.contactNote}</Text> : null}
          <View style={styles.actions}>
            <Button label="İletişim durumu" variant="secondary" onPress={onContact} testID={`admin-signup-contact-${item.id}`} />
            {item.whatsAppUrl ? <Button label="WhatsApp" variant="quiet" onPress={() => void Linking.openURL(item.whatsAppUrl!)} /> : null}
            {item.phone ? <Button label="Ara" variant="quiet" onPress={() => void Linking.openURL(`tel:${item.phone}`)} /> : null}
            <Button label="Kişi detayı" variant="quiet" onPress={() => router.push(`/admin/person/${encodeURIComponent(item.id)}` as Href)} />
          </View>
        </View>
      ) : null}
    </>
  );
}

function ContactSheet({ item, statuses, onClose, onSaved }: { item: Signup; statuses: MobileSignups['contactStatuses']; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(item.contactStatus);
  const [note, setNote] = useState(item.contactNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const save = useAdminMutation((api, input: { contactStatus: string; contactNote: string }) => updateSignupContact(api, item.id, input));
  return (
    <BottomSheet visible title={item.name} onClose={onClose}>
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <Text variant="label">İletişim durumu</Text>
      <FilterChips label="İletişim durumu" value={status} onChange={setStatus} options={statuses} />
      <TextField label="Not" value={note} onChangeText={setNote} multiline maxLength={1000} testID="admin-signup-note" />
      <Button
        label="Kaydet"
        loading={save.isPending}
        disabled={save.isPending}
        onPress={async () => {
          setError(null);
          try {
            await save.mutateAsync({ contactStatus: status, contactNote: note.trim() });
            onSaved();
          } catch (cause) {
            setError(adminErrorText(cause));
          }
        }}
        testID="admin-signup-contact-submit"
      />
      <Text tone="muted" variant="meta">Yalnız iletişim takibidir; ürün erişimini açmaz ya da kapatmaz.</Text>
    </BottomSheet>
  );
}

function ChildAccountSheet({ item, onClose, onCreated }: { item: Child; onClose: () => void; onCreated: (result: Awaited<ReturnType<typeof createChildAccount>>) => void }) {
  const [email, setEmail] = useState(item.defaultEmail ?? '');
  const [fullName, setFullName] = useState(item.name);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = useAdminMutation((api, input: { email: string; fullName?: string; phone?: string }) => createChildAccount(api, item.id, input));
  const valid = /.+@.+\..+/.test(email.trim()) && fullName.trim().length >= 2;
  return (
    <BottomSheet visible title={`${item.name} için hesap`} onClose={onClose}>
      {error ? <Banner tone="critical" title="Hesap açılmadı">{error}</Banner> : null}
      <Text tone="secondary">Veli: {item.parentName} · {item.parentContact}</Text>
      <TextField label="Öğrenci e-postası" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} testID="admin-child-email" />
      <TextField label="Ad soyad" value={fullName} onChangeText={setFullName} testID="admin-child-name" />
      <TextField label="Telefon (isteğe bağlı)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Button
        label="Hesabı aç"
        loading={create.isPending}
        disabled={!valid || create.isPending}
        onPress={async () => {
          setError(null);
          try {
            onCreated(await create.mutateAsync({ email: email.trim(), fullName: fullName.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) }));
          } catch (cause) {
            setError(adminErrorText(cause));
          }
        }}
        testID="admin-child-submit"
      />
      <Text tone="muted" variant="meta">Ödenmiş paketler varsa erişim bu hesapta açılır. Bu işlem hassastır; kimliğini yeniden doğrulaman istenebilir.</Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  detail: { gap: space[1], paddingHorizontal: space[3], paddingBottom: space[2] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
