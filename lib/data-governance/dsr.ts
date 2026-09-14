import { createHash, randomBytes } from "node:crypto";
import { Prisma, type DataSubjectTombstone, type PrismaClient } from "@prisma/client";
import { normalizeEmail } from "@/lib/business/normalization";
import { USER_DELETE_COUNT_SELECT, collectDeleteBlockers } from "@/lib/panel/user-deletion";
import type { ResolvedApproval } from "./approval";
import { classifyFieldName, isCredentialField } from "./pii-heuristics.mjs";

/**
 * Veri sahibi talebi (DSR) çekirdeği.
 *
 * SÜREÇ DIŞINDA KALAN İNSAN ADIMLARI (bu modül bunları yapmaz):
 *   - Talep edenin kimliğini ve çocuk adına işlem yetkisini ikinci kanaldan doğrulamak.
 *   - Hukuki saklama yükümlülüğü ve üçüncü kişi verisini değerlendirmek.
 *   - Dışa aktarımdaki serbest metinleri teslimden önce incelemek.
 * Bu adımların kanıtı `ticketRef`, kararın sahibi `approverUserId`'dir.
 *
 * Silme/anonimleştirme iki fazlıdır: `requestErasure` hesabı askıya alıp
 * tombstone açar (geri alınabilir); `applyErasure` bekleme süresi dolunca
 * geri alınamaz işlemi uygular.
 */

export const DSR_GRACE_PERIOD_DAYS = 7; // teknik geri alma penceresi; hukuki süre değildir
const DAY_MS = 86_400_000;
const EXPORT_ROW_LIMIT = 10_000;
const MAX_DEPTH = 3;
const SUBJECT_MODELS = new Set(["User", "StudentProfile"]);
const ANONYMIZED_EMAIL_DOMAIN = "anonymized.invalid";
const REDACTED_TEXT = "[anonimleştirildi]";

/** Hesapla birlikte kalıcı silinen, veri sahibine ait kimlik doğrulama/iletişim kayıtları. */
export const ERASE_ON_ANONYMIZE = ["Session", "PasswordResetToken", "PasskeyCredential", "MfaRecoveryCode", "MfaChallenge", "AdminMfa", "Notification"] as const;

type Row = Record<string, unknown>;
type Delegate = {
  findMany(args: Row): Promise<Row[]>;
  updateMany(args: Row): Promise<{ count: number }>;
  deleteMany(args: Row): Promise<{ count: number }>;
};
type Tx = Prisma.TransactionClient;

const delegate = (db: PrismaClient | Tx, model: string): Delegate => {
  const found = (db as unknown as Record<string, Delegate | undefined>)[model.charAt(0).toLowerCase() + model.slice(1)];
  if (!found) throw new Error(`Prisma modeli bulunamadı: ${model}`);
  return found;
};

const models = () => Prisma.dmmf.datamodel.models;

type SubjectRelation = { model: string; table: string; fkField: string; parentModel: string; parentKey: string; cascade: boolean };

/** `parentModel`'e FK taşıyan tüm ilişkiler (DMMF'ten; şema değişince kendiliğinden güncellenir). */
export function relationsPointingTo(parentModel: string): SubjectRelation[] {
  const relations: SubjectRelation[] = [];
  for (const model of models()) {
    for (const field of model.fields) {
      if (field.kind !== "object" || field.type !== parentModel || !field.relationFromFields?.length) continue;
      if (field.relationFromFields.length !== 1) continue;
      relations.push({
        model: model.name,
        table: model.dbName ?? model.name,
        fkField: field.relationFromFields[0],
        parentModel,
        parentKey: field.relationToFields?.[0] ?? "id",
        cascade: field.relationOnDelete === "Cascade",
      });
    }
  }
  return relations;
}

function subjectFkFields(modelName: string) {
  const model = models().find((item) => item.name === modelName);
  return (model?.fields ?? []).filter((field) => field.kind === "object" && SUBJECT_MODELS.has(field.type) && field.relationFromFields?.length === 1)
    .map((field) => field.relationFromFields![0]);
}

function rowKey(row: Row): string {
  return typeof row.id === "string" ? row.id : JSON.stringify(row);
}

function stripCredentials(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !isCredentialField(key)));
}

