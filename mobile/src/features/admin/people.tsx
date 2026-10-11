import type { MobileInviteResult, MobilePeopleDirectory } from '@contracts/admin';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { space } from '@/design/tokens';
import { approveMfaReset, createUser, fetchPeopleDirectory, type CreateUserInput, type PeopleQuery } from '@/lib/api/admin';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { adminErrorText, QueryView, useAdminMutation, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips } from './ui';

/**
 * YÖNETİM · KİŞİLER (Faz 2.2) — web `app/panel/yonetim/kisiler` ile AYNI
 * görünümler (Tümü · Öğrenciler · Veliler · Öğretmenler · Koçlar · Personel),
 * süzgeçler, sayfalama ve MFA sıfırlama onay kuyruğu. Satır kişi detayına
 * açılır. Hesap açma taze step-up ister; sonuçta tek kullanımlık davet
 * bağlantısı paylaşılır. Toplu işlem mobil kapsamı dışında (E4).
 */
export default function PeopleScreen() {
  const [query, setQuery] = useState<PeopleQuery>({ sekme: 'tumu', sayfa: 1 });
  const [text, setText] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery((current) => (current.q === text.trim() ? current : { ...current, q: text.trim(), sayfa: 1 })), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const directory = useAdminQuery('people', (api, signal) => fetchPeopleDirectory(api, query, signal), { params: { sekme: query.sekme ?? '', q: query.q ?? '', rol: query.rol ?? '', urun: query.urun ?? '', durum: query.durum ?? '', sayfa: query.sayfa ?? 1 } });
  const refresh = usePullToRefresh(() => directory.refetch());
  const [creating, setCreating] = useState(false);
  const [invite, setInvite] = useState<MobileInviteResult['invite'] | null>(null);
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-people">
      <PageHeader title="Kişiler" description="Öğrenci, veli, öğretmen, koç ve personel tek listede." action={<Button label="Yeni kişi" variant="secondary" onPress={() => setCreating(true)} testID="admin-person-create-open" />} />
      <TextField label="Ara" value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} placeholder="Ad, e-posta veya telefon" testID="admin-people-search" />
      <QueryView query={directory}>{(data) => <Body data={data} query={query} onQuery={(patch) => setQuery((current) => ({ ...current, ...patch }))} />}</QueryView>
      <CreatePersonSheet visible={creating} onClose={() => setCreating(false)} onCreated={(result) => { setCreating(false); setInvite(result.invite); }} />
      {invite ? <InviteSheet invite={invite} title="Hesap açıldı" onClose={() => setInvite(null)} /> : null}
    </Screen>
  );
}

function Body({ data, query, onQuery }: { data: MobilePeopleDirectory; query: PeopleQuery; onQuery: (patch: PeopleQuery) => void }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const approve = useAdminMutation((api, id: string) => approveMfaReset(api, id));
  async function onApprove(id: string) {
    setMessage(null);
    try {
      await approve.mutateAsync(id);
      setMessage('MFA sıfırlaması onaylandı; hedef hesabın doğrulama yöntemleri silindi ve oturumları kapatıldı.');
    } catch (cause) {
      setMessage(adminErrorText(cause));
    }
  }
  return (
    <>
      {message ? <Banner tone="info">{message}</Banner> : null}
      {data.pendingMfaResets.length ? (
        <Section title={`Bekleyen MFA sıfırlama onayı (${data.pendingMfaResets.length})`} first>
          <Text tone="muted" variant="meta">Onayı, isteği açan ve hedef yöneticiden farklı bir yönetici vermelidir.</Text>
          {data.pendingMfaResets.map((reset) => (
            <Row
              key={reset.id}
              testID={`admin-mfa-reset-${reset.id}`}
              title={reset.targetName}
              subtitle={`${reset.requestedByName} · ${reset.reason}`}
              meta={`Son: ${formatShortDateTime(reset.expiresAt)}`}
              trailing={reset.canApprove ? <Button label="Onayla" variant="secondary" onPress={() => void onApprove(reset.id)} disabled={approve.isPending} testID={`admin-mfa-approve-${reset.id}`} /> : <Text tone="muted" variant="meta">Onaylayamazsın</Text>}
            />
          ))}
        </Section>
      ) : null}
      <FilterChips label="Kişi görünümleri" value={data.view} onChange={(sekme) => onQuery({ sekme, rol: '', sayfa: 1 })} options={data.views.map((view) => ({ value: view.id, label: view.label }))} />
      <FilterChips label="Durum" value={query.durum ?? ''} onChange={(durum) => onQuery({ durum, sayfa: 1 })} options={data.filters.statuses} />
      <FilterChips label="Ürün" value={query.urun ?? ''} onChange={(urun) => onQuery({ urun, sayfa: 1 })} options={data.filters.products} />
      {data.roleFilterAllowed ? <FilterChips label="Rol" value={query.rol ?? ''} onChange={(rol) => onQuery({ rol, sayfa: 1 })} options={data.filters.roles} /> : null}
      <Section title={`${data.total} kişi`}>
        {data.people.length ? (
          data.people.map((person) => (
            <Row
              key={person.id}
              testID={`admin-person-${person.id}`}
              title={person.name}
              subtitle={[person.email, person.detail].filter(Boolean).join(' · ')}
              meta={[person.badges.join(' · '), person.invitePending ? 'davet bekliyor' : person.lastLoginAt ? `son giriş ${formatShortDateTime(person.lastLoginAt)}` : ''].filter(Boolean).join(' · ') || null}
              trailing={<StatusBadge label={person.statusLabel} tone={person.statusTone} />}
              onPress={() => router.push(`/admin/person/${encodeURIComponent(person.id)}` as Href)}
            />
          ))
        ) : (
          <EmptyState title="Bu süzgeçte kişi yok" />
        )}
      </Section>
      {data.pages > 1 ? (
        <View style={styles.pager}>
          <Button label="Önceki" variant="quiet" onPress={() => onQuery({ sayfa: data.page - 1 })} disabled={data.page <= 1} testID="admin-people-prev" />
          <Text tone="secondary">{data.page} / {data.pages}</Text>
          <Button label="Sonraki" variant="quiet" onPress={() => onQuery({ sayfa: data.page + 1 })} disabled={data.page >= data.pages} testID="admin-people-next" />
        </View>
      ) : null}
    </>
  );
}

