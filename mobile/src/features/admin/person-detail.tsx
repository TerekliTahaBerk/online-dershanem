import type { MobileInviteResult, MobilePersonDetail } from '@contracts/admin';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { space } from '@/design/tokens';
import {
  approveMfaReset,
  fetchPersonDetail,
  grantStaffRole,
  requestMfaReset,
  resetUserInvite,
  revokeStaffRole,
  setCoachCapacity,
  setUserProducts,
  setUserStatus,
  updateUserProfile,
} from '@/lib/api/admin';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { InviteSheet } from './people';
import { adminErrorText, QueryView, useAdminMutation, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips } from './ui';

type Tab = 'profil' | 'urunler' | 'sorumluluklar' | 'iliskiler' | 'guvenlik' | 'gecmis';
const date = (value: string) => formatShortDateTime(value);

/**
 * YÖNETİM · KİŞİ DETAYI (Faz 2.2) — web `app/panel/yonetim/kullanicilar/[id]`
 * ile AYNI veri (`loadPersonDetail`) ve AYNI sekmeler: Profil · Ürünler ·
 * Sorumluluklar (yalnız öğretmen) · İlişkiler · Güvenlik · Geçmiş. Her yazma
 * mevcut `/api/panel/users/*` ucuna gider ve sunucuda taze step-up ister.
 * Kendi hesabında durum değişikliği ve MFA sıfırlama sunulmaz (sunucu da
 * reddeder).
 */
export default function PersonDetailScreen({ userId }: { userId: string }) {
  const query = useAdminQuery('person', (api, signal) => fetchPersonDetail(api, userId, signal), { params: { userId } });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-person-detail">
      <QueryView query={query}>{(person) => <Body person={person} />}</QueryView>
    </Screen>
  );
}

function Body({ person }: { person: MobilePersonDetail }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profil');
  const [notice, setNotice] = useState<{ tone: 'info' | 'critical'; text: string } | null>(null);
  const [invite, setInvite] = useState<MobileInviteResult['invite'] | null>(null);
  const tabs: { value: Tab; label: string }[] = [
    { value: 'profil', label: 'Profil' },
    { value: 'urunler', label: 'Ürünler' },
    ...(person.staff ? [{ value: 'sorumluluklar' as const, label: 'Sorumluluklar' }] : []),
    { value: 'iliskiler', label: 'İlişkiler' },
    { value: 'guvenlik', label: 'Güvenlik' },
    { value: 'gecmis', label: 'Geçmiş' },
  ];
  const report = (result: { ok: true; text: string } | { ok: false; error: unknown }) => setNotice(result.ok ? { tone: 'info', text: result.text } : { tone: 'critical', text: adminErrorText(result.error) ?? 'İşlem kaydedilemedi.' });
  return (
    <>
      <PageHeader
        title={person.name}
        description={[person.email, person.phone, `kayıt ${date(person.createdAt)}`, person.lastLoginAt ? `son giriş ${date(person.lastLoginAt)}` : null].filter(Boolean).join(' · ')}
        context={
          <View style={styles.badges}>
            <Text tone="muted" variant="meta">{person.roleLabel}</Text>
            <StatusBadge label={person.statusLabel} tone={person.statusTone} />
            {person.invitePending ? <StatusBadge label="Davet bekliyor" tone="warning" /> : null}
          </View>
        }
      />
      {person.blockedOrder ? (
        <Banner tone="critical" title="Ödeme alındı, ürün erişimi açılmadı">
          {`${person.blockedOrder.packageName} · ${date(person.blockedOrder.createdAt)}${person.blockedOrder.error ? ` · ${person.blockedOrder.error}` : ''}`}
        </Banner>
      ) : null}
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      <FilterChips label="Kişi detayı" value={tab} onChange={(next) => { setTab(next); setNotice(null); }} options={tabs} />
      {tab === 'profil' ? <ProfileTab person={person} onResult={report} /> : null}
      {tab === 'urunler' ? <ProductsTab person={person} onResult={report} /> : null}
      {tab === 'sorumluluklar' && person.staff ? <StaffTab person={person} onResult={report} /> : null}
      {tab === 'iliskiler' ? <RelationsTab person={person} onOpen={(id) => router.push(`/admin/person/${encodeURIComponent(id)}` as Href)} /> : null}
      {tab === 'guvenlik' ? <SecurityTab person={person} onResult={report} onInvite={setInvite} /> : null}
      {tab === 'gecmis' ? <HistoryTab person={person} /> : null}
      {invite ? <InviteSheet invite={invite} title="Davet yenilendi" onClose={() => setInvite(null)} /> : null}
    </>
  );
}