export type ExportTable = {
  model: string;
  table: string;
  /** owner: veri sahibine ait kayıt; actor: kişinin işlem yaptığı kayıt; reference: eşleşmeyle bulunan kayıt. */
  relation: "subject" | "owner" | "actor" | "reference";
  depth: number;
  via: string;
  rowCount: number;
  truncated: boolean;
  piiFields: Array<{ field: string; category: string }>;
  /** Başka bir kullanıcı/öğrenciye referans veren satır sayısı — teslimden önce insan incelemesi şart. */
  thirdPartyReviewRows: number;
  rows: Row[];
};

export type SubjectExport = {
  meta: { subjectUserId: string; generatedAt: string; ticketRef: string | null; tableCount: number; rowCount: number; humanReviewRequired: true; notes: string[] };
  tables: ExportTable[];
};

function piiFieldsOf(modelName: string) {
  const model = models().find((item) => item.name === modelName);
  return (model?.fields ?? []).filter((field) => field.kind === "scalar" && !isCredentialField(field.name))
    .flatMap((field) => {
      const hit = classifyFieldName(field.name);
      return hit ? [{ field: field.name, category: hit.category }] : [];
    });
}

/**
 * Veri sahibiyle ilişkili tüm tabloları DMMF ilişki grafiğinden tarar.
 * `Cascade` ilişki sahipliktir ve alt kayıtlara inilir; `Restrict/SetNull`
 * kişinin aktör olduğu kayıttır, dışa aktarılır ama altına inilmez.
 */
