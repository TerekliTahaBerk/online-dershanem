import type { MobileBusinessCard, MobileBusinessRow, MobileBusinessSection } from '@contracts/business';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { color, radius, space, tone } from '@/design/tokens';
import { FilterChips, MetricGrid, MetricTile } from '@/features/admin/ui';
import { QueryView, usePullToRefresh } from '@/features/shared/workspace-data';
import { fetchBusinessSection, type BusinessQuery } from '@/lib/api/business';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { queryKeys } from '@/lib/query/keys';

import { ConversationActions, CreateLeadSheet, LeadActions } from './crm';
import { AttributionForm, SectionOps } from './ops';

/**
 * İŞLETME (P2.7a — okuma). Web `isletme/[section]` ile AYNI yükleyici ve
 * süzgeçler; görünürlük bootstrap'ın `business` listesinden, yetki her
 * istekte sunucuda (`BusinessRoleAssignment`). Platform rolünden bağımsızdır:
 * işletme ataması olan her kullanıcı görür. Yazma işlemleri sonraki P2.7
 * dilimlerinde (CRM → pazarlama / finans → AI, otomasyon, ayarlar) gelir.
 */

function useBusinessSection(slug: string, query: BusinessQuery) {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  return useQuery({
    queryKey: queryKeys.businessSection(bootstrap.user.id, slug, query),
    queryFn: ({ signal }) => fetchBusinessSection(api, slug, query, signal),
    enabled: Boolean(bootstrap.business?.sections.some((section) => section.slug === slug)),
  });
}

/** Bölüm kapısı: yalnız bootstrap'ta görünen bölüm açılır (sunucu ayrıca doğrular). */
export function BusinessGate({ slug, children }: { slug?: string; children: ReactNode }) {
  const bootstrap = useReadyBootstrap();
  const sections = bootstrap.business?.sections ?? [];
  if (!sections.length || (slug && !sections.some((section) => section.slug === slug))) return <EmptyState title="Bu bölüm hesabında yok" body="İşletme bölümleri yalnız iş birimi rolü olan hesaplarda açılır." />;
  return <>{children}</>;
}

export function BusinessHomeScreen() {
  const router = useRouter();
  const sections = useReadyBootstrap().business?.sections ?? [];
  const groups = [...new Map(sections.map((section) => [section.group, section.groupLabel])).entries()];
  return (
    <Screen testID="business-home">
      <PageHeader title="İşletme" description="Reklam, CRM ve finans · Europe/Istanbul" />
      {groups.map(([group, label], index) => (
        <Section key={group} title={label} first={index === 0}>
          {sections
            .filter((section) => section.group === group)
            .map((section) => (
              <Row key={section.slug} title={section.label} onPress={() => router.push(`/business/${section.slug}` as Href)} testID={`business-section-${section.slug}`} />
            ))}
        </Section>
      ))}
    </Screen>
  );
}

const SEARCHABLE = new Set(['mesaj-kutusu', 'adaylar']);

export function BusinessSectionScreen({ slug }: { slug: string }) {
  const [query, setQuery] = useState<BusinessQuery>({});
  const [text, setText] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery((current) => (current.q === (text.trim() || undefined) ? current : { ...current, q: text.trim() || undefined, cursor: undefined })), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const section = useBusinessSection(slug, query);
  const refresh = usePullToRefresh(() => section.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID={`business-${slug}`}>
      {SEARCHABLE.has(slug) ? <TextField label="Ara" value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} placeholder={slug === 'adaylar' ? 'Ad, telefon veya e-posta' : 'Kullanıcı ara'} testID="business-search" /> : null}
      <QueryView query={section}>{(data) => <SectionBody data={data} onQuery={(patch) => setQuery((current) => ({ ...current, ...patch }))} />}</QueryView>
    </Screen>
  );
}