type OnResult = (result: { ok: true; text: string } | { ok: false; error: unknown }) => void;

function ProfileTab({ person, onResult }: { person: MobilePersonDetail; onResult: OnResult }) {
  const [email, setEmail] = useState(person.email);
  const [fullName, setFullName] = useState(person.profile.fullName);
  const [phone, setPhone] = useState(person.profile.phone);
  const [classLevel, setClassLevel] = useState(person.profile.classLevel);
  const [schoolName, setSchoolName] = useState(person.profile.schoolName);
  const [targetGoal, setTargetGoal] = useState(person.profile.targetGoal);
  const [subjects, setSubjects] = useState(person.profile.subjects.join(', '));
  const [bio, setBio] = useState(person.profile.bio);
  const mutation = useAdminMutation((api, input: Parameters<typeof updateUserProfile>[2]) => updateUserProfile(api, person.id, input));
  async function save() {
    try {
      await mutation.mutateAsync({
        email: email.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(person.role === 'STUDENT' ? { classLevel: classLevel.trim(), schoolName: schoolName.trim(), targetGoal: targetGoal.trim() } : {}),
        ...(person.role === 'TEACHER' ? { subjects: subjects.split(',').map((item) => item.trim()).filter(Boolean), bio: bio.trim() } : {}),
      });
      onResult({ ok: true, text: email.trim() !== person.email ? 'Profil güncellendi; e-posta değiştiği için açık oturumları kapatıldı.' : 'Profil güncellendi.' });
    } catch (error) {
      onResult({ ok: false, error });
    }
  }
  return (
    <Section title="Profil" first>
      <TextField label="Ad soyad" value={fullName} onChangeText={setFullName} testID="person-profile-name" />
      <TextField label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} hint="Değişirse kişinin açık oturumları kapatılır." />
      <TextField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      {person.role === 'STUDENT' ? (
        <>
          <TextField label="Sınıf" value={classLevel} onChangeText={setClassLevel} />
          <TextField label="Okul" value={schoolName} onChangeText={setSchoolName} />
          <TextField label="Hedef" value={targetGoal} onChangeText={setTargetGoal} multiline maxLength={500} />
        </>
      ) : null}
      {person.role === 'TEACHER' ? (
        <>
          <TextField label="Ders alanları" value={subjects} onChangeText={setSubjects} hint="Virgülle ayır" />
          <TextField label="Kısa tanıtım" value={bio} onChangeText={setBio} multiline maxLength={1200} />
        </>
      ) : null}
      <Button label="Profili kaydet" onPress={save} loading={mutation.isPending} disabled={mutation.isPending || !email.trim()} testID="person-profile-save" />
    </Section>
  );
}

function ProductsTab({ person, onResult }: { person: MobilePersonDetail; onResult: OnResult }) {
  const [selected, setSelected] = useState(person.productAccess.active);
  const mutation = useAdminMutation((api, products: ('OD' | 'OK' | 'ODK')[]) => setUserProducts(api, person.id, products));
  const changed = [...selected].sort().join() !== [...person.productAccess.active].sort().join();
  async function save() {
    try {
      await mutation.mutateAsync(selected);
      onResult({ ok: true, text: 'Ürün erişimi güncellendi.' });
    } catch (error) {
      onResult({ ok: false, error });
    }
  }
  return (
    <>
      <Section title="Ürün erişimleri" first>
        <Text tone="muted" variant="meta">Satın alınmış erişim yalnız sipariş üzerinden yönetilir.</Text>
        {person.memberships.length ? (
          person.memberships.map((membership) => (
            <Row
              key={membership.id}
              title={membership.productLabel}
              subtitle={[`${membership.sourceLabel} · ${date(membership.startsAt)} → ${membership.expiresAt ? date(membership.expiresAt) : 'süresiz'}`, membership.revokedAt ? `${date(membership.revokedAt)} tarihinde sonlandırıldı` : null, membership.grantedBy ? `Veren: ${membership.grantedBy}` : null, membership.orderPackage ? `Sipariş: ${membership.orderPackage}` : null].filter(Boolean).join(' · ')}
              trailing={<StatusBadge label={membership.stateLabel} tone={membership.stateTone} />}
            />
          ))
        ) : (
          <EmptyState title="Ürün erişimi yok." body={person.role === 'TEACHER' ? 'Personel erişimi Sorumluluklar sekmesindeki atamalardan gelir.' : undefined} />
        )}
      </Section>
      {person.productAccess.editable ? (
        <Section title="Manuel erişim">
          {person.productAccess.options.map((option) => (
            <Row key={option.value} title={option.label} selected={selected.includes(option.value)} onPress={() => setSelected((current) => (current.includes(option.value) ? current.filter((item) => item !== option.value) : [...current, option.value]))} testID={`person-product-${option.value}`} />
          ))}
          <Button label="Erişimi kaydet" onPress={save} disabled={!changed || !selected.length || mutation.isPending} loading={mutation.isPending} testID="person-products-save" />
        </Section>
      ) : null}
      {person.orders.length ? (
        <Section title="Siparişler">
          {person.orders.map((order) => (
            <Row key={order.id} title={order.packageName} subtitle={`${date(order.createdAt)} · ${order.statusText}`} />
          ))}
        </Section>
      ) : null}
    </>
  );
}