export async function collectSubjectExport(db: PrismaClient, subjectUserId: string, options: { ticketRef?: string | null; now?: Date } = {}): Promise<SubjectExport> {
  const user = await db.user.findUnique({ where: { id: subjectUserId } });
  if (!user) throw new Error("Veri sahibi bulunamadı");
  const studentProfiles = await db.studentProfile.findMany({ where: { userId: subjectUserId } });
  const subjectIds = new Set<string>([subjectUserId, ...studentProfiles.map((profile) => profile.id)]);

  const tables = new Map<string, ExportTable>();
  const seen = new Map<string, Set<string>>();
  const add = (base: Omit<ExportTable, "rowCount" | "truncated" | "piiFields" | "thirdPartyReviewRows" | "rows">, rows: Row[], truncated: boolean) => {
    const key = `${base.model}:${base.relation}`;
    const table = tables.get(key) ?? { ...base, rowCount: 0, truncated: false, piiFields: piiFieldsOf(base.model), thirdPartyReviewRows: 0, rows: [] };
    const modelSeen = seen.get(key) ?? new Set<string>();
    const fkFields = subjectFkFields(base.model);
    const fresh: Row[] = [];
    for (const row of rows) {
      const id = rowKey(row);
      if (modelSeen.has(id)) continue;
      modelSeen.add(id);
      if (fkFields.some((field) => typeof row[field] === "string" && !subjectIds.has(row[field] as string))) table.thirdPartyReviewRows += 1;
      table.rows.push(stripCredentials(row));
      fresh.push(row);
    }
    table.rowCount = table.rows.length;
    table.truncated ||= truncated;
    tables.set(key, table);
    seen.set(key, modelSeen);
    return fresh;
  };

  add({ model: "User", table: "users", relation: "subject", depth: 0, via: "id" }, [user as unknown as Row], false);
  add({ model: "StudentProfile", table: "student_profiles", relation: "subject", depth: 0, via: "userId" }, studentProfiles as unknown as Row[], false);

  let frontier: Array<{ model: string; ids: string[]; depth: number }> = [
    { model: "User", ids: [subjectUserId], depth: 0 },
    { model: "StudentProfile", ids: studentProfiles.map((profile) => profile.id), depth: 0 },
  ];
  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const parent of frontier) {
      if (parent.ids.length === 0 || parent.depth >= MAX_DEPTH) continue;
      for (const relation of relationsPointingTo(parent.model)) {
        if (relation.model === "StudentProfile" && parent.model === "User") continue;
        if (relation.model === "User") continue;
        // Aktör ilişkileri yalnız veri sahibinin kendisinden okunur; derinde başkasının kaydıdır.
        if (!relation.cascade && parent.depth > 0) continue;
        const rows = await delegate(db, relation.model).findMany({ where: { [relation.fkField]: { in: parent.ids } }, take: EXPORT_ROW_LIMIT + 1 });
        const truncated = rows.length > EXPORT_ROW_LIMIT;
        const fresh = add({
          model: relation.model,
          table: relation.table,
          relation: relation.cascade ? "owner" : "actor",
          depth: parent.depth + 1,
          via: `${relation.model}.${relation.fkField} → ${relation.parentModel}`,
        }, rows.slice(0, EXPORT_ROW_LIMIT), truncated);
        const freshIds = fresh.map((row) => row.id).filter((id): id is string => typeof id === "string");
        if (relation.cascade && freshIds.length > 0) next.push({ model: relation.model, ids: freshIds, depth: parent.depth + 1 });
      }
    }
    frontier = next;
  }

  // FK'siz ama kişiye bağlı kayıtlar.
  const auditRows = await db.auditLog.findMany({
    where: { OR: [{ actorUserId: subjectUserId }, { entityId: { in: [...subjectIds] } }] },
    take: EXPORT_ROW_LIMIT + 1,
    orderBy: { createdAt: "asc" },
  });
  add({ model: "AuditLog", table: "AuditLog", relation: "reference", depth: 1, via: "actorUserId | entityId" }, auditRows.slice(0, EXPORT_ROW_LIMIT) as unknown as Row[], auditRows.length > EXPORT_ROW_LIMIT);

  const leadWhere = businessLeadWhere(subjectUserId, user.email);
  const leads = await db.businessLead.findMany({ where: leadWhere, take: EXPORT_ROW_LIMIT });
  add({ model: "BusinessLead", table: "business_leads", relation: "reference", depth: 1, via: "relatedOdUserId | normalizedEmail" }, leads as unknown as Row[], false);
  const conversationIds = leads.map((lead) => lead.conversationId).filter((id): id is string => Boolean(id));
  if (conversationIds.length > 0) {
    add({ model: "BusinessConversation", table: "business_conversations", relation: "reference", depth: 2, via: "BusinessLead.conversationId" },
      await db.businessConversation.findMany({ where: { id: { in: conversationIds } } }) as unknown as Row[], false);
    add({ model: "BusinessMessage", table: "business_messages", relation: "reference", depth: 2, via: "BusinessMessage.conversationId" },
      await db.businessMessage.findMany({ where: { conversationId: { in: conversationIds } }, take: EXPORT_ROW_LIMIT }) as unknown as Row[], false);
  }
  add({ model: "DataSubjectTombstone", table: "data_subject_tombstones", relation: "reference", depth: 1, via: "subjectUserId" },
    await db.dataSubjectTombstone.findMany({ where: { subjectUserId } }) as unknown as Row[], false);

  const list = [...tables.values()].filter((table) => table.rowCount > 0);
  return {
    meta: {
      subjectUserId,
      generatedAt: (options.now ?? new Date()).toISOString(),
      ticketRef: options.ticketRef ?? null,
      tableCount: list.length,
      rowCount: list.reduce((sum, table) => sum + table.rowCount, 0),
      humanReviewRequired: true,
      notes: [
        "Kimlik doğrulama sırları (hash, token, anahtar) dışa aktarılmaz.",
        "thirdPartyReviewRows > 0 olan tablolarda başka kişilere ait veri olabilir; teslimden önce ayıklayın.",
        "Private Blob dosyaları öğrenciye bağlı değildir (materyal öğretmen/grup kaydıdır); dosya içeriği bu dökümde yoktur.",
      ],
    },
    tables: list,
  };
}

function businessLeadWhere(subjectUserId: string, email: string): Prisma.BusinessLeadWhereInput {
  const normalized = normalizeEmail(email);
  return { OR: [{ relatedOdUserId: subjectUserId }, ...(normalized ? [{ normalizedEmail: normalized }] : [])] };
}

export class DsrError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "DsrError";
  }
}

