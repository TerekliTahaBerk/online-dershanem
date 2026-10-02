import { runCoachingReminders } from "@/lib/coaching-reminders-server";
import { runJob } from "@/lib/jobs/runner";
import { runLessonReminders } from "@/lib/lesson-reminders-server";
import { flushNotificationDeliveries } from "@/lib/notification-producer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  return runJob("lesson-reminders", request, async () => { const now = new Date(); const [lesson, coaching] = await Promise.all([runLessonReminders(now), runCoachingReminders(now)]); const delivery = await flushNotificationDeliveries(now); return { processed: lesson.processed + coaching.processed + delivery.processed, notifications: lesson.notifications + coaching.notifications + delivery.delivered }; }, { metrics: (result) => ({ processedCount: result.processed }) });
}
