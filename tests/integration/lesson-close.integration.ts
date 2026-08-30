import assert from "node:assert/strict";
import test from "node:test";
import { lessonCloseRequestHash } from "../../lib/lesson-close";
import { claimLessonClose } from "../../lib/lesson-close-server";
import { assertUniqueViolation, integration, prisma } from "./support/harness";
import {
  cleanupFixtures,
  createGroup,
  createLesson,
  createStudent,
  createTeacher,
  enroll,
} from "./support/fixtures";

/**
 * OD-012 · İKİ DAKİKALIK DERS KAPANIŞI.
 *
 * Kapanışın riskli yeri kural değil EŞ ZAMANLILIK: aynı öğretmenin iki sekmesi
 * ya da yeniden denenen bir istek, birbirinin devamsızlık ve not kaydını
 * ezebilir. Bu ancak gerçek Postgres'te ölçülebilir; `updateMany`'nin kaç satır
 * güncellediği in-memory bir sahtede anlamsızdır.
 */

const payload = (studentIds: string[]) => ({
  topic: "Kesirler",
  note: "Genel not",
  nextGoal: "Bir sonraki hedef",
  homework: "",
  students: studentIds.map((studentId) => ({ studentId, note: "", attendance: "PRESENT" })),
  outcomes: [],
  outcomeSkipReason: null,
  assignmentDraft: null,
});

integration("eş zamanlı iki kapanış isteğinden yalnız biri dersi sahiplenir", async () => {
  const { user: teacher } = await createTeacher();
  const group = await createGroup(teacher.id);
  const lesson = await createLesson(group.id, teacher.id);

  const claim = (key: string) =>
    prisma.$transaction((tx) =>
      claimLessonClose(tx, {
        lessonId: lesson.id,
        teacherId: teacher.id,
        expectedVersion: 0,
        idempotencyKey: key,
        requestHash: `hash-${key}`,
      }),
    );

  const results = await Promise.all([claim("tab-a"), claim("tab-b")]);
  assert.equal(results.filter(Boolean).length, 1, "iki sekme birden kapanışı sahiplendi");

  const after = await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } });
  assert.equal(after.closeVersion, 1, "sürüm iki kez arttı: kayıp güncelleme");
  assert.ok(after.completedAt);
  // Kazanan kim olursa olsun, kaydedilen anahtar ve hash AYNI isteğe aittir.
  assert.equal(after.closeRequestHash, `hash-${after.closeIdempotencyKey}`);
});

integration("bayat sürümle gelen ikinci kapanış reddedilir", async () => {
  const { user: teacher } = await createTeacher();
  const group = await createGroup(teacher.id);
  const lesson = await createLesson(group.id, teacher.id);

  const base = { lessonId: lesson.id, teacherId: teacher.id, idempotencyKey: "key-1", requestHash: "hash-1" };
  assert.equal(await prisma.$transaction((tx) => claimLessonClose(tx, { ...base, expectedVersion: 0 })), true);
  assert.equal(await prisma.$transaction((tx) => claimLessonClose(tx, { ...base, expectedVersion: 0 })), false);
  assert.equal(await prisma.$transaction((tx) => claimLessonClose(tx, { ...base, expectedVersion: 1 })), true);
  assert.equal((await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } })).closeVersion, 2);
});

integration("başka öğretmen dersi kapatamaz ve okuma kapsamı da boş döner", async () => {
  const { user: teacher } = await createTeacher();
  const { user: intruder } = await createTeacher();
  const group = await createGroup(teacher.id);
  const lesson = await createLesson(group.id, teacher.id);

  const claimed = await prisma.$transaction((tx) =>
    claimLessonClose(tx, { lessonId: lesson.id, teacherId: intruder.id, expectedVersion: 0, idempotencyKey: "x", requestHash: "x" }),
  );
  assert.equal(claimed, false);

  const after = await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } });
  assert.equal(after.closeVersion, 0);
  assert.equal(after.completedAt, null);
  // Route'un 404 yolu: kayıt kimlikle DEĞİL, yetki koşuluyla birlikte aranır.
  assert.equal(await prisma.lesson.findFirst({ where: { id: lesson.id, teacherId: intruder.id } }), null);
});

integration("sürüm bilgisi olmadan gelen kapanış kilidi atlayamaz", async () => {
  const { user: teacher } = await createTeacher();
  const group = await createGroup(teacher.id);
  const lesson = await createLesson(group.id, teacher.id);

  // `expectedVersion` undefined kalırsa Prisma `where` koşulunu düşürür ve
  // kilit tamamen kaybolurdu. Kapalı tarafa düşmeli.
  const claimed = await prisma.$transaction((tx) =>
    claimLessonClose(tx, { lessonId: lesson.id, teacherId: teacher.id, expectedVersion: undefined, idempotencyKey: "x", requestHash: "x" }),
  );
  assert.equal(claimed, false);
  assert.equal((await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } })).closeVersion, 0);
});

integration("tekrar gönderilen aynı kapanış, alan sırası değişse de replay sayılır", async () => {
  const { user: teacher } = await createTeacher();
  const group = await createGroup(teacher.id);
  const lesson = await createLesson(group.id, teacher.id);
  const [{ profile: first }, { profile: second }] = await Promise.all([createStudent(), createStudent()]);
  await Promise.all([enroll(group.id, first.id), enroll(group.id, second.id)]);

  const idempotencyKey = crypto.randomUUID();
  const original = payload([first.id, second.id]);
  const hash = lessonCloseRequestHash(original);
  await prisma.$transaction((tx) =>
    claimLessonClose(tx, { lessonId: lesson.id, teacherId: teacher.id, expectedVersion: 0, idempotencyKey, requestHash: hash }),
  );

  const stored = await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } });
  assert.equal(stored.closeIdempotencyKey, idempotencyKey);

  // Ağdan dönen istemci öğrencileri başka sırada gönderir; aynı niyet, aynı hash.
  const retried = lessonCloseRequestHash(payload([second.id, first.id]));
  assert.equal(retried, stored.closeRequestHash, "sıralama replay tespitini bozuyor");

  // İçerik gerçekten değiştiyse hash tutmaz ve route 409 üretir.
  const edited = lessonCloseRequestHash({ ...payload([first.id, second.id]), topic: "Oranlar" });
  assert.notEqual(edited, stored.closeRequestHash);
});

integration("yoklama kaydı ders+öğrenci başına tektir", async () => {
  const { user: teacher } = await createTeacher();
  const group = await createGroup(teacher.id);
  const lesson = await createLesson(group.id, teacher.id);
  const { profile: student } = await createStudent();
  await enroll(group.id, student.id);

  const upsert = (status: "PRESENT" | "ABSENT") =>
    prisma.attendance.upsert({
      where: { lessonId_studentId: { lessonId: lesson.id, studentId: student.id } },
      create: { lessonId: lesson.id, studentId: student.id, status },
      update: { status },
    });

  await upsert("PRESENT");
  await upsert("ABSENT");
  const rows = await prisma.attendance.findMany({ where: { lessonId: lesson.id } });
  assert.equal(rows.length, 1, "düzeltme ikinci bir yoklama satırı açtı");
  assert.equal(rows[0].status, "ABSENT");

  await assertUniqueViolation(() =>
    prisma.attendance.create({ data: { lessonId: lesson.id, studentId: student.id, status: "LATE" } }),
  );
});

test.after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});