export async function requestErasure(db: PrismaClient, input: {
  subjectUserId: string;
  action: "ANONYMIZE" | "DELETE";
  approval: ResolvedApproval;
  now?: Date;
  graceDays?: number;
}): Promise<DataSubjectTombstone> {
  const now = input.now ?? new Date();
  const graceDays = input.graceDays ?? DSR_GRACE_PERIOD_DAYS;
  if (input.approval.approverUserId === input.subjectUserId) throw new DsrError("Onaylayan kişi veri sahibiyle aynı olamaz", "self_approval");
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.subjectUserId }, select: { id: true, status: true, archivedAt: true } });
    if (!user) throw new DsrError("Veri sahibi bulunamadı", "subject_not_found");
    const open = await tx.dataSubjectTombstone.findFirst({ where: { subjectUserId: user.id, status: { in: ["PENDING_GRACE", "APPLIED"] } }, select: { id: true } });
    if (open) throw new DsrError(`Bu kişi için açık/uygulanmış talep var: ${open.id}`, "duplicate_request");

    const tombstone = await tx.dataSubjectTombstone.create({
      data: {
        subjectUserId: user.id,
        action: input.action,
        ticketRef: input.approval.ticketRef,
        approvedByUserId: input.approval.approverUserId,
        previousStatus: user.status,
        previousArchivedAt: user.archivedAt,
        graceUntil: new Date(now.getTime() + graceDays * DAY_MS),
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } });
    await tx.auditLog.create({
      data: {
        actorUserId: input.approval.approverUserId,
        actorType: "USER",
        entityType: "DataSubjectTombstone",
        entityId: tombstone.id,
        action: "dsr.erasure_requested",
        summary: "Veri sahibi silme/anonimleştirme talebi açıldı; hesap askıya alındı",
        payload: { subjectUserId: user.id, requestAction: input.action, ticketRef: input.approval.ticketRef, graceUntil: tombstone.graceUntil.toISOString() },
      },
    });
    return tombstone;
  });
}

export async function cancelErasure(db: PrismaClient, input: { requestId: string; approval: ResolvedApproval; now?: Date }) {
  const now = input.now ?? new Date();
  return db.$transaction(async (tx) => {
    const tombstone = await tx.dataSubjectTombstone.findUnique({ where: { id: input.requestId } });
    if (!tombstone) throw new DsrError("Talep bulunamadı", "request_not_found");
    if (tombstone.status !== "PENDING_GRACE") throw new DsrError(`Yalnız bekleme süresindeki talep iptal edilebilir (durum: ${tombstone.status})`, "not_cancellable");
    await tx.user.updateMany({ where: { id: tombstone.subjectUserId }, data: { status: tombstone.previousStatus, archivedAt: tombstone.previousArchivedAt } });
    const updated = await tx.dataSubjectTombstone.update({
      where: { id: tombstone.id },
      data: { status: "CANCELLED", cancelledAt: now, cancelledByUserId: input.approval.approverUserId },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: input.approval.approverUserId,
        actorType: "USER",
        entityType: "DataSubjectTombstone",
        entityId: tombstone.id,
        action: "dsr.erasure_cancelled",
        summary: "Veri sahibi talebi bekleme süresinde iptal edildi; hesap durumu geri yüklendi",
        payload: { subjectUserId: tombstone.subjectUserId, ticketRef: input.approval.ticketRef },
      },
    });
    return updated;
  });
}

export type ErasureOutcome =
  | { outcome: "APPLIED"; action: "ANONYMIZE" | "DELETE"; touched: Record<string, number> }
  | { outcome: "BLOCKED"; blockers: string[] }
  | { outcome: "SUBJECT_ABSENT" };

const pseudonym = (id: string) => createHash("sha256").update(`dsr:${id}`).digest("hex").slice(0, 20);

/** Serbest metin ve kimlik alanları: veri sahibinin sahip olduğu doğrudan kayıtlarda temizlenir. */
function scrubbableFields(modelName: string) {
  const model = models().find((item) => item.name === modelName);
  const fkFields = new Set((model?.fields ?? []).flatMap((field) => field.relationFromFields ?? []));
  return (model?.fields ?? []).filter((field) => field.kind === "scalar" && field.type === "String" && !field.isId && !field.isUnique && !field.isList && !fkFields.has(field.name))
    .flatMap((field) => {
      const hit = classifyFieldName(field.name);
      if (!hit || !["serbest metin", "kimlik", "iletişim"].includes(hit.category) || hit.confidence === "düşük") return [];
      return [{ name: field.name, required: field.isRequired }];
    });
}

