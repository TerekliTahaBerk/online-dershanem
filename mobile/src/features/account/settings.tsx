import type { AccessibilityPreferences, AccountSettings, AccountSettingsCommand, AccountSettingsSection, NetworkPreferences } from '@contracts/account-settings';
import { REVISIONED_SETTINGS_COMMANDS } from '@contracts/account-settings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { FilterChips } from '@/features/admin/ui';
import { confirmAction, OfflineWriteNotice, QueryView, useOnline, usePullToRefresh, useStableKey, WriteBanner, writeError, type WriteState } from '@/features/staff/shared';
import { fetchAccountSettings, runAccountSettings, saveAccessibilityPreferences, saveNetworkPreferences } from '@/lib/api/account';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatDayMonth } from '@/lib/format/istanbul';
import { queryKeys } from '@/lib/query/keys';

/**
 * P5.2 · HESAP AYARLARI (web `/panel/ayarlar`, `/panel/ayarlar/[section]`,
 * `/panel/erisilebilirlik`, `/panel/veri-kullanimi`).
 *
 * Bölüm verisi ve izinleri sunucudan gelir (rolün görmediği bölüm `null`).
 * Yazmalar işlem anahtarı + okunan revizyonla gider; 409'da görünüm
 * yenilenir ve kullanıcıya güncel bilgileri kontrol etmesi söylenir.
 */
const CONFLICT = 'Ayarların başka bir oturumda değişti. Güncel bilgiler yüklendi; kontrol edip yeniden kaydet.';

function useAccountSettings() {
  const bootstrap = useReadyBootstrap();
  const { api } = useSession();
  return useQuery({ queryKey: queryKeys.accountSettings(bootstrap.user.id), queryFn: ({ signal }) => fetchAccountSettings(api, signal) });
}

function useInvalidateSettings() {
  const bootstrap = useReadyBootstrap();
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: queryKeys.accountSettings(bootstrap.user.id) });
}

/** Ayar komutu: aynı gövdeyle yeniden denemede aynı işlem anahtarı (belirsiz sonuç). */
function useSettingsCommand(onDone: (state: WriteState) => void) {
  const { api } = useSession();
  const online = useOnline();
  const invalidate = useInvalidateSettings();
  const key = useStableKey<{ command: AccountSettingsCommand; revision: string }>((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: async (input: { command: AccountSettingsCommand; revision: string }) => {
      if (!online) throw new ApiError({ kind: 'network' });
      const revisioned = REVISIONED_SETTINGS_COMMANDS.includes(input.command.type);
      try {
        const result = await runAccountSettings(api, input.command, key.keyFor(input), revisioned ? input.revision : undefined);
        key.settle();
        return result;
      } catch (error) {
        key.settle(error);
        throw error;
      }
    },
  });
  async function run(command: AccountSettingsCommand, revision: string) {
    if (mutation.isPending) return false;
    try {
      const result = await mutation.mutateAsync({ command, revision });
      onDone({ tone: 'success', message: result.message });
      await invalidate();
      return true;
    } catch (error) {
      onDone(writeError(error, CONFLICT));
      if (error instanceof ApiError && error.kind === 'conflict') await invalidate();
      return false;
    }
  }
  return { run, pending: mutation.isPending, online };
}

const SECTION_ROUTE = (section: AccountSettingsSection): Href => (section === 'guvenlik' ? '/account' : (`/account/settings/${section}` as Href));

