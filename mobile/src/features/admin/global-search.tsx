import type { MobileGlobalSearchKind, MobileGlobalSearchResult } from '@contracts/admin';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { EmptyState, Row, Screen, Section, Text, TextField } from '@/design/primitives';
import { searchGlobal } from '@/lib/api/admin';
import { useReadyBootstrap } from '@/lib/auth/session-provider';
import { expoHrefFor, mapAdminWebPath } from '@/navigation/route-map';

import { QueryView, useAdminQuery } from './shared';

const KIND_TITLE: Record<MobileGlobalSearchKind, string> = {
  COMMAND: 'Komutlar',
  STUDENT: 'Öğrenciler',
  PARENT: 'Veliler',
  TEACHER: 'Öğretmenler',
  USER: 'Kullanıcılar',
  GROUP: 'Gruplar',
  LESSON: 'Dersler',
  ORDER: 'Siparişler',
  LEAD: 'Adaylar',
  EXAM: 'Denemeler',
};
const KIND_ORDER = Object.keys(KIND_TITLE) as MobileGlobalSearchKind[];

/**
 * YÖNETİM · GLOBAL ARAMA (Faz 1) — web komut paletiyle AYNI uç
 * (`/api/panel/admin-search`); izin filtresi sunucuda. 2 karakterden kısa
 * sorguda yalnız komutlar döner. Sonuç, yetkili yönetim menüsündeki hedefe
 * açılır; karşılığı henüz native olmayan kayıt açıkça belirtilir.
 */
export default function GlobalSearchScreen() {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const search = useAdminQuery('search', (api, signal) => searchGlobal(api, query, signal), { params: { q: query } });
  return (
    <Screen testID="admin-search">
      <TextField label="Ara" value={text} onChangeText={setText} autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="search" placeholder="Ad, e-posta, telefon, grup, sipariş…" testID="admin-search-input" />
      <QueryView query={search}>
        {(data) => {
          const items = [...data.commands, ...data.results];
          if (!items.length) return query.length < 2 ? <Text tone="secondary">Aramak için en az 2 karakter yaz.</Text> : <EmptyState title="Sonuç bulunamadı" body="Farklı bir yazım veya telefon numarası dene." />;
          return <Results items={items} />;
        }}
      </QueryView>
    </Screen>
  );
}

function Results({ items }: { items: MobileGlobalSearchResult[] }) {
  const router = useRouter();
  const bootstrap = useReadyBootstrap();
  const navigation = bootstrap.workspace?.navigation ?? null;
  return (
    <>
      {KIND_ORDER.map((kind) => {
        const group = items.filter((item) => item.kind === kind);
        if (!group.length) return null;
        return (
          <Section key={kind} title={KIND_TITLE[kind]}>
            {group.map((item) => {
              const href = expoHrefFor(mapAdminWebPath(item.href, navigation, bootstrap.business));
              return (
                <Row
                  key={`${item.kind}-${item.id}`}
                  testID={`admin-search-${item.kind}-${item.id}`}
                  title={item.label}
                  subtitle={item.detail || null}
                  meta={href ? null : 'Mobilde yakında'}
                  onPress={href ? () => router.push(href as Href) : undefined}
                />
              );
            })}
          </Section>
        );
      })}
    </>
  );
}