async function anonymizeBusinessRecords(tx: Tx, subjectUserId: string, email: string, now: Date, touched: Record<string, number>) {
  const leads = await tx.businessLead.findMany({ where: businessLeadWhere(subjectUserId, email), select: { id: true, conversationId: true } });
  for (const lead of leads) {
    await tx.businessLead.update({ where: { id: lead.id }, data: { firstName: null, lastName: null, instagramScopedId: null, phone: null, normalizedPhone: null, email: null, normalizedEmail: null, studentName: null, parentName: null, city: null, consentMetadata: Prisma.JsonNull, relatedOdUserId: null, anonymizedAt: now } });
    if (lead.conversationId) {
      await tx.businessMessage.updateMany({ where: { conversationId: lead.conversationId }, data: { body: null, mediaMetadata: Prisma.JsonNull, providerMetadata: Prisma.JsonNull } });
      await tx.businessConversation.update({ where: { id: lead.conversationId }, data: { instagramScopedUserId: `anon_${pseudonym(lead.conversationId)}`, username: null, displayName: null, profilePictureUrl: null, tags: [], summary: null, anonymizedAt: now } });
    }
  }
  touched.BusinessLead = leads.length;
}

async function anonymizeSubject(tx: Tx, subjectUserId: string, now: Date): Promise<Record<string, number>> {
  const touched: Record<string, number> = {};
  const user = await tx.user.findUniqueOrThrow({ where: { id: subjectUserId }, select: { email: true } });
  const profiles = await tx.studentProfile.findMany({ where: { userId: subjectUserId }, select: { id: true } });
  const ids: Record<string, string[]> = { User: [subjectUserId], StudentProfile: profiles.map((profile) => profile.id) };

  for (const model of ERASE_ON_ANONYMIZE) {
    touched[model] = (await delegate(tx, model).deleteMany({ where: { userId: subjectUserId } })).count;
  }
  for (const parent of ["User", "StudentProfile"] as const) {
    if (ids[parent].length === 0) continue;
    for (const relation of relationsPointingTo(parent)) {
      if (!relation.cascade || relation.model === "StudentProfile" || (ERASE_ON_ANONYMIZE as readonly string[]).includes(relation.model)) continue;
      const fields = scrubbableFields(relation.model);
      if (fields.length === 0) continue;
      const data = Object.fromEntries(fields.map((field) => [field.name, field.required ? REDACTED_TEXT : null]));
      const result = await delegate(tx, relation.model).updateMany({ where: { [relation.fkField]: { in: ids[parent] } }, data });
      touched[relation.model] = (touched[relation.model] ?? 0) + result.count;
    }
  }
  await anonymizeBusinessRecords(tx, subjectUserId, user.email, now, touched);
  await tx.studentProfile.updateMany({ where: { userId: subjectUserId }, data: { schoolName: null, targetGoal: null, birthDate: null, weeklyGoal: null } });
  await tx.user.update({
    where: { id: subjectUserId },
    data: {
      email: `deleted+${pseudonym(subjectUserId)}@${ANONYMIZED_EMAIL_DOMAIN}`,
      fullName: null,
      phone: null,
      // Ayrıştırılamayan hash: verifyPassword her zaman false döner.
      passwordHash: `disabled$${randomBytes(16).toString("hex")}`,
      inviteTokenHash: null,
      inviteTokenExpiresAt: null,
      mustChangePassword: true,
      status: "ARCHIVED",
      archivedAt: now,
    },
  });
  touched.User = 1;
  return touched;
}

/** Tombstone'un geri alınamaz kısmı. Hem ilk uygulama hem restore sonrası yeniden uygulama kullanır. */
async function performErasure(db: PrismaClient, tombstone: Pick<DataSubjectTombstone, "subjectUserId" | "action">, now: Date): Promise<ErasureOutcome> {
  const exists = await db.user.findUnique({ where: { id: tombstone.subjectUserId }, select: { id: true, email: true } });
  if (!exists) return { outcome: "SUBJECT_ABSENT" };

  if (tombstone.action === "ANONYMIZE") {
    const touched = await db.$transaction((tx) => anonymizeSubject(tx, tombstone.subjectUserId, now));
    return { outcome: "APPLIED", action: "ANONYMIZE", touched };
  }

  const counts = await db.user.findUniqueOrThrow({ where: { id: tombstone.subjectUserId }, select: { _count: { select: USER_DELETE_COUNT_SELECT } } });
  const blockers = collectDeleteBlockers(counts._count).map((blocker) => blocker.code);
  if (blockers.length > 0) return { outcome: "BLOCKED", blockers };
  try {
    const touched = await db.$transaction(async (tx) => {
      const result: Record<string, number> = {};
      await anonymizeBusinessRecords(tx, tombstone.subjectUserId, exists.email, now, result);
      await tx.user.delete({ where: { id: tombstone.subjectUserId } });
      result.User = 1;
      return result;
    });
    return { outcome: "APPLIED", action: "DELETE", touched };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2003" || error.code === "P2014")) {
      return { outcome: "BLOCKED", blockers: [`fk_restrict:${String(error.meta?.field_name ?? error.meta?.constraint ?? "unknown")}`] };
    }
    throw error;
  }
}

