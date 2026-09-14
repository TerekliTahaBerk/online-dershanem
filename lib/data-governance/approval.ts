import type { PrismaClient } from "@prisma/client";

/**
 * Geri alınamaz veri işlemleri için onay kapısı.
 *
 * Bu kapı KİMLİK DOĞRULAMASI YAPMAZ. Talep edenin gerçekten veli/öğrenci/hesap
 * sahibi olduğunu doğrulamak süreç dışındaki insan adımıdır
 * (docs/panel-data-governance.md). `--ticket`, o doğrulamanın kaydedildiği
 * talebin referansıdır; `--approved-by`, kararı veren aktif admin hesabıdır.
 */

export type ApprovalInput = { approvedBy?: string | null; ticket?: string | null };
export type ResolvedApproval = { approverUserId: string; ticketRef: string };

const TICKET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/#-]{2,63}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalError";
  }
}

/** Veritabanına gitmeden biçim kontrolü; eksik parametrede işlem başlamaz. */
export function assertApprovalShape(input: ApprovalInput): { approvedBy: string; ticket: string } {
  const approvedBy = input.approvedBy?.trim().toLowerCase() ?? "";
  const ticket = input.ticket?.trim() ?? "";
  const missing: string[] = [];
  if (!approvedBy) missing.push("--approved-by");
  if (!ticket) missing.push("--ticket");
  if (missing.length > 0) {
    throw new ApprovalError(`Onay parametreleri eksik: ${missing.join(", ")}. Kimlik doğrulaması ve onay süreç dışında tamamlanmadan bu işlem çalıştırılamaz.`);
  }
  if (!EMAIL_PATTERN.test(approvedBy)) throw new ApprovalError("--approved-by geçerli bir admin e-postası olmalı");
  if (!TICKET_PATTERN.test(ticket)) throw new ApprovalError("--ticket 3–64 karakter, harf/rakam ve ._:/#- içermeli (kişisel veri yazmayın)");
  return { approvedBy, ticket };
}

/** Onaylayan aktif ADMIN hesabı olmalı; audit `actorUserId` bu hesaptır. */
export async function resolveApproval(db: PrismaClient, input: ApprovalInput): Promise<ResolvedApproval> {
  const { approvedBy, ticket } = assertApprovalShape(input);
  const approver = await db.user.findUnique({ where: { email: approvedBy }, select: { id: true, role: true, status: true } });
  if (!approver || approver.role !== "ADMIN" || approver.status !== "ACTIVE") {
    throw new ApprovalError("--approved-by aktif bir ADMIN hesabına ait değil");
  }
  return { approverUserId: approver.id, ticketRef: ticket };
}
