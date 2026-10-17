import { parsePreviewCandidates, type MobilePreviewRole } from '@contracts/admin-overlay';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, TextField } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { FilterChips } from './ui';
import { QueryView, useAdminQuery } from './shared';

const ROLES: { value: MobilePreviewRole; label: string }[] = [
  { value: 'STUDENT', label: 'Öğrenci' }, { value: 'PARENT', label: 'Veli' }, { value: 'TEACHER', label: 'Öğretmen' },
];

export default function AdminPreviewScreen() {
  const params = useLocalSearchParams<{ role?: string; q?: string }>();
  const initialRole = ROLES.find((option) => option.value === params.role)?.value ?? 'STUDENT';
  const [role, setRole] = useState<MobilePreviewRole>(initialRole);
  const [text, setText] = useState(params.q ?? '');
  const [query, setQuery] = useState(params.q ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { startAdminPreview, startTeacherMode } = useSession();
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const candidates = useAdminQuery('preview-candidates', async (api, signal) => {
    const parsed = parsePreviewCandidates(await api.request(`/api/panel/admin-preview/candidates?role=${role}&q=${encodeURIComponent(query)}`, { signal }));
    if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    return parsed.value;
  }, { params: { role, q: query } });

  async function start(run: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError(null);
    try { await run(); router.replace('/'); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Panel modunu şu an açamadık. Lütfen tekrar dener misiniz?'); }
    finally { setPending(false); }
  }

  return <Screen testID="admin-preview">
    <PageHeader title="Panel önizlemesi" description="Seçtiğin kişinin panelini salt okunur olarak görüntüle." />
    {error ? <Banner tone="critical">{error}</Banner> : null}
    <FilterChips label="Önizleme rolü" value={role} options={ROLES} onChange={setRole} />
    <TextField label="Kişi ara" value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} testID="preview-search" />
    <QueryView query={candidates}>{(data) => data.candidates.length ? <Section title="Kişiler">
      {data.candidates.map((person) => <Row key={person.userId} title={person.fullName ?? person.email} subtitle={[person.email, person.detail, person.status !== 'ACTIVE' ? person.status : null].filter(Boolean).join(' · ')} disabled={pending} onPress={() => void start(() => startAdminPreview(role, person.userId))} testID={`preview-person-${person.userId}`} />)}
    </Section> : <EmptyState title="Kişi bulunamadı" body="Aramayı veya rolü değiştir." />}</QueryView>
    <Section title="Kendi öğretmen panelin">
      <Button label="Öğretmen moduna geç" variant="secondary" loading={pending} onPress={() => void start(startTeacherMode)} testID="start-teacher-mode" />
    </Section>
  </Screen>;
}