function SectionBody({ data, onQuery }: { data: MobileBusinessSection; onQuery: (patch: BusinessQuery) => void }) {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  return (
    <>
      <PageHeader title={data.label} description={`${data.units} · Europe/Istanbul`} action={data.slug === 'adaylar' && data.can.leadWrite ? <Button label="Aday ekle" variant="secondary" onPress={() => setCreating(true)} testID="crm-new-open" /> : undefined} />
      {created ? <Banner tone="info">Aday eklendi.</Banner> : null}
      {creating ? <CreateLeadSheet data={data} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setCreated(true); }} /> : null}
      {data.range ? <RangeFilter range={data.range} onApply={(from, to) => onQuery({ from, to })} /> : null}
      {data.product ? <FilterChips label="Ürün" value={data.product.value} onChange={(product) => onQuery({ product })} options={data.product.options} /> : null}
      {data.filters.map((filter) => (
        <FilterChips key={filter.key} label={filter.label} value={filter.value} onChange={(value) => onQuery({ [filter.key]: value, cursor: undefined })} options={filter.options} />
      ))}
      {data.notice ? <Banner tone="info">{data.notice}</Banner> : null}
      <SectionOps data={data}>{(onAction) => <Cards cards={data.cards} onAction={onAction} />}</SectionOps>
      {data.nextCursor ? <Button label="Sonraki sayfa" variant="quiet" onPress={() => onQuery({ cursor: data.nextCursor ?? undefined })} testID="business-next" /> : null}
    </>
  );
}

function RangeFilter({ range, onApply }: { range: NonNullable<MobileBusinessSection['range']>; onApply: (from: string, to: string) => void }) {
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  return (
    <View style={styles.range}>
      {range.notice ? <Banner tone="warning">{range.notice}</Banner> : null}
      <View style={styles.grid}>
        <View style={styles.cell}><TextField label="Başlangıç (YYYY-AA-GG)" value={from} onChangeText={setFrom} maxLength={10} autoCorrect={false} testID="business-from" /></View>
        <View style={styles.cell}><TextField label="Bitiş (YYYY-AA-GG)" value={to} onChangeText={setTo} maxLength={10} autoCorrect={false} testID="business-to" /></View>
      </View>
      <Button label="Aralığı uygula" variant="secondary" onPress={() => onApply(from.trim(), to.trim())} testID="business-range-apply" />
    </View>
  );
}

function hrefFor(row: MobileBusinessRow, admin: { orders: boolean }): string | null {
  if (!row.target) return null;
  if (row.target.kind === 'conversation') return `/business/conversation/${encodeURIComponent(row.target.id)}`;
  if (row.target.kind === 'lead') return `/business/lead/${encodeURIComponent(row.target.id)}`;
  return admin.orders ? `/admin/order/${encodeURIComponent(row.target.id)}` : null;
}

function Cards({ cards, onAction }: { cards: MobileBusinessCard[]; onAction?: (row: MobileBusinessRow, kind: 'reverse' | 'match' | 'correct') => void }) {
  const router = useRouter();
  const bootstrap = useReadyBootstrap();
  const orders = bootstrap.user.role === 'ADMIN' && Boolean(bootstrap.workspace?.navigation.sections.some((section) => section.items.some((item) => item.id === 'orders')));
  return (
    <>
      {cards.map((card, index) => (
        <Section key={card.id} title={card.title} first={index === 0}>
          <View style={styles.card} testID={`business-card-${card.id}`}>
            {card.note ? <Text tone="muted" variant="meta">{card.note}</Text> : null}
            {card.metrics.length ? (
              <MetricGrid>
                {card.metrics.map((item) => (
                  <MetricTile key={item.label} label={item.label} value={item.value} />
                ))}
              </MetricGrid>
            ) : null}
            {card.rows.map((row, rowIndex) => {
              const href = hrefFor(row, { orders });
              return (
                <Row
                  key={row.id ?? `${row.title}-${rowIndex}`}
                  title={row.title}
                  subtitle={row.subtitle}
                  meta={row.meta}
                  trailing={
                    row.actions.length && onAction ? (
                      <View style={styles.rowActions}>
                        {row.badge ? <StatusBadge label={row.badge.label} tone={row.badge.tone} /> : null}
                        {row.actions.map((action) => (
                          <Button key={action.kind} label={action.label} variant={action.kind === 'reverse' ? 'destructive' : 'quiet'} onPress={() => onAction(row, action.kind)} testID={`business-action-${action.kind}-${row.id}`} />
                        ))}
                      </View>
                    ) : row.badge ? (
                      <StatusBadge label={row.badge.label} tone={row.badge.tone} />
                    ) : undefined
                  }
                  onPress={href ? () => router.push(href as Href) : undefined}
                  testID={row.id ? `business-row-${row.id}` : undefined}
                />
              );
            })}
            {card.empty ? <Text tone="muted">{card.empty}</Text> : null}
          </View>
        </Section>
      ))}
    </>
  );
}