function StaffTab({ person, onResult }: { person: MobilePersonDetail; onResult: OnResult }) {
  const staff = person.staff!;
  const [option, setOption] = useState(0);
  const [reason, setReason] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [capacity, setCapacity] = useState(staff.coachCapacity === null ? '' : String(staff.coachCapacity));
  const grant = useAdminMutation((api, input: { product: string; role: string; reason: string }) => grantStaffRole(api, person.id, input));
  const revoke = useAdminMutation((api, input: { assignmentId: string; reason: string }) => revokeStaffRole(api, person.id, input));
  const coach = useAdminMutation((api, value: number | null) => setCoachCapacity(api, person.id, value));
  const capacityValue = capacity.trim() === '' ? null : Number(capacity);
  const capacityValid = capacityValue === null || (Number.isInteger(capacityValue) && capacityValue >= 1 && capacityValue <= 500);

  async function run(action: () => Promise<unknown>, text: string, after?: () => void) {
    try {
      await action();
      after?.();
      onResult({ ok: true, text });
    } catch (error) {
      onResult({ ok: false, error });
    }
  }
  const active = staff.history.filter((row) => !row.revokedAt);
  const past = staff.history.filter((row) => row.revokedAt);
  return (
    <>
      {staff.mfaPending ? <Banner tone="warning" title="MFA kurulumu bekleniyor">Ayrıcalıklı sorumluluk verildi; kişi ikinci faktörü kurana kadar bu sorumlulukları kullanamaz.</Banner> : null}
      <Section title="Aktif sorumluluklar" first>
        {active.length ? (
          active.map((row) => (
            <View key={row.id} style={styles.block}>
              <Row title={`${row.productLabel} · ${row.roleLabel}`} subtitle={[`${date(row.grantedAt)}`, row.grantedBy, row.grantReason].filter(Boolean).join(' · ')} meta={row.lastHolder ? 'Bu ürünün son sorumlusu' : null} onPress={() => setRevoking(revoking === row.id ? null : row.id)} testID={`person-staff-${row.id}`} />
              {revoking === row.id ? (
                <>
                  <TextField label="İptal gerekçesi" value={revokeReason} onChangeText={setRevokeReason} maxLength={500} testID="person-staff-revoke-reason" />
                  <Button label="Sorumluluğu iptal et" variant="destructive" disabled={revokeReason.trim().length < 3 || revoke.isPending} onPress={() => void run(() => revoke.mutateAsync({ assignmentId: row.id, reason: revokeReason.trim() }), 'Sorumluluk iptal edildi.', () => { setRevoking(null); setRevokeReason(''); })} testID="person-staff-revoke" />
                </>
              ) : null}
            </View>
          ))
        ) : (
          <Text tone="secondary">Aktif sorumluluk yok.</Text>
        )}
      </Section>
      <Section title="Sorumluluk ver">
        {staff.options.map((entry, index) => (
          <Row key={`${entry.product}-${entry.role}`} title={entry.label} selected={option === index} onPress={() => setOption(index)} testID={`person-staff-option-${entry.product}-${entry.role}`} />
        ))}
        <TextField label="Gerekçe" value={reason} onChangeText={setReason} maxLength={500} hint="En az 3 karakter; işlem geçmişine yazılır." testID="person-staff-reason" />
        <Button label="Sorumluluğu ver" disabled={reason.trim().length < 3 || grant.isPending} loading={grant.isPending} onPress={() => void run(() => grant.mutateAsync({ product: staff.options[option].product, role: staff.options[option].role, reason: reason.trim() }), 'Sorumluluk verildi.', () => setReason(''))} testID="person-staff-grant" />
      </Section>
      <Section title="Koç kapasitesi">
        <TextField label="Aktif öğrenci sınırı" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" hint="Boş bırakılırsa sınırsız (1–500)." error={capacityValid ? null : '1 ile 500 arasında bir tam sayı gir.'} />
        <Button label="Kapasiteyi kaydet" variant="secondary" disabled={!capacityValid || coach.isPending} onPress={() => void run(() => coach.mutateAsync(capacityValue), 'Koç kapasitesi kaydedildi.')} testID="person-coach-capacity-save" />
      </Section>
      {past.length ? (
        <Section title="Geçmiş sorumluluklar">
          {past.map((row) => (
            <Row key={row.id} title={`${row.productLabel} · ${row.roleLabel}`} subtitle={[row.revokedAt ? `${date(row.revokedAt)} iptal` : null, row.revokedBy, row.revokeReason].filter(Boolean).join(' · ')} />
          ))}
        </Section>
      ) : null}
    </>
  );
}

