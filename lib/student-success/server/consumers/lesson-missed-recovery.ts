import "server-only";

import type { CrossProductEventOutbox } from "@prisma/client";
import { parseEventPayload } from "@/lib/student-success/server/event-processor";

/**
 * LESSON_MISSED → recovery package entegrasyonu.
 * Recovery package zaten OD tarafında oluşturuluyor; burada yalnızca event işlendi olarak loglanır.
 * Gelecekte Koçum telafi önerisi cross_product_recommendations'a yazılabilir.
 */
export async function consumeLessonMissedRecovery(event: CrossProductEventOutbox): Promise<void> {
  parseEventPayload("LESSON_MISSED", event.payload);
  // Recovery package OD quick-lesson-close/recovery akışında zaten üretilir.
  // Consumer idempotency kaydı yeterli; ek side-effect gerekmiyorsa no-op.
}