export async function applyErasure(db: PrismaClient, input: { requestId: string; approval: ResolvedApproval; now?: Date }) {
  const now = input.now ?? new Date();
  const tombstone = await db.dataSubjectTombstone.findUnique({ where: { id: input.requestId } });
  if (!tombstone) throw new DsrError("Talep bulunamadı", "request_not_found");
  if (tombstone.status !== "PENDING_GRACE") throw new DsrError(`Talep uygulanabilir durumda değil (durum: ${tombstone.status})`, "not_pending");
  if (tombstone.graceUntil.getTime() > now.getTime()) {
    throw new DsrError(`Bekleme süresi dolmadı (${tombstone.graceUntil.toISOString()}); bu süre içinde talep iptal edilebilir`, "grace_not_elapsed");
  }
  if (input.approval.approverUserId === tombstone.subjectUserId) throw new DsrError("Onaylayan kişi veri sahibiyle aynı olamaz", "self_approval");

  // Geri alınamaz adımdan ÖNCE onay kaydı diske yazılır.
  await db.auditLog.create({
    data: {
      actorUserId: input.approval.approverUserId,
      actorType: "USER",
      entityType: "DataSubjectTombstone",
      entityId: tombstone.id,
      action: "dsr.erasure_apply_approved",
      summary: "Geri alınamaz silme/anonimleştirme onaylandı",
      payload: { subjectUserId: tombstone.subjectUserId, requestAction: tombstone.action, ticketRef: input.approval.ticketRef },
    },
  });
  const outcome = await performErasure(db, tombstone, now);
  const status = outcome.outcome === "BLOCKED" ? "BLOCKED" : "APPLIED";
  const updated = await db.dataSubjectTombstone.update({
    where: { id: tombstone.id },
    data: {
      status,
      appliedAt: status === "APPLIED" ? now : null,
      appliedByUserId: input.approval.approverUserId,
      blockers: outcome.outcome === "BLOCKED" ? outcome.blockers : undefined,
    },
  });
  await db.auditLog.create({
    data: {
      actorUserId: input.approval.approverUserId,
      actorType: "USER",
      entityType: "DataSubjectTombstone",
      entityId: tombstone.id,
      action: status === "APPLIED" ? "dsr.erasure_applied" : "dsr.erasure_blocked",
      summary: status === "APPLIED" ? "Veri sahibi talebi uygulandı" : "Silme engelleyici kayıtlar nedeniyle uygulanmadı; anonimleştirme kararı gerekiyor",
      payload: { subjectUserId: tombstone.subjectUserId, requestAction: tombstone.action, outcome: outcome as unknown as Prisma.InputJsonValue },
    },
  });
  return { tombstone: updated, outcome };
}

// ── Yedekten bağımsız tombstone defteri ───────────────────────────────────

export type TombstoneLedger = {
  version: 1;
  exportedAt: string;
  entries: Array<{
    id: string;
    subjectUserId: string;
    action: "ANONYMIZE" | "DELETE";
    status: "PENDING_GRACE" | "APPLIED" | "CANCELLED" | "BLOCKED";
    ticketRef: string;
    approvedByUserId: string;
    appliedByUserId: string | null;
    previousStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
    graceUntil: string;
    appliedAt: string | null;
    createdAt: string;
  }>;
};