/** Konuşma detayı: web `?conversation=` ile AYNI veri (son 100 mesaj, daha eskiler sayfalı). */
export function BusinessConversationScreen({ id }: { id: string }) {
  const router = useRouter();
  const [messageCursor, setMessageCursor] = useState<string | undefined>(undefined);
  const query = useBusinessSection('mesaj-kutusu', { conversation: id, messageCursor });
  const refresh = usePullToRefresh(() => query.refetch());
  const leadsVisible = useReadyBootstrap().business?.sections.some((section) => section.slug === 'adaylar') ?? false;
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="business-conversation">
      <QueryView query={query}>
        {(data) => {
          const c = data.conversation;
          if (!c) return <EmptyState title="Konuşma bulunamadı" body="Konuşma silinmiş veya erişim dışında olabilir." />;
          return (
            <>
              <PageHeader title={c.name} description={c.summary} context={<View style={styles.badges}><StatusBadge label={c.status} tone="info" /><StatusBadge label={`AI ${c.aiMode}`} tone="neutral" />{c.tags.map((tag) => <StatusBadge key={tag} label={`#${tag}`} tone="neutral" />)}</View>} />
              {c.olderCursor ? <Button label="Daha eski 100 mesajı yükle" variant="quiet" onPress={() => setMessageCursor(c.olderCursor ?? undefined)} testID="business-older" /> : null}
              {messageCursor ? <Button label="En yeni mesajlara dön" variant="quiet" onPress={() => setMessageCursor(undefined)} /> : null}
              <Section title="Mesajlar" first>
                {c.messages.length ? c.messages.map((m) => (
                  <View key={m.id} style={[styles.bubble, m.outbound ? styles.outbound : styles.inbound]} testID={`business-message-${m.id}`}>
                    <Text>{m.body}</Text>
                    <Text tone="muted" variant="meta">{m.meta}</Text>
                  </View>
                )) : <Text tone="muted">Mesaj yok.</Text>}
              </Section>
              {c.aiSuggestion ? <Banner tone="info" title="AI cevap önerisi">{c.aiSuggestion}</Banner> : null}
              {c.leadId && leadsVisible ? <Button label="Aday detayını aç" variant="secondary" onPress={() => router.push(`/business/lead/${encodeURIComponent(c.leadId!)}` as Href)} testID="business-open-lead" /> : null}
              <ConversationActions data={data} conversation={c} />
              <Cards cards={c.cards} />
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}

/** Aday detayı: web `adaylar?lead=` ile AYNI yükleyiciler (detay, yaşam döngüsü, kopyalar). */
export function BusinessLeadScreen({ id }: { id: string }) {
  const query = useBusinessSection('adaylar', { lead: id, focus: 'all' });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="business-lead">
      <QueryView query={query}>
        {(data) => {
          const lead = data.lead;
          if (!lead) return <EmptyState title="Aday bulunamadı" body={data.notice ?? 'Aday erişim dışında olabilir.'} />;
          return (
            <>
              <PageHeader title={lead.name} description={lead.subtitle} context={<StatusBadge label={lead.stageLabel} tone="info" />} />
              <Banner tone={lead.followUp.tone === 'critical' ? 'critical' : lead.followUp.tone === 'warning' ? 'warning' : 'info'}>{lead.followUp.label}</Banner>
              <Text tone="secondary">{lead.lifecycle.label} — {lead.lifecycle.nextAction}</Text>
              <Cards cards={lead.cards} />
              {data.can.leadWrite ? <LeadActions data={data} lead={lead} /> : null}
              <AttributionForm data={data} lead={lead} />
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  range: { gap: space[2] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  cell: { flexGrow: 1, flexBasis: '45%' },
  card: { gap: space[2] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  rowActions: { alignItems: 'flex-end', gap: space[1] },
  bubble: { maxWidth: '85%', padding: space[3], borderRadius: radius.card, gap: space[1] },
  inbound: { alignSelf: 'flex-start', backgroundColor: color.surfaceSubtle, borderWidth: 1, borderColor: color.border },
  outbound: { alignSelf: 'flex-end', backgroundColor: tone.success.soft },
});