function RelationsTab({ person, onOpen }: { person: MobilePersonDetail; onOpen: (userId: string) => void }) {
  const relations = person.relations;
  return (
    <>
      {relations.attendance !== null ? (
        <Section title="Atamalar" first>
          <Row title="Koç" subtitle={relations.coach ?? 'Atanmadı'} />
          <Row title="Son ders katılımı" subtitle={relations.attendance} />
        </Section>
      ) : null}
      {relations.groups.length ? (
        <Section title="Gruplar">
          {relations.groups.map((group) => <Row key={group.id} title={group.label} subtitle={group.detail} />)}
        </Section>
      ) : null}
      {relations.parents.length ? (
        <Section title="Veli bağlantıları">
          {relations.parents.map((link) => <Row key={link.id} title={link.name} subtitle={link.relationship} onPress={() => onOpen(link.id)} />)}
        </Section>
      ) : null}
      {relations.children.length ? (
        <Section title="Bağlı öğrenciler">
          {relations.children.map((link) => <Row key={link.id} title={link.name} subtitle={link.relationship} onPress={() => onOpen(link.id)} />)}
        </Section>
      ) : null}
      {relations.notes.length ? (
        <Section title="Son öğretmen notları">
          {relations.notes.map((note) => <Row key={note.id} title={note.title} subtitle={note.body} />)}
        </Section>
      ) : null}
      {relations.teacher ? (
        <Section title="Öğretmen özeti">
          <Row title="Ders alanları" subtitle={relations.teacher.subjects} />
          <Row title="Koçluk" subtitle={relations.teacher.coach} />
          <Row title="Aktif grup / öğrenci" subtitle={relations.teacher.groupsAndStudents} />
          <Row title="Gelecek ders" subtitle={String(relations.teacher.upcomingLessons)} />
          <Row title="Bekleyen ders kapanışı" subtitle={String(relations.teacher.pendingClosures)} />
          <Row title="Açık yardım talebi" subtitle={String(relations.teacher.openHelp)} />
          <Row title="Açık müdahale / koçluk" subtitle={String(relations.teacher.openInterventionsAndCoaching)} />
        </Section>
      ) : null}
      {relations.branchStudents.length ? (
        <Section title="Branş öğrencileri">
          {relations.branchStudents.map((link) => <Row key={link.id} title={link.name} subtitle={link.subject} />)}
        </Section>
      ) : null}
      {relations.recentLessons.length ? (
        <Section title="Son dersler">
          {relations.recentLessons.map((lesson) => <Row key={lesson.id} title={lesson.title} subtitle={lesson.detail} />)}
        </Section>
      ) : null}
      {person.role === 'ADMIN' ? <Text tone="secondary">Yönetici hesabının öğrenci, grup veya veli ilişkisi yoktur.</Text> : null}
    </>
  );
}

