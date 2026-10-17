import { z } from "zod";
import { GroupMutationError } from "./group-mutation-core";

const envelope = z.object({ idempotencyKey: z.string().uuid().optional(), expectedRevision: z.string().regex(/^[a-f0-9]{64}$/).optional(), expectedTargetRevision: z.string().regex(/^[a-f0-9]{64}$/).optional() });
export type GroupMutationEnvelope = z.infer<typeof envelope>;

/** Eski web formları uyumlu kalır; Bearer yazmaları güvenli önkoşulları atlayamaz. */
export function parseGroupMutationEnvelope(headers: Headers, body: unknown, options: { create?: boolean; transfer?: boolean } = {}): GroupMutationEnvelope {
  const parsed = envelope.safeParse(body);
  if (!parsed.success) throw new GroupMutationError("INVALID_INPUT", "İşlem anahtarı veya grup sürümü geçerli görünmüyor.", 400);
  const required = /^Bearer\s+/i.test(headers.get("authorization") ?? "") || parsed.data.idempotencyKey !== undefined;
  if (required && (!parsed.data.idempotencyKey || (!options.create && !parsed.data.expectedRevision) || (options.transfer && !parsed.data.expectedTargetRevision))) {
    throw new GroupMutationError("PRECONDITION_REQUIRED", "Güvenli işlem bilgisi eksik görünüyor. Sayfayı yenileyip tekrar dener misiniz?", 400);
  }
  return parsed.data;
}
