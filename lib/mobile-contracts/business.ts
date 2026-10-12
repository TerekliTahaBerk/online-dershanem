import { check, v, type Infer } from "./validate";

/**
 * İŞLETME (P2.7) — `GET /api/panel/business/sections/:slug` (+ web ile aynı
 * sorgu parametreleri: from, to, product, status, temperature, ai, unread, q,
 * cursor, conversation, messageCursor, focus, stage, owner, source, interest,
 * campaign, lead). Web `isletme/[section]` ile AYNI yükleyici
 * (`loadBusinessSectionData`) ve iş birimi kapsamı; bölümler sunucuda karta
 * çevrilir (etiket, sayı, ton), istemci hesap yapmaz.
 *
 * Yetki: `BusinessRoleAssignment` (ADR-0011); yetkisizde 404.
 */

const tone = v.oneOf(["neutral", "info", "success", "warning", "critical"] as const);

const target = v.object({ kind: v.oneOf(["conversation", "lead", "order"] as const), id: v.nonEmpty() });
const row = v.object({
  id: v.nullable(v.string()),
  title: v.string(),
  subtitle: v.nullable(v.string()),
  meta: v.nullable(v.string()),
  badge: v.nullable(v.object({ label: v.string(), tone })),
  target: v.nullable(target),
});
const card = v.object({
  id: v.nonEmpty(),
  title: v.string(),
  note: v.nullable(v.string()),
  metrics: v.array(v.object({ label: v.string(), value: v.string(), tone })),
  rows: v.array(row),
  empty: v.nullable(v.string()),
});
export type MobileBusinessCard = Infer<typeof card>;
export type MobileBusinessRow = Infer<typeof row>;

const filter = v.object({
  key: v.nonEmpty(),
  label: v.string(),
  value: v.string(),
  options: v.array(v.object({ value: v.string(), label: v.string() })),
});

const message = v.object({ id: v.nonEmpty(), body: v.string(), outbound: v.boolean(), meta: v.string() });

const conversation = v.object({
  id: v.nonEmpty(),
  name: v.string(),
  summary: v.string(),
  tags: v.array(v.string()),
  status: v.string(),
  aiMode: v.string(),
  temperature: v.string(),
  assignedUserId: v.nullable(v.string()),
  olderCursor: v.nullable(v.string()),
  messages: v.array(message),
  aiSuggestion: v.nullable(v.string()),
  leadId: v.nullable(v.string()),
  cards: v.array(card),
});

const lead = v.object({
  id: v.nonEmpty(),
  name: v.string(),
  stage: v.string(),
  stageLabel: v.string(),
  subtitle: v.string(),
  lifecycle: v.object({ label: v.string(), nextAction: v.string() }),
  followUp: v.object({ label: v.string(), tone }),
  cards: v.array(card),
});

const section = v.object({
  contractVersion: v.literal(1),
  slug: v.nonEmpty(),
  label: v.string(),
  units: v.string(),
  range: v.nullable(v.object({ from: v.string(), to: v.string(), notice: v.nullable(v.string()) })),
  product: v.nullable(v.object({ value: v.string(), options: v.array(v.object({ value: v.string(), label: v.string() })) })),
  filters: v.array(filter),
  notice: v.nullable(v.string()),
  cards: v.array(card),
  nextCursor: v.nullable(v.string()),
  conversation: v.nullable(conversation),
  lead: v.nullable(lead),
});
export type MobileBusinessSection = Infer<typeof section>;
export type MobileBusinessConversation = Infer<typeof conversation>;
export type MobileBusinessLead = Infer<typeof lead>;
export const parseBusinessSection = (input: unknown) => check(section, input);
