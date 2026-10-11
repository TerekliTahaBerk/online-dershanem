import { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import type { MobileGroup360, MobileGroupMemberPreview } from '@contracts/admin-education';

import { Banner, Button, Row, Section, Text, TextField } from '@/design/primitives';
import { executeGroupMembers, fetchGroupCandidates, previewGroupMembers, updateGroup, type GroupMemberAction, type GroupUpdate } from '@/lib/api/admin-education';
import { useSession } from '@/lib/auth/session-provider';

import { adminErrorText, QueryView, useAdminMutation, useAdminQuery } from './shared';
import { FilterChips, SearchPicker } from './ui';

type Notice = (text: string, error?: boolean) => void;

export function GroupEditor({ group, onNotice }: { group: MobileGroup360; onNotice: Notice }) {
  const [name, setName] = useState(group.name);
  const [subject, setSubject] = useState(group.subject);
  const [level, setLevel] = useState(group.level ?? '');
  const [teacherId, setTeacherId] = useState(group.teacherId);
  const mutation = useAdminMutation((api, action: GroupUpdate, context) => updateGroup(api, group.id, action, group.revision!, context.idempotencyKey));
  const save = (action: GroupUpdate, message: string) => void mutation.mutateAsync(action).then(() => onNotice(message)).catch((error) => onNotice(adminErrorText(error)!, true));
  if (!group.revision) return <Banner tone="info" title="Grup düzenleme">Sunucu güncellendikten sonra bu bölüm açılacak.</Banner>;
  return <>
    <Section title="Grup bilgileri">
      <TextField label="Grup adı" value={name} onChangeText={setName} maxLength={80} testID="group-edit-name" />
      <TextField label="Ders / branş" value={subject} onChangeText={setSubject} maxLength={80} testID="group-edit-subject" />
      <TextField label="Seviye" value={level} onChangeText={setLevel} maxLength={40} testID="group-edit-level" />
      <Button mutation label="Bilgileri kaydet" loading={mutation.isPending} disabled={name.trim().length < 2 || subject.trim().length < 2} testID="group-edit-save" onPress={() => save({ action: 'UPDATE_META', name, subject, level }, 'Grup bilgileri kaydedildi.')} />
    </Section>
    <Section title="Öğretmen">
      <SearchPicker label="Yeni öğretmen" options={group.teachers} value={teacherId} onChange={setTeacherId} testID="group-change-teacher" />
      <Button mutation label="Öğretmeni değiştir" disabled={!teacherId || teacherId === group.teacherId} loading={mutation.isPending} testID="group-teacher-save" onPress={() => Alert.alert('Öğretmen değiştirilsin mi?', 'Aktif ders serileri ve yaklaşan planlı dersler de yeni öğretmene atanır. Program çakışmaları sunucuda kontrol edilir.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Değiştir', onPress: () => { if (teacherId) save({ action: 'CHANGE_TEACHER', teacherId }, 'Grubun öğretmeni güncellendi.'); } }])} />
    </Section>
    <Section title="Grup durumu">
      <Button mutation label={group.active ? 'Grubu kapat' : 'Grubu tekrar aç'} variant={group.active ? 'destructive' : 'primary'} loading={mutation.isPending} testID="group-status-save" onPress={() => Alert.alert(group.active ? 'Grup kapatılsın mı?' : 'Grup tekrar açılsın mı?', 'Ders serilerinin aktif durumu da güncellenir.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla', style: 'destructive', onPress: () => save({ action: 'SET_ACTIVE', isActive: !group.active }, group.active ? 'Grup kapatıldı.' : 'Grup tekrar açıldı.') }])} />
    </Section>
  </>;
}

