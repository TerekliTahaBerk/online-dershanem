import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';

import { Banner, Button, PageHeader, Screen, TextField } from '@/design/primitives';
import { createGroup, fetchEducation, type GroupCreateInput } from '@/lib/api/admin-education';

import { adminErrorText, QueryView, useAdminMutation, useAdminQuery } from './shared';
import { SearchPicker } from './ui';

export default function GroupCreateScreen() {
  const router = useRouter();
  const query = useAdminQuery('education', fetchEducation);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const save = useAdminMutation((api, input: GroupCreateInput, context) => createGroup(api, input, context.idempotencyKey));
  return <Screen testID="admin-group-create">
    <PageHeader title="Grup oluştur" description="Öğretmeni seç; öğrencileri grup oluşturulduktan sonra ekleyebilirsin." />
    <QueryView query={query}>{(data) => <>
      <TextField label="Grup adı" value={name} onChangeText={setName} maxLength={80} testID="group-name" />
      <TextField label="Ders / branş" value={subject} onChangeText={setSubject} maxLength={80} testID="group-subject" />
      <TextField label="Seviye" value={level} onChangeText={setLevel} maxLength={40} testID="group-level" />
      <SearchPicker label="Öğretmen" options={data.teachers} value={teacherId} onChange={setTeacherId} testID="group-teacher" />
      {save.error ? <Banner tone="critical" title="Grup oluşturulamadı">{adminErrorText(save.error)}</Banner> : null}
      <Button mutation label="Grubu oluştur" testID="group-create-save" loading={save.isPending} disabled={!teacherId || name.trim().length < 2 || subject.trim().length < 2}
        onPress={() => { if (teacherId) void save.mutateAsync({ name, subject, level, teacherId, studentIds: [] }).then((result) => router.replace(`/admin/group/${encodeURIComponent(result.id)}` as Href)).catch(() => undefined); }} />
    </>}</QueryView>
  </Screen>;
}