const ROLE_OPTIONS = [
  { value: 'STUDENT', label: 'Öğrenci' },
  { value: 'PARENT', label: 'Veli' },
  { value: 'TEACHER', label: 'Öğretmen' },
  { value: 'ADMIN', label: 'Yönetici' },
] as const;
const PRODUCT_OPTIONS = [
  { value: 'OD', label: 'onlinedershanem.' },
  { value: 'OK', label: 'Yön Koçluk' },
  { value: 'ODK', label: 'Deneme Ligi' },
] as const;
const EXAM_OPTIONS = [
  { value: '', label: 'Belirtilmedi' },
  { value: 'LGS', label: 'LGS' },
  { value: 'TYT', label: 'TYT' },
  { value: 'AYT', label: 'AYT' },
  { value: 'TYT_AYT', label: 'TYT + AYT' },
  { value: 'OTHER', label: 'Diğer' },
];

function CreatePersonSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (result: MobileInviteResult) => void }) {
  const [role, setRole] = useState<CreateUserInput['role']>('STUDENT');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [products, setProducts] = useState<('OD' | 'OK' | 'ODK')[]>(['OD']);
  const [classLevel, setClassLevel] = useState('');
  const [examType, setExamType] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [subjects, setSubjects] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useAdminMutation((api, input: CreateUserInput) => createUser(api, input));
  const learner = role === 'STUDENT' || role === 'PARENT';
  const valid = /.+@.+\..+/.test(email.trim()) && (!learner || products.length > 0);

  function toggleProduct(code: 'OD' | 'OK' | 'ODK') {
    setProducts((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  }

  async function submit() {
    setError(null);
    const input: CreateUserInput = {
      email: email.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      role,
      ...(learner ? { products } : {}),
      ...(role === 'STUDENT' ? { classLevel: classLevel.trim(), examType, schoolName: schoolName.trim() } : {}),
      ...(role === 'TEACHER' ? { subjects: subjects.split(',').map((item) => item.trim()).filter((item) => item.length >= 2) } : {}),
    };
    try {
      const result = await mutation.mutateAsync(input);
      setEmail('');
      setFullName('');
      setPhone('');
      onCreated(result);
    } catch (cause) {
      setError(adminErrorText(cause));
    }
  }

  return (
    <BottomSheet visible={visible} title="Yeni kişi" onClose={onClose}>
      {error ? <Banner tone="critical" title="Hesap açılmadı">{error}</Banner> : null}
      <Text variant="label">Rol</Text>
      <FilterChips label="Rol" value={role} onChange={setRole} options={ROLE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} />
      <TextField label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} testID="admin-create-email" />
      <TextField label="Ad soyad" value={fullName} onChangeText={setFullName} testID="admin-create-name" />
      <TextField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      {learner ? (
        <>
          <Text variant="label">Ürün erişimi</Text>
          {PRODUCT_OPTIONS.map((option) => (
            <Row key={option.value} title={option.label} selected={products.includes(option.value)} onPress={() => toggleProduct(option.value)} testID={`admin-create-product-${option.value}`} />
          ))}
        </>
      ) : null}
      {role === 'STUDENT' ? (
        <>
          <TextField label="Sınıf" value={classLevel} onChangeText={setClassLevel} />
          <Text variant="label">Sınav</Text>
          <FilterChips label="Sınav" value={examType} onChange={setExamType} options={EXAM_OPTIONS} />
          <TextField label="Okul" value={schoolName} onChangeText={setSchoolName} />
        </>
      ) : null}
      {role === 'TEACHER' ? <TextField label="Ders alanları" value={subjects} onChangeText={setSubjects} hint="Virgülle ayır: Matematik, Fen" /> : null}
      <Button label="Hesabı aç ve davet oluştur" onPress={submit} disabled={!valid || mutation.isPending} loading={mutation.isPending} testID="admin-create-submit" />
      <Text tone="muted" variant="meta">Bu işlem hassastır; kimliğini yeniden doğrulaman istenebilir.</Text>
    </BottomSheet>
  );
}

/** Tek kullanımlık davet bağlantısı: yalnız yöneticiye bir kez gösterilir ve paylaşılır. */
export function InviteSheet({ invite, title, onClose }: { invite: MobileInviteResult['invite']; title: string; onClose: () => void }) {
  return (
    <BottomSheet visible title={title} onClose={onClose}>
      <Text tone="secondary">Davet bağlantısı tek kullanımlıktır ve {formatShortDateTime(invite.expiresAt)} tarihine kadar geçerlidir. Kişiye güvenli bir kanaldan ilet.</Text>
      <Text selectable testID="admin-invite-url">{invite.url}</Text>
      <Button label="Daveti paylaş" onPress={() => void Share.share({ message: invite.message })} testID="admin-invite-share" />
      <Button label="Kapat" variant="quiet" onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] } });
