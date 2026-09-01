import "server-only";

import type { CrossProductEventOutbox } from "@prisma/client";
import { createCoachSuggestionsFromReleasedExam } from "@/lib/odk/coach-bridge";
import { parseEventPayload } from "@/lib/student-success/server/event-processor";

/** ODK sonuç yayını → Koçum önerileri (mevcut coach-bridge'i sarar). */
export async function consumeMockExamCoachBridge(event: CrossProductEventOutbox): Promise<void> {
  const payload = parseEventPayload("MOCK_EXAM_RESULT_PUBLISHED", event.payload);
  await createCoachSuggestionsFromReleasedExam(payload.examId, event.occurredAt);
}
