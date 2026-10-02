import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateFirstLessonMetrics, type FirstLessonSample } from "./first-lesson-metrics";

/** Yalnız yönetim İşler ekranı çağırır; sayfalı operasyon listesinden ölçüm türetilmez. */
export async function loadFirstLessonMetrics(now: Date) {
  const from = new Date(now.getTime() - 90 * 86_400_000);
  const samples = await prisma.$queryRaw<FirstLessonSample[]>`
    WITH first_orders AS (
      SELECT DISTINCT ON (COALESCE(o.user_id, o.id)) o.id, o.user_id, p.paid_at
      FROM od_orders o
      JOIN od_onboardings ob ON ob.order_id = o.id AND ob.flow_type = 'NEW_STUDENT'
      JOIN LATERAL (
        SELECT paid_at FROM od_payments WHERE order_id = o.id AND status = 'SUCCEEDED' AND paid_at IS NOT NULL ORDER BY paid_at LIMIT 1
      ) p ON true
      WHERE o.status = 'PAID' AND ob.state <> 'CANCELED'
      ORDER BY COALESCE(o.user_id, o.id), p.paid_at, o.id
    )
    SELECT o.paid_at AS "paidAt", first_lesson.starts_at AS "firstLessonAt",
      COALESCE(first_lesson.status = 'COMPLETED' AND first_lesson.starts_at <= ${now}, false) AS "lessonCompleted",
      a.status AS attendance,
      EXISTS (SELECT 1 FROM financial_transactions f JOIN business_leads bl ON bl.id = f.lead_id AND bl.anonymized_at IS NULL WHERE f.od_order_id = o.id) AS "linkedLead"
    FROM first_orders o
    LEFT JOIN student_profiles s ON s.user_id = o.user_id
    LEFT JOIN LATERAL (
      SELECT l.id, l.starts_at, l.status FROM enrollments e
      JOIN lessons l ON l.group_id = e.group_id
      WHERE e.student_id = s.id AND l.status <> 'CANCELLED' AND l.starts_at >= o.paid_at
        AND l.starts_at >= e.started_at AND (e.ended_at IS NULL OR l.starts_at < e.ended_at)
      ORDER BY l.starts_at, l.id LIMIT 1
    ) first_lesson ON true
    LEFT JOIN attendances a ON a.student_id = s.id AND a.lesson_id = first_lesson.id
    WHERE o.paid_at >= ${from} AND o.paid_at <= ${now}
  `;
  return calculateFirstLessonMetrics(samples);
}