export function GroupMembers({ group, onNotice }: { group: MobileGroup360; onNotice: Notice }) {
  const { api } = useSession();
  const [search, setSearch] = useState('');
  const [candidate, setCandidate] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<'TRANSFER' | 'REMOVE' | 'NOTIFY'>('TRANSFER');
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirmation, setConfirmation] = useState<{ input: GroupMemberAction; preview: MobileGroupMemberPreview } | null>(null);
  const candidates = useAdminQuery('group-candidates', (client, signal) => fetchGroupCandidates(client, group.id, search, signal), { params: { id: group.id, search }, enabled: group.active && search.trim().length >= 2 });
  const add = useAdminMutation((client, studentId: string, context) => updateGroup(client, group.id, { action: 'ADD_STUDENT', studentId }, group.revision!, context.idempotencyKey));
  const preview = useMutation({ mutationFn: (input: GroupMemberAction) => previewGroupMembers(api, group.id, input), onSuccess: (result, input) => setConfirmation({ input, preview: result }), onError: (error) => onNotice(adminErrorText(error)!, true) });
  const execute = useAdminMutation((client, request: NonNullable<typeof confirmation>, context) => executeGroupMembers(client, group.id, request.input, { expectedRevision: request.preview.expectedRevision, ...(request.preview.action === 'TRANSFER' ? { expectedTargetRevision: request.preview.expectedTargetRevision } : {}) }, context.idempotencyKey));
  const members = group.sections.find((section) => section.id === 'members')?.rows ?? [];
  const busy = preview.isPending || execute.isPending || add.isPending;
  const resetPreview = () => { setConfirmation(null); preview.reset(); };
  const buildInput = (): GroupMemberAction | null => !selected.length ? null : action === 'TRANSFER' ? targetGroupId ? { action, studentIds: selected, targetGroupId } : null : action === 'REMOVE' ? { action, studentIds: selected } : title.trim().length >= 2 && body.trim().length >= 2 ? { action, studentIds: selected, title, body } : null;
  const input = buildInput();
  if (!group.revision) return <Banner tone="info" title="Üye yönetimi">Sunucu güncellendikten sonra bu bölüm açılacak.</Banner>;
  const canExecute = confirmation?.preview.action === 'TRANSFER' ? confirmation.preview.preview.canExecute : confirmation?.preview.canExecute;
  return <>
    {group.active ? <Section title="Öğrenci ekle">
      <TextField label="Öğrenci adı veya e-postası" value={search} onChangeText={(value) => { setSearch(value); setCandidate(null); }} editable={!busy} maxLength={120} testID="group-candidate-search" />
      {search.trim().length >= 2 ? <QueryView query={candidates}>{(data) => <>
        {data.students.map((student) => <Row key={student.id} title={student.name} subtitle={[student.email, ...student.activeGroups.map((item) => item.name)].join(' · ')} selected={candidate === student.id} testID={`group-candidate-${student.id}`} onPress={busy ? undefined : () => setCandidate(student.id)} />)}
        {!data.students.length ? <Text tone="muted">Eşleşen öğrenci yok.</Text> : null}
        <Button mutation label="Öğrenciyi ekle" testID="group-add-save" loading={add.isPending} disabled={!candidate || busy || data.seats.available === 0 || !data.seats.isActive}
          onPress={() => { if (candidate) void add.mutateAsync(candidate).then(() => { setSearch(''); setCandidate(null); onNotice('Öğrenci gruba eklendi.'); }).catch((error) => onNotice(adminErrorText(error)!, true)); }} />
      </>}</QueryView> : null}
    </Section> : null}
    <Section title="Üye işlemleri">
      <Text variant="meta" tone="muted">En fazla 20 öğrenci seç. Transfer, çıkarma ve bildirim önce önizlenir.</Text>
      {members.map((member) => <Row key={member.id} title={member.title} selected={selected.includes(member.id)} testID={`group-select-${member.id}`} onPress={busy ? undefined : () => { resetPreview(); setSelected((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : current.length < 20 ? [...current, member.id] : current); }} />)}
      {!members.length ? <Text tone="muted">Grupta aktif öğrenci yok.</Text> : null}
      {!busy ? <FilterChips value={action} label="Üye işlemi" options={[{ value: 'TRANSFER', label: 'Transfer' }, { value: 'REMOVE', label: 'Çıkar' }, { value: 'NOTIFY', label: 'Bildirim' }]} onChange={(value) => { resetPreview(); setAction(value); }} /> : null}
      {action === 'TRANSFER' && !busy ? <SearchPicker label="Hedef grup" options={group.targetGroups.map((target) => ({ id: target.id, name: `${target.name} · ${target.subject} · ${target.filled}/${target.capacity}` }))} value={targetGroupId} onChange={(value) => { resetPreview(); setTargetGroupId(value); }} testID="group-target" /> : null}
      {action === 'NOTIFY' ? <>
        <TextField label="Bildirim başlığı" value={title} onChangeText={(value) => { resetPreview(); setTitle(value); }} editable={!busy} maxLength={120} testID="group-notify-title" />
        <TextField label="Bildirim metni" value={body} onChangeText={(value) => { resetPreview(); setBody(value); }} editable={!busy} maxLength={500} multiline testID="group-notify-body" />
      </> : null}
      <Button mutation label="İşlemi önizle" testID="group-members-preview" disabled={!input || busy} loading={preview.isPending} onPress={() => { if (input) { setConfirmation(null); preview.mutate(input); } }} />
      {confirmation ? <>
        <MemberPreview preview={confirmation.preview} />
        <Button mutation label="Önizlenen işlemi onayla" testID="group-members-execute" disabled={!canExecute || busy} loading={execute.isPending} onPress={() => Alert.alert('İşlem uygulansın mı?', `${confirmation.input.studentIds.length} öğrenci için önizlediğin ${confirmation.input.action === 'TRANSFER' ? 'transfer' : confirmation.input.action === 'REMOVE' ? 'çıkarma' : 'bildirim'} işlemi uygulanacak.`, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Uygula', style: 'destructive', onPress: () => void execute.mutateAsync(confirmation).then(() => { setConfirmation(null); setSelected([]); onNotice('Üye işlemi tamamlandı.'); }).catch((error) => { setConfirmation(null); onNotice(adminErrorText(error)!, true); }) }])} />
      </> : null}
    </Section>
  </>;
}

function MemberPreview({ preview }: { preview: MobileGroupMemberPreview }) {
  if (preview.action === 'NOTIFY') return <Banner tone={preview.canExecute ? 'info' : 'warning'} title={`${preview.matchedStudents} öğrenci · ${preview.recipientCount} öğrenci/veli alıcısı`}>{preview.title}{'\n'}{preview.body}{'\n'}Bildirim tercihleri gönderimde uygulanır.</Banner>;
  const items = preview.action === 'TRANSFER' ? preview.preview.items : preview.items;
  const allowed = preview.action === 'TRANSFER' ? preview.preview.canExecute : preview.canExecute;
  return <>
    <Banner tone={allowed ? 'info' : 'warning'} title={allowed ? 'İşlem uygulanabilir' : 'İşlem engellendi'}>{preview.action === 'TRANSFER' ? `Hedef: ${preview.preview.targetGroupName} · ${preview.preview.capacity.available} boş kontenjan` : `${preview.matched} eşleşen öğrenci`}</Banner>
    {items.map((item) => {
      const transfer = preview.action === 'TRANSFER' ? preview.preview.items.find((row) => row.studentId === item.studentId) : null;
      return <Row key={item.studentId} title={item.studentName} subtitle={item.blockers.map((blocker) => blocker.message).join(' · ') || 'Engel yok'} meta={transfer ? [...transfer.warnings, `${transfer.affectedSourceLessons.length} kaynak / ${transfer.affectedTargetLessons.length} hedef ders`].join(' · ') : null} />;
    })}
  </>;
}