/** C07 · Ayarlar genel bakış: tamamlama listesi, bölümler, paketler ve panel tercihleri. */
export function AccountSettingsHome() {
  const query = useAccountSettings();
  const router = useRouter();
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen testID="account-settings" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <PageHeader title="Hesap ayarları" description="Profil, iletişim ve onay bilgilerin. Bu bilgiler hiçbir ürün erişimini değiştirmez." />
      <QueryView query={query}>
        {(data) => (
          <>
            {data.completion ? (
              <Section first title={`Profil tamamlama · %${data.completion.percent}`}>
                {data.completion.requirements.map((item) => (
                  <Row
                    key={item.key}
                    title={item.label}
                    trailing={<StatusBadge label={item.done ? 'Tamam' : 'Eksik'} tone={item.done ? 'success' : 'warning'} />}
                    onPress={item.done ? undefined : () => router.push(SECTION_ROUTE(item.section as AccountSettingsSection))}
                    testID={`requirement-${item.key}`}
                  />
                ))}
                {data.completion.contactFormApplicable && !data.completion.contactFormSubmitted ? <Text tone="secondary">İletişim formunu henüz doldurmadın; formu web sitesinden doldurabilirsin.</Text> : null}
              </Section>
            ) : null}
            <Section first={!data.completion} title="Bölümler">
              {data.sections.map((section) => (
                <Row key={section.key} title={section.label} subtitle={section.key === 'guvenlik' ? 'Parola, oturumlar ve bildirimler' : undefined} onPress={() => router.push(SECTION_ROUTE(section.key))} testID={`settings-section-${section.key}`} />
              ))}
            </Section>
            {data.role === 'STUDENT' || data.role === 'PARENT' ? (
              <Section title="Paketlerin">
                {data.memberships.length ? (
                  data.memberships.map((item) => <Row key={item.product} title={item.label} subtitle={item.expiresAt ? `Aktif · dönem sonu ${formatDayMonth(item.expiresAt)}` : 'Aktif'} />)
                ) : (
                  <EmptyState title="Aktif paketin yok" body="Paket satın alındığında erişimin otomatik açılır." />
                )}
              </Section>
            ) : null}
            {data.preferences.accessibility || data.preferences.network ? (
              <Section title="Panel tercihleri">
                {data.preferences.accessibility ? <Row title="Erişilebilirlik" subtitle="Hareket, kontrast, yazı boyutu ve altyazı tercihleri" onPress={() => router.push('/account/accessibility' as Href)} testID="settings-accessibility" /> : null}
                {data.preferences.network ? <Row title="Veri kullanımı" subtitle="Düşük veri görünümü ve çevrimdışı yazma izni" onPress={() => router.push('/account/data-usage' as Href)} testID="settings-data-usage" /> : null}
              </Section>
            ) : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
}

/** C08 · Tek ayar bölümü. Rol bu bölümü görmüyorsa sunucu verisi `null` döner. */
export function AccountSettingsSectionScreen({ section }: { section: string }) {
  const query = useAccountSettings();
  const refresh = usePullToRefresh(() => query.refetch());
  const [state, setState] = useState<WriteState>(null);
  const command = useSettingsCommand(setState);
  return (
    <Screen testID={`account-settings-${section}`} refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <QueryView query={query}>
        {(data) => {
          const meta = data.sections.find((item) => item.key === section);
          if (!meta || section === 'guvenlik') return <EmptyState title="Bu bölüm hesabın için açık değil" />;
          const submit = (next: AccountSettingsCommand) => command.run(next, data.revision);
          return (
            <>
              <PageHeader title={meta.label} />
              <OfflineWriteNotice online={command.online} />
              <WriteBanner state={state} />
              {section === 'profil' ? <ProfileForm key={data.revision} data={data} submit={submit} pending={command.pending} /> : null}
              {section === 'egitim' && data.education ? <EducationForm key={data.revision} data={data} education={data.education} submit={submit} pending={command.pending} /> : null}
              {section === 'iletisim' && data.contact ? <ContactForm key={data.revision} data={data} contact={data.contact} submit={submit} pending={command.pending} /> : null}
              {section === 'fatura' && data.billing ? <BillingForm key={data.revision} billing={data.billing} submit={submit} pending={command.pending} /> : null}
              {section === 'onaylar' && data.consents ? <ConsentForm key={data.revision} consents={data.consents} submit={submit} pending={command.pending} /> : null}
              {section === 'cocuklarim' && data.children ? <ChildrenSection data={data} childrenData={data.children} submit={submit} pending={command.pending} /> : null}
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}

type Submit = (command: AccountSettingsCommand) => Promise<boolean>;
type Option = { value: string; label: string };
const NONE = '__none';
const blank = (value: string) => (value.trim() ? value.trim() : null);
const label = (options: Option[], value: string | null) => options.find((item) => item.value === value)?.label ?? '—';

/** Tekli seçim; isteğe bağlı alanlarda "Seçilmedi" ile temizlenebilir. */
function Choice({ title, value, options, onChange, optional = false }: { title: string; value: string | null; options: Option[]; onChange: (value: string | null) => void; optional?: boolean }) {
  const all = optional ? [{ value: NONE, label: 'Seçilmedi' }, ...options] : options;
  return (
    <View style={styles.field}>
      <Text variant="bodyStrong">{title}</Text>
      <FilterChips label={title} value={value ?? NONE} options={all} onChange={(next) => onChange(next === NONE ? null : next)} />
    </View>
  );
}

function Toggle({ title, subtitle, value, onChange, disabled, testID }: { title: string; subtitle?: string; value: boolean; onChange: (next: boolean) => void; disabled?: boolean; testID: string }) {
  const { product } = useDesign();
  return <Row title={title} subtitle={subtitle} trailing={<Switch value={value} disabled={disabled} onValueChange={onChange} trackColor={{ true: product.accent }} accessibilityLabel={title} testID={testID} />} />;
}

function ProfileForm({ data, submit, pending }: { data: AccountSettings; submit: Submit; pending: boolean }) {
  const learner = data.role === 'STUDENT' || data.role === 'PARENT';
  const [fullName, setFullName] = useState(data.profile.fullName ?? '');
  const [phone, setPhone] = useState(data.profile.phone ?? '');
  const [birthDate, setBirthDate] = useState(data.profile.birthDate ?? '');
  const [relationship, setRelationship] = useState(data.profile.relationship);
  const [city, setCity] = useState(data.profile.city ?? '');
  const [district, setDistrict] = useState(data.profile.district ?? '');
  const save = () =>
    void submit({
      type: 'profile',
      fullName: fullName.trim(),
      phone: phone.trim(),
      ...(learner ? { city: blank(city), district: blank(district) } : {}),
      ...(data.role === 'STUDENT' ? { birthDate: blank(birthDate) } : {}),
      ...(data.role === 'PARENT' ? { relationship } : {}),
    });
  return (
    <Section first title="Kişisel bilgiler">
      <TextField label="Ad soyad" value={fullName} onChangeText={setFullName} maxLength={120} autoComplete="name" testID="settings-fullName" />
      <Row title="E-posta" subtitle={data.profile.email} meta="Değişiklik için bizimle iletişime geç" />
      <TextField label="Cep telefonu" value={phone} onChangeText={setPhone} maxLength={24} keyboardType="phone-pad" placeholder="5xx xxx xx xx" autoComplete="tel" testID="settings-phone" />
      {data.role === 'STUDENT' ? <TextField label="Doğum tarihi" hint="YYYY-AA-GG biçiminde, ör. 2008-05-21" value={birthDate} onChangeText={setBirthDate} maxLength={10} keyboardType="numbers-and-punctuation" testID="settings-birthDate" /> : null}
      {data.role === 'PARENT' ? <Choice title="Öğrenciye yakınlığınız" value={relationship} options={data.options.relationships} onChange={setRelationship} optional /> : null}
      {learner ? (
        <>
          <TextField label="İl" value={city} onChangeText={setCity} maxLength={80} testID="settings-city" />
          <TextField label="İlçe" value={district} onChangeText={setDistrict} maxLength={80} testID="settings-district" />
        </>
      ) : null}
      <Button mutation label="Kaydet" loading={pending} disabled={pending || fullName.trim().length < 2 || !phone.trim()} onPress={save} testID="settings-save-profile" />
    </Section>
  );
}

const toInt = (value: string) => (value.trim() && /^\d+$/.test(value.trim()) ? Number(value.trim()) : null);

function EducationForm({ data, education, submit, pending }: { data: AccountSettings; education: NonNullable<AccountSettings['education']>; submit: Submit; pending: boolean }) {
  const [classLevel, setClassLevel] = useState(education.classLevel);
  const [examType, setExamType] = useState(education.examType);
  const [fieldTrack, setFieldTrack] = useState(education.fieldTrack);
  const [schoolType, setSchoolType] = useState(education.schoolType);
  const [schoolName, setSchoolName] = useState(education.schoolName ?? '');
  const [targetRank, setTargetRank] = useState(education.targetRank?.toString() ?? '');
  const [weeklyStudyHours, setWeeklyStudyHours] = useState(education.weeklyStudyHours?.toString() ?? '');
  const [weakSubjects, setWeakSubjects] = useState(education.weakSubjects);
  const [guardianName, setGuardianName] = useState(education.guardianName ?? '');
  const [guardianPhone, setGuardianPhone] = useState(education.guardianPhone ?? '');
  const [guardianEmail, setGuardianEmail] = useState(education.guardianEmail ?? '');
  const needsTrack = Boolean(examType && data.options.fieldTrackExams.includes(examType));
  const toggleSubject = (value: string) => setWeakSubjects((items) => (items.includes(value) ? items.filter((item) => item !== value) : [...items, value]));
  const save = () => {
    if (!classLevel || !examType) return;
    void submit({
      type: 'education',
      classLevel,
      examType,
      fieldTrack: needsTrack ? fieldTrack : null,
      schoolName: blank(schoolName),
      schoolType,
      targetRank: toInt(targetRank),
      weeklyStudyHours: toInt(weeklyStudyHours),
      weakSubjects,
      guardianName: blank(guardianName),
      guardianPhone: blank(guardianPhone),
      guardianEmail: blank(guardianEmail),
    });
  };
  return (
    <>
      <Section first title="Eğitim">
        <Choice title="Sınıf" value={classLevel} options={data.options.classLevels} onChange={setClassLevel} />
        <Choice title="Hedef sınav" value={examType} options={data.options.examTypes} onChange={setExamType} />
        {needsTrack ? <Choice title="Alan" value={fieldTrack} options={data.options.fieldTracks} onChange={setFieldTrack} optional /> : null}
        <Choice title="Okul türü" value={schoolType} options={data.options.schoolTypes} onChange={setSchoolType} optional />
        <TextField label="Okul adı" value={schoolName} onChangeText={setSchoolName} maxLength={160} />
        <TextField label="Hedef sıralama" value={targetRank} onChangeText={setTargetRank} keyboardType="number-pad" maxLength={7} />
        <TextField label="Haftalık çalışma (saat)" value={weeklyStudyHours} onChangeText={setWeeklyStudyHours} keyboardType="number-pad" maxLength={3} />
      </Section>
      <Section title="Zorlandığın dersler">
        {data.options.subjects.map((subject) => (
          <Row key={subject.value} title={subject.label} trailing={weakSubjects.includes(subject.value) ? <StatusBadge label="Seçili" tone="info" /> : undefined} selected={weakSubjects.includes(subject.value)} onPress={() => toggleSubject(subject.value)} testID={`subject-${subject.value}`} />
        ))}
      </Section>
      <Section title="Veli bilgisi">
        <Text tone="secondary">Velinin hesabını seninkine bağlayabilmemiz için.</Text>
        <TextField label="Ad soyad" value={guardianName} onChangeText={setGuardianName} maxLength={120} />
        <TextField label="Telefon" value={guardianPhone} onChangeText={setGuardianPhone} maxLength={24} keyboardType="phone-pad" />
        <TextField label="E-posta" value={guardianEmail} onChangeText={setGuardianEmail} maxLength={254} keyboardType="email-address" autoCapitalize="none" />
        <Button mutation label="Kaydet" loading={pending} disabled={pending || !classLevel || !examType} onPress={save} testID="settings-save-education" />
      </Section>
    </>
  );
}

function ContactForm({ data, contact, submit, pending }: { data: AccountSettings; contact: NonNullable<AccountSettings['contact']>; submit: Submit; pending: boolean }) {
  const [channel, setChannel] = useState(contact.preferredChannel);
  const [time, setTime] = useState(contact.preferredContactTime);
  const [note, setNote] = useState(contact.note ?? '');
  return (
    <Section first title="Sana nasıl ulaşalım?">
      <Choice title="Kanal" value={channel} options={data.options.contactChannels} onChange={(next) => next && setChannel(next)} />
      <Choice title="Uygun saat" value={time} options={data.options.contactTimes} onChange={(next) => next && setTime(next)} />
      <TextField label="Ekibimize notun" hint="En fazla 500 karakter." value={note} onChangeText={setNote} maxLength={500} multiline />
      <Button mutation label="Kaydet" loading={pending} disabled={pending} onPress={() => void submit({ type: 'contact', preferredChannel: channel, preferredContactTime: time, note: blank(note) })} testID="settings-save-contact" />
    </Section>
  );
}

function BillingForm({ billing, submit, pending }: { billing: NonNullable<AccountSettings['billing']>; submit: Submit; pending: boolean }) {
  const [address, setAddress] = useState(billing.billingAddress ?? '');
  return (
    <Section first title="Fatura adresi">
      <TextField label="Fatura adresi" hint="Ödeme ekranında otomatik doldurulur." value={address} onChangeText={setAddress} maxLength={500} multiline testID="settings-billingAddress" />
      <Text tone="muted" variant="meta">T.C. kimlik numaran profilinde saklanmaz; yalnız fatura için ödeme sırasında istenir.</Text>
      <Button mutation label="Kaydet" loading={pending} disabled={pending} onPress={() => void submit({ type: 'billing', billingAddress: blank(address) })} testID="settings-save-billing" />
    </Section>
  );
}

function ConsentForm({ consents, submit, pending }: { consents: NonNullable<AccountSettings['consents']>; submit: Submit; pending: boolean }) {
  const accepted = Boolean(consents.kvkkAcceptedAt);
  const [kvkk, setKvkk] = useState(accepted);
  const [marketing, setMarketing] = useState(consents.marketingConsent);
  return (
    <Section first title="Onaylar">
      <Toggle
        title="KVKK aydınlatma metnini okudum ve kabul ediyorum"
        subtitle={consents.kvkkAcceptedAt ? `${formatDayMonth(consents.kvkkAcceptedAt)} tarihinde onaylandı${consents.kvkkVersion ? ` (sürüm ${consents.kvkkVersion})` : ''}. Geri çekme talebi hesap silme sürecidir.` : undefined}
        value={kvkk}
        disabled={accepted}
        onChange={setKvkk}
        testID="consent-kvkk"
      />
      <Toggle title="Kampanya ve duyurular için ticari elektronik ileti almak istiyorum" value={marketing} onChange={setMarketing} testID="consent-marketing" />
      <Button mutation label="Kaydet" loading={pending} disabled={pending} onPress={() => void submit({ type: 'consents', kvkkConsent: kvkk, marketingConsent: marketing })} testID="settings-save-consents" />
    </Section>
  );
}

function ChildrenSection({ data, childrenData, submit, pending }: { data: AccountSettings; childrenData: NonNullable<AccountSettings['children']>; submit: Submit; pending: boolean }) {
  const [fullName, setFullName] = useState('');
  const [classLevel, setClassLevel] = useState<string | null>(null);
  const [examType, setExamType] = useState<string | null>(null);
  const [fieldTrack, setFieldTrack] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const needsTrack = Boolean(examType && data.options.fieldTrackExams.includes(examType));
  async function add() {
    if (!classLevel || !examType) return;
    const saved = await submit({ type: 'addChild', fullName: fullName.trim(), classLevel, examType, fieldTrack: needsTrack ? fieldTrack : null, schoolName: blank(schoolName) });
    if (saved) {
      setFullName('');
      setClassLevel(null);
      setExamType(null);
      setFieldTrack(null);
      setSchoolName('');
    }
  }
  async function cancel(child: { id: string; fullName: string }) {
    if (!(await confirmAction({ title: 'Kaydı kaldır', message: `${child.fullName} için bekleyen kayıt kaldırılsın mı?`, confirmLabel: 'Kaldır', destructive: true }))) return;
    await submit({ type: 'cancelChild', childId: child.id });
  }
  return (
    <>
      <Section first title="Bağlı öğrenciler">
        {childrenData.linked.length ? (
          childrenData.linked.map((child, index) => <Row key={index} title={child.name} subtitle={`${label(data.options.classLevels, child.classLevel)} · ${label(data.options.examTypes, child.examType)}`} />)
        ) : (
          <EmptyState title="Henüz hesabınıza bağlı bir öğrenci yok" />
        )}
      </Section>
      {childrenData.pending.length ? (
        <Section title="Hesabı açılmayı bekleyenler">
          {childrenData.pending.map((child) => (
            <View key={child.id} style={styles.pending}>
              <Row title={child.fullName} subtitle={child.paid ? 'Ödeme alındı — ekibimiz öğrenci hesabını açıyor.' : 'Ekibimiz öğrenci hesabını açıp size bağlayacak.'} meta={`${label(data.options.classLevels, child.classLevel)} · ${label(data.options.examTypes, child.examType)}`} />
              {!child.paid ? <Button mutation label="Kaldır" variant="secondary" disabled={pending} onPress={() => void cancel(child)} testID={`child-cancel-${child.id}`} /> : null}
            </View>
          ))}
        </Section>
      ) : null}
      <Section title="Çocuk ekle">
        <TextField label="Ad soyad" value={fullName} onChangeText={setFullName} maxLength={120} testID="child-fullName" />
        <Choice title="Sınıf" value={classLevel} options={data.options.classLevels} onChange={setClassLevel} />
        <Choice title="Hedef sınav" value={examType} options={data.options.examTypes} onChange={setExamType} />
        {needsTrack ? <Choice title="Alan" value={fieldTrack} options={data.options.fieldTracks} onChange={setFieldTrack} optional /> : null}
        <TextField label="Okul adı" value={schoolName} onChangeText={setSchoolName} maxLength={160} />
        {childrenData.pending.length >= 5 ? <Banner tone="info">Aynı anda en fazla 5 bekleyen çocuk kaydı açılabilir.</Banner> : null}
        <Button mutation label="Çocuğu ekle" loading={pending} disabled={pending || fullName.trim().length < 2 || !classLevel || !examType || childrenData.pending.length >= 5} onPress={() => void add()} testID="child-add" />
      </Section>
    </>
  );
}

/** Tercih yazması (PATCH + `expectedVersion`): 409'da güncel sürüm yeniden okunur. */
function usePreferenceSave<T extends { version: number }>(save: (preference: T) => Promise<unknown>) {
  const online = useOnline();
  const invalidate = useInvalidateSettings();
  const [state, setState] = useState<WriteState>(null);
  const mutation = useMutation({ networkMode: 'always', mutationFn: async (preference: T) => { if (!online) throw new ApiError({ kind: 'network' }); return save(preference); } });
  async function run(preference: T) {
    if (mutation.isPending) return;
    setState(null);
    try {
      await mutation.mutateAsync(preference);
      setState({ tone: 'success', message: 'Tercihlerin kaydedildi.' });
      await invalidate();
    } catch (error) {
      setState(writeError(error, 'Tercihler başka bir oturumda değişti. Güncel tercihler yüklendi; yeniden kaydet.'));
      if (error instanceof ApiError && error.kind === 'conflict') await invalidate();
    }
  }
  return { run, state, pending: mutation.isPending, online };
}

/** C10 · Erişilebilirlik tercihleri (web `/panel/erisilebilirlik`). */
export function AccessibilityPreferencesScreen() {
  const query = useAccountSettings();
  const refresh = usePullToRefresh(() => query.refetch());
  const { api } = useSession();
  const write = usePreferenceSave<AccessibilityPreferences>((preference) => saveAccessibilityPreferences(api, preference));
  return (
    <Screen testID="account-accessibility" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <PageHeader title="Erişilebilirlik" description="Tercihler hesabına bağlıdır ve web panelinde de uygulanır. Sağlık tanısı veya engel adı istemeyiz." />
      <OfflineWriteNotice online={write.online} />
      <WriteBanner state={write.state} />
      <QueryView query={query}>
        {(data) => (data.preferences.accessibility ? <AccessibilityForm key={data.preferences.accessibility.version} initial={data.preferences.accessibility} save={write.run} pending={write.pending} /> : <EmptyState title="Erişilebilirlik profili henüz açık değil" />)}
      </QueryView>
    </Screen>
  );
}

function AccessibilityForm({ initial, save, pending }: { initial: AccessibilityPreferences; save: (preference: AccessibilityPreferences) => Promise<void>; pending: boolean }) {
  const [value, setValue] = useState(initial);
  const set = (patch: Partial<AccessibilityPreferences>) => setValue((current) => ({ ...current, ...patch }));
  return (
    <Section first title="Görünüm ve içerik">
      <Toggle title="Hareketi azalt" subtitle="Geçiş ve animasyonlar en aza iner." value={value.reducedMotion} onChange={(reducedMotion) => set({ reducedMotion })} testID="a11y-reducedMotion" />
      <Toggle title="Yüksek kontrast" value={value.highContrast} onChange={(highContrast) => set({ highContrast })} testID="a11y-highContrast" />
      <Toggle title="Büyük yazı" subtitle="Web panelinde metin boyutu büyür; uygulamada sistem yazı boyutu da geçerlidir." value={value.textScale === 'LARGE'} onChange={(large) => set({ textScale: large ? 'LARGE' : 'DEFAULT' })} testID="a11y-textScale" />
      <Toggle title="Rahat aralık" value={value.comfortableSpacing} onChange={(comfortableSpacing) => set({ comfortableSpacing })} testID="a11y-comfortableSpacing" />
      <Toggle title="Altyazı tercih ederim" value={value.captionsPreferred} onChange={(captionsPreferred) => set({ captionsPreferred })} testID="a11y-captionsPreferred" />
      <Toggle title="Döküm (transkript) tercih ederim" value={value.transcriptPreferred} onChange={(transcriptPreferred) => set({ transcriptPreferred })} testID="a11y-transcriptPreferred" />
      <Button mutation label="Kaydet" loading={pending} disabled={pending} onPress={() => void save(value)} testID="a11y-save" />
    </Section>
  );
}

/** C11 · Düşük veri tercihleri (web `/panel/veri-kullanimi`). */
export function DataUsageScreen() {
  const query = useAccountSettings();
  const refresh = usePullToRefresh(() => query.refetch());
  const { api } = useSession();
  const write = usePreferenceSave<NetworkPreferences>((preference) => saveNetworkPreferences(api, preference));
  return (
    <Screen testID="account-data-usage" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <PageHeader title="Veri kullanımı" description="Düşük veri görünümünü ve sınırlı çevrimdışı yazma iznini sen yönetirsin." />
      <OfflineWriteNotice online={write.online} />
      <WriteBanner state={write.state} />
      <QueryView query={query}>
        {(data) => (data.preferences.network ? <NetworkForm key={data.preferences.network.version} initial={data.preferences.network} save={write.run} pending={write.pending} /> : <EmptyState title="Düşük veri modu henüz açık değil" />)}
      </QueryView>
    </Screen>
  );
}

function NetworkForm({ initial, save, pending }: { initial: NetworkPreferences; save: (preference: NetworkPreferences) => Promise<void>; pending: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <Section first title="Bağlantı">
      <Toggle title="Düşük veri görünümü" subtitle="Görseller ve önizlemeler yüklenmeden önce sorulur." value={value.lowDataMode} onChange={(lowDataMode) => setValue((current) => ({ ...current, lowDataMode }))} testID="network-lowDataMode" />
      <Toggle title="Web panelinde çevrimdışı yazma" subtitle="Bu tercih web panelindeki sınırlı çevrimdışı kayıt içindir; uygulama yazmaları her zaman bağlantı ister." value={value.offlineWritesEnabled} onChange={(offlineWritesEnabled) => setValue((current) => ({ ...current, offlineWritesEnabled }))} testID="network-offlineWrites" />
      <Button mutation label="Kaydet" loading={pending} disabled={pending} onPress={() => void save(value)} testID="network-save" />
    </Section>
  );
}

const styles = StyleSheet.create({ field: { gap: 6 }, pending: { gap: 8 } });