/** Defter kimlik (cuid) ve karar bilgisi taşır; ad/e-posta/telefon içermez. */
export async function exportTombstoneLedger(db: PrismaClient, now = new Date()): Promise<TombstoneLedger> {
  const rows = await db.dataSubjectTombstone.findMany({ orderBy: { createdAt: "asc" } });
  return {
    version: 1,
    exportedAt: now.toISOString(),
    entries: rows.map((row) => ({
      id: row.id,
      subjectUserId: row.subjectUserId,
      action: row.action,
      status: row.status,
      ticketRef: row.ticketRef,
      approvedByUserId: row.approvedByUserId,
      appliedByUserId: row.appliedByUserId,
      previousStatus: row.previousStatus,
      graceUntil: row.graceUntil.toISOString(),
      appliedAt: row.appliedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export function parseTombstoneLedger(raw: unknown): TombstoneLedger {
  const ledger = raw as Partial<TombstoneLedger> | null;
  if (!ledger || ledger.version !== 1 || !Array.isArray(ledger.entries)) throw new Error("Geçersiz tombstone defteri (version 1 bekleniyor)");
  for (const entry of ledger.entries) {
    if (typeof entry?.id !== "string" || typeof entry.subjectUserId !== "string") throw new Error("Tombstone defter girdisi id/subjectUserId içermiyor");
    if (!["ANONYMIZE", "DELETE"].includes(entry.action)) throw new Error(`Bilinmeyen tombstone aksiyonu: ${String(entry.action)}`);
    if (!["PENDING_GRACE", "APPLIED", "CANCELLED", "BLOCKED"].includes(entry.status)) throw new Error(`Bilinmeyen tombstone durumu: ${String(entry.status)}`);
  }
  return ledger as TombstoneLedger;
}

export type ReapplyReport = { total: number; reapplied: number; resuspended: number; alreadyClean: number; blocked: Array<{ id: string; blockers: string[] }>; restoredLedgerRows: number };

/**
 * Restore edilen veritabanına defteri yeniden uygular. Idempotenttir:
 * zaten silinmiş/anonimleştirilmiş kişi `alreadyClean` sayılır.
 */
export async function reapplyTombstones(db: PrismaClient, ledger: TombstoneLedger, now = new Date()): Promise<ReapplyReport> {
  const report: ReapplyReport = { total: ledger.entries.length, reapplied: 0, resuspended: 0, alreadyClean: 0, blocked: [], restoredLedgerRows: 0 };
  for (const entry of ledger.entries) {
    const existing = await db.dataSubjectTombstone.findUnique({ where: { id: entry.id }, select: { id: true } });
    const ledgerData = {
      status: entry.status,
      appliedAt: entry.appliedAt ? new Date(entry.appliedAt) : null,
      appliedByUserId: entry.appliedByUserId,
    };
    if (existing) {
      await db.dataSubjectTombstone.update({ where: { id: entry.id }, data: ledgerData });
    } else {
      await db.dataSubjectTombstone.create({
        data: {
          id: entry.id,
          subjectUserId: entry.subjectUserId,
          action: entry.action,
          ticketRef: entry.ticketRef,
          approvedByUserId: entry.approvedByUserId,
          previousStatus: entry.previousStatus,
          graceUntil: new Date(entry.graceUntil),
          createdAt: new Date(entry.createdAt),
          ...ledgerData,
        },
      });
      report.restoredLedgerRows += 1;
    }

    if (entry.status === "PENDING_GRACE") {
      const suspended = await db.user.updateMany({ where: { id: entry.subjectUserId, status: { not: "SUSPENDED" } }, data: { status: "SUSPENDED" } });
      await db.session.updateMany({ where: { userId: entry.subjectUserId, revokedAt: null }, data: { revokedAt: now } });
      report.resuspended += suspended.count;
      continue;
    }
    if (entry.status !== "APPLIED") continue;

    const user = await db.user.findUnique({ where: { id: entry.subjectUserId }, select: { email: true } });
    if (!user || (entry.action === "ANONYMIZE" && user.email.endsWith(`@${ANONYMIZED_EMAIL_DOMAIN}`))) {
      report.alreadyClean += 1;
      continue;
    }
    const outcome = await performErasure(db, entry, now);
    if (outcome.outcome === "BLOCKED") {
      report.blocked.push({ id: entry.id, blockers: outcome.blockers });
      continue;
    }
    report.reapplied += 1;
    await db.auditLog.create({
      data: {
        actorType: "SYSTEM",
        entityType: "DataSubjectTombstone",
        entityId: entry.id,
        action: "dsr.tombstone_reapplied",
        summary: "Restore sonrası veri sahibi talebi yeniden uygulandı",
        payload: { subjectUserId: entry.subjectUserId, requestAction: entry.action },
      },
    });
  }
  return report;
}
