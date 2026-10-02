import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after } from "node:test";
import { prisma as db } from "@/lib/prisma";
import { loadFirstLessonMetrics } from "@/lib/business/first-lesson-metrics-server";
import { integration } from "./integration-utils";
after(() => db.$disconnect());
integration("ilk ders göstergesi ödeme/onboarding/grup dönemiyle bağlanır; yenileme ve iptal sayılmaz", async () => {
  const run = randomUUID(), now = new Date(), paidAt = new Date(now.getTime() - 2 * 86_400_000);
  const before = await loadFirstLessonMetrics(now);
  const student = await db.user.create({ data: { email: `metric-${run}@example.com`, role: "STUDENT", passwordHash: "unused", studentProfile: { create: {} } }, include: { studentProfile: true } });
  const teacher = await db.user.create({ data: { email: `metric-teacher-${run}@example.com`, role: "TEACHER", passwordHash: "unused" } });
  const group = await db.group.create({ data: { name: run, subject: "Matematik", teacherId: teacher.id, enrollments: { create: { studentId: student.studentProfile!.id, startedAt: paidAt } } } });
  const order = await db.odOrder.create({ data: { userId: student.id, packageName: "Test", subtotalCents: 200000, totalCents: 200000, status: "PAID", onboarding: { create: {} }, payments: { create: { status: "SUCCEEDED", paidAt, amountCents: 200000 } } } });
  let renewalId: string | undefined;
  try {
    await db.lesson.create({ data: { groupId: group.id, teacherId: teacher.id, title: "İptal", status: "CANCELLED", startsAt: new Date(paidAt.getTime() + 1000), endsAt: new Date(paidAt.getTime() + 3_600_000) } });
    const first = await db.lesson.create({ data: { groupId: group.id, teacherId: teacher.id, title: "İlk ders", status: "COMPLETED", startsAt: new Date(paidAt.getTime() + 86_400_000), endsAt: new Date(paidAt.getTime() + 90_000_000), attendances: { create: { studentId: student.studentProfile!.id, status: "LATE" } } } });
    const renewal = await db.odOrder.create({ data: { userId: student.id, packageName: "Yenileme", subtotalCents: 200000, totalCents: 200000, status: "PAID", onboarding: { create: { flowType: "EXISTING_STUDENT" } }, payments: { create: { status: "SUCCEEDED", paidAt: first.startsAt, amountCents: 200000 } } } }); renewalId = renewal.id;
    const result = await loadFirstLessonMetrics(now);
    assert.equal(result.paidCount, before.paidCount + 1);
    assert.equal(result.duration.sampleSize, before.duration.sampleSize + 1);
    assert.equal(result.participation.sampleSize, before.participation.sampleSize + 1);
  } finally {
    await db.odOrder.deleteMany({ where: { id: { in: [order.id, ...(renewalId ? [renewalId] : [])] } } });
    await db.group.delete({ where: { id: group.id } });
    await db.user.deleteMany({ where: { id: { in: [student.id, teacher.id] } } });
  }
});