const STATUS_ACTIONS: { status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'; label: string; confirm: string }[] = [
  { status: 'ACTIVE', label: 'Aktifleştir', confirm: 'Hesap yeniden aktifleşecek.' },
  { status: 'SUSPENDED', label: 'Askıya al', confirm: 'Kişi giriş yapamaz; açık oturumları kapatılır.' },
  { status: 'ARCHIVED', label: 'Arşivle', confirm: 'Arşivlenen hesap giriş yapamaz. Öğretmende grup, ders ve sorumluluk devri tamamlanmadıysa işlem reddedilir.' },
];

function SecurityTab({ person, onResult, onInvite }: { person: MobilePersonDetail; onResult: OnResult; onInvite: (invite: MobileInviteResult['invite']) => void }) {
  const [reason, setReason] = useState('');
  const status = useAdminMutation((api, next: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED') => setUserStatus(api, person.id, next));
  const invite = useAdminMutation((api) => resetUserInvite(api, person.id));
  const request = useAdminMutation((api, text: string) => requestMfaReset(api, person.id, text));
  const approve = useAdminMutation((api, id: string) => approveMfaReset(api, id));

  function confirm(title: string, body: string, action: () => void) {
    Alert.alert(title, body, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla', style: 'destructive', onPress: action }]);
  }
  async function run(action: () => Promise<unknown>, text: string) {
    try {
      await action();
      onResult({ ok: true, text });
    } catch (error) {
      onResult({ ok: false, error });
    }
  }
  return (
    <>
      <Section title="İkinci faktör" first>
        <Row title="MFA" subtitle={person.security.mfaLabel} />
        {person.security.pendingResets.map((reset) => (
          <Row
            key={reset.id}
            title={`Bekleyen sıfırlama · ${reset.requestedByName}`}
            subtitle={`${date(reset.createdAt)} · ${reset.reason}`}
            trailing={reset.canApprove ? <Button label="Onayla" variant="secondary" onPress={() => confirm('MFA sıfırlamasını onayla', 'Hedefin tüm doğrulama yöntemleri silinir ve oturumları kapatılır.', () => void run(() => approve.mutateAsync(reset.id), 'MFA sıfırlaması onaylandı.'))} testID={`person-mfa-approve-${reset.id}`} /> : <Text tone="muted" variant="meta">Onaylayamazsın</Text>}
          />
        ))}
        {person.security.canRequestReset ? (
          <>
            <TextField label="Sıfırlama gerekçesi" value={reason} onChangeText={setReason} multiline maxLength={500} hint="En az 10 karakter. Onayı başka bir yönetici verir." testID="person-mfa-reason" />
            <Button label="MFA sıfırlama iste" variant="secondary" disabled={reason.trim().length < 10 || request.isPending} onPress={() => void run(() => request.mutateAsync(reason.trim()), 'MFA sıfırlama isteği açıldı; başka bir yöneticinin onayı bekleniyor.')} testID="person-mfa-request" />
          </>
        ) : null}
      </Section>
      <Section title="Hesap durumu">
        {person.isSelf ? (
          <Text tone="secondary">Kendi hesabının durumunu buradan değiştiremezsin.</Text>
        ) : (
          <View style={styles.actions}>
            {STATUS_ACTIONS.filter((action) => action.status !== person.status).map((action) => (
              <Button key={action.status} label={action.label} variant={action.status === 'ACTIVE' ? 'secondary' : 'destructive'} disabled={status.isPending} onPress={() => confirm(action.label, action.confirm, () => void run(() => status.mutateAsync(action.status), `Hesap durumu güncellendi: ${action.label}.`))} testID={`person-status-${action.status}`} />
            ))}
          </View>
        )}
        {person.status === 'ACTIVE' ? (
          <Button
            label="Daveti / parolayı yenile"
            variant="secondary"
            disabled={invite.isPending}
            onPress={() =>
              confirm('Daveti yenile', 'Kişinin açık oturumları kapatılır ve yeni tek kullanımlık bağlantı oluşturulur.', () =>
                void invite.mutateAsync(undefined).then((result) => onInvite(result.invite), (error) => onResult({ ok: false, error })),
              )
            }
            testID="person-invite-reset"
          />
        ) : null}
      </Section>
    </>
  );
}

function HistoryTab({ person }: { person: MobilePersonDetail }) {
  return (
    <Section title="İşlem geçmişi" first>
      {person.history.length ? person.history.map((row) => <Row key={row.id} title={row.summary || row.action} subtitle={`${row.actorName} · ${date(row.createdAt)}`} />) : <EmptyState title="Bu kişi için kayıt yok." />}
    </Section>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  block: { gap: space[2] },
});
