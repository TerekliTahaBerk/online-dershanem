import assert from "node:assert/strict";
import test from "node:test";
import {
  findCoachAssignmentForCoach,
  getCoachStudents,
  getStudentCoaching,
} from "../../lib/panel/coaching";
import { integration, prisma } from "./support/harness";
import { cleanupFixtures, createStudent, createTeacher } from "./support/fixtures";

/**
 * OD-012 · KOÇLUK GİZLİLİĞİ.
 *
 * `privateNote` koçun kendine yazdığı nottur; öğrenciye ve veliye açılan
 * ekranlar aynı `getStudentCoaching` çıktısını kullanıyor. Gizlilik bir tip
 * anlaşmasıyla değil, Prisma `select` bloğuyla sağlanıyor — yani ancak gerçek
 * bir sorguyla doğrulanabilir. Bir `select` genişlemesi tip hatası vermeden
 * özel notu ekranlara taşıyabilir; bu testler o sessiz sızıntıyı yakalar.
 */

const SECRET = "ÖZEL KOÇ NOTU — hiçbir ekrana çıkmamalı";

async function coachedStudent(overrides: { cadenceDays?: number | null; endedAt?: Date | null } = {}) {
  const { user: coachUser, profile: coach } = await createTeacher({ isCoach: true, fullName: "Koç Deniz" });
  const { profile: student } = await createStudent({ fullName: "Koçluk Öğrencisi" });
  const assignment = await prisma.coachAssignment.create({
    data: {
      studentId: student.id,
      coachId: coach.id,
      cadenceDays: overrides.cadenceDays === undefined ? 7 : overrides.cadenceDays,
      endedAt: overrides.endedAt ?? null,
    },
  });
  return { coachUser, coach, student, assignment };
}

integration("özel koç notu öğrenci ve veli görünümüne hiç girmez", async () => {
  const { student, assignment } = await coachedStudent();
  await prisma.coachingSession.create({
    data: {
      assignmentId: assignment.id,
      scheduledAt: new Date(Date.now() - 2 * 86_400_000),
      status: "COMPLETED",
      completedAt: new Date(Date.now() - 2 * 86_400_000),
      focus: "Kesirlerde işlem hızı",
      sharedNote: "Bu hafta iki kısa tekrar yapalım.",
      privateNote: SECRET,
    },
  });

  // Not gerçekten kaydedildi — test kendi kurulumunu doğruluyor.
  assert.equal(
    (await prisma.coachingSession.findFirstOrThrow({ where: { assignmentId: assignment.id } })).privateNote,
    SECRET,
  );

  const snapshot = await getStudentCoaching(student.id);
  assert.ok(snapshot);
  assert.equal(snapshot.sharedNote, "Bu hafta iki kısa tekrar yapalım.");
  assert.equal(snapshot.focus, "Kesirlerde işlem hızı");
  assert.equal(Object.hasOwn(snapshot, "privateNote"), false);
  assert.doesNotMatch(JSON.stringify(snapshot), /ÖZEL KOÇ NOTU/, "özel not çıktıya sızdı");
});

integration("paylaşılan not yalnız tamamlanmış görüşmeden gelir", async () => {
  const { student, assignment } = await coachedStudent();
  await prisma.coachingSession.createMany({
    data: [
      {
        assignmentId: assignment.id,
        scheduledAt: new Date(Date.now() - 5 * 86_400_000),
        status: "COMPLETED",
        completedAt: new Date(Date.now() - 5 * 86_400_000),
        focus: "Tamamlanan odak",
        sharedNote: "Tamamlanan not",
        privateNote: SECRET,
      },
      {
        assignmentId: assignment.id,
        scheduledAt: new Date(Date.now() + 3 * 86_400_000),
        status: "PLANNED",
        focus: "Henüz yapılmamış odak",
        sharedNote: "Henüz paylaşılmamış not",
      },
    ],
  });

  const snapshot = await getStudentCoaching(student.id);
  assert.equal(snapshot?.sharedNote, "Tamamlanan not");
  assert.equal(snapshot?.focus, "Tamamlanan odak");
  assert.equal(snapshot?.overdue, false, "ileri tarihli görüşme gecikme sayıldı");
});

integration("gecikme kararı gerçek görüşme satırlarından çıkar", async () => {
  const overdue = await coachedStudent();
  await prisma.coachingSession.create({
    data: { assignmentId: overdue.assignment.id, scheduledAt: new Date(Date.now() - 3 * 86_400_000), status: "PLANNED" },
  });
  const overdueSnapshot = await getStudentCoaching(overdue.student.id);
  assert.equal(overdueSnapshot?.overdue, true);
  assert.equal(overdueSnapshot?.overdueDays, 3);

  // Sıklık belirlenmemişse uydurma bir varsayılanla gecikme İDDİA EDİLMEZ.
  const withoutCadence = await coachedStudent({ cadenceDays: null });
  await prisma.coachingSession.create({
    data: {
      assignmentId: withoutCadence.assignment.id,
      scheduledAt: new Date(Date.now() - 90 * 86_400_000),
      status: "COMPLETED",
      completedAt: new Date(Date.now() - 90 * 86_400_000),
    },
  });
  const snapshot = await getStudentCoaching(withoutCadence.student.id);
  assert.equal(snapshot?.cadenceDays, null);
  assert.equal(snapshot?.overdue, false);
});

integration("koçluk sona erdiğinde görünüm kapanır", async () => {
  const { student, assignment } = await coachedStudent({ endedAt: new Date(Date.now() - 86_400_000) });
  await prisma.coachingSession.create({
    data: {
      assignmentId: assignment.id,
      scheduledAt: new Date(Date.now() - 10 * 86_400_000),
      status: "COMPLETED",
      completedAt: new Date(Date.now() - 10 * 86_400_000),
      sharedNote: "Eski not",
      privateNote: SECRET,
    },
  });
  assert.equal(await getStudentCoaching(student.id), null);
});

integration("koç yalnız kendi atandığı öğrencileri görür", async () => {
  const mine = await coachedStudent();
  const other = await coachedStudent();
  await prisma.coachingSession.create({
    data: { assignmentId: mine.assignment.id, scheduledAt: new Date(Date.now() - 86_400_000), status: "PLANNED" },
  });

  const rows = await getCoachStudents(mine.coachUser.id);
  assert.deepEqual(rows.map((row) => row.studentId), [mine.student.id]);
  assert.equal(rows[0].overdue, true);
  assert.doesNotMatch(JSON.stringify(rows), /ÖZEL KOÇ NOTU/);

  assert.equal((await getCoachStudents(other.coachUser.id)).length, 1);
  assert.equal((await getCoachStudents(other.coachUser.id))[0].studentId, other.student.id);

  assert.equal((await findCoachAssignmentForCoach(mine.coachUser.id, mine.student.id))?.id, mine.assignment.id);
  assert.equal(await findCoachAssignmentForCoach(other.coachUser.id, mine.student.id), null);
});

integration("sona ermiş atama koçun yazma kapısını da kapatır", async () => {
  const { coachUser, student } = await coachedStudent({ endedAt: new Date(Date.now() - 86_400_000) });
  assert.equal(await findCoachAssignmentForCoach(coachUser.id, student.id), null);
  assert.deepEqual(await getCoachStudents(coachUser.id), []);
});

test.after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});
