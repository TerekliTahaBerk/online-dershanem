import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { parseStudentProfile } from "../../lib/mobile-contracts/profile";
import { parseMockExamsAdmin } from "../../lib/mobile-contracts/admin-rollout";

test("P5: yalnız OK öğrencisi ve üyeliği olmayan bağlı veli geri bildirim verir; yabancı/pasif bağ reddedilir; profil özel önbelleklidir", async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, "İzole veritabanı gerekli");
  const db = new PrismaClient();
  const run = randomUUID();
  const userIds: string[] = [];
  let profileId: string | undefined;
  let digestId: string | undefined;
  async function actor(role: "STUDENT" | "PARENT") {
    const user = await db.user.create({ data: { email: `${role}-${userIds.length}-${run}@example.com`, fullName: `${role} P5`, role, status: "ACTIVE", mustChangePassword: false, passwordHash: "unused", inviteAcceptedAt: new Date() } });
    userIds.push(user.id);
    const token = randomBytes(32).toString("base64url");
    await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3_600_000) } });
    return { user, headers: { authorization: `Bearer ${token}`, "x-od-client": "mobile", "x-od-client-version": "1.0.0" } };
  }
  try {
    const learner = await actor("STUDENT");
    const parent = await actor("PARENT");
    const foreign = await actor("PARENT");
    await db.productMembership.create({ data: { userId: learner.user.id, product: "OK" } });
    const profile = await db.studentProfile.create({ data: { userId: learner.user.id, targetGoal: "Mühendislik" } });
    profileId = profile.id;
    const link = await db.parentStudent.create({ data: { studentId: profile.id, parentId: parent.user.id, active: true, canViewAcademic: true } });
    const digest = await db.weeklyDigest.create({ data: { studentId: profile.id, status: "PUBLISHED", weekStart: new Date("2026-10-12T00:00:00Z"), dataThrough: new Date(), trendBand: "STEADY", goodThingOne: "Düzenli", goodThingTwo: "Katılım", supportArea: "Plan", homeQuestion: "Nasıl gidiyor?", generatedById: learner.user.id } });
    digestId = digest.id;
    const path = `/api/panel/weekly-digests/${digest.id}/feedback`;
    const data = { helpful: true, anxietyPulse: null };
    const studentResponse = await request.post(path, { headers: learner.headers, data });
    expect(studentResponse.status(), await studentResponse.text()).toBe(200);
    expect(studentResponse.headers()["cache-control"]).toContain("no-store");
    const parentResponse = await request.post(path, { headers: parent.headers, data });
    expect(parentResponse.status(), await parentResponse.text()).toBe(200);
    expect((await request.post(path, { headers: foreign.headers, data })).status()).toBe(404);
    await db.parentStudent.update({ where: { id: link.id }, data: { canViewAcademic: false } });
    expect((await request.post(path, { headers: parent.headers, data })).status()).toBe(404);
    await db.parentStudent.update({ where: { id: link.id }, data: { canViewAcademic: true, active: false } });
    expect((await request.post(path, { headers: parent.headers, data })).status()).toBe(404);
    const response = await request.get("/api/panel/student/profile", { headers: learner.headers });
    expect(response.status(), await response.text()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const parsed = parseStudentProfile(await response.json());
    expect(parsed.ok).toBe(true);
    if (parsed.ok) { expect(parsed.value.parents).toEqual([]); expect(parsed.value.activeProducts).toHaveLength(1); }
    expect((await request.get("/api/panel/student/profile", { headers: parent.headers })).status()).toBe(403);
    const createKey = randomUUID();
    const entry = { exam: 'YDT', takenAt: new Date().toISOString(), title: 'OK native dış deneme', sections: [{ subjectCode: 'YDT', correctCount: 70, incorrectCount: 8, blankCount: 2, errorCategories: ['TIME'] }], idempotencyKey: createKey };
    const created = await request.post('/api/panel/mock-exams', { headers: learner.headers, data: entry });
    expect(created.status(), await created.text()).toBe(200);
    const replay = await request.post('/api/panel/mock-exams', { headers: learner.headers, data: entry });
    expect((await replay.json()).replayed).toBe(true);
    const workspace = await request.get('/api/panel/mock-exams/workspace', { headers: learner.headers });
    expect(workspace.status(), await workspace.text()).toBe(200);
    expect(workspace.headers()['cache-control']).toContain('no-store');
    const exams = parseMockExamsAdmin(await workspace.json());
    expect(exams.ok).toBe(true);
    if (exams.ok) {
      expect(exams.value.students.map((item) => item.id)).toEqual([profile.id]);
      expect(exams.value.approval).toBeNull();
      const exam = exams.value.exams[0];
      const reasons = { reasons: exam.sections.map((section) => ({ sectionId: section.id, categories: ['PROCESS'] })), expectedRevision: exam.revision, idempotencyKey: randomUUID() };
      const revised = await request.patch(`/api/panel/mock-exams/${exam.id}`, { headers: learner.headers, data: reasons });
      expect(revised.status(), await revised.text()).toBe(204);
      expect((await request.patch(`/api/panel/mock-exams/${exam.id}`, { headers: learner.headers, data: { ...reasons, idempotencyKey: randomUUID() } })).status()).toBe(409);
      expect((await request.patch(`/api/panel/mock-exams/${exam.id}`, { headers: learner.headers, data: { ...reasons, nextAction: 'Yetkisiz onay', idempotencyKey: randomUUID() } })).status()).toBe(403);
      expect((await request.get('/api/panel/mock-exams/workspace', { headers: parent.headers })).status()).toBe(403);
    }
    await db.productMembership.create({ data: { userId: learner.user.id, product: "OD" } });
    await db.parentStudent.update({ where: { id: link.id }, data: { active: true, canViewAcademic: true } });
    const calendarPath = `/api/panel/calendar/export?studentId=${profile.id}`;
    const calendar = await request.get(calendarPath, { headers: parent.headers });
    expect(calendar.status(), await calendar.text()).toBe(200);
    expect(calendar.headers()["content-type"]).toContain("text/calendar");
    expect(await calendar.text()).toContain("BEGIN:VCALENDAR");
    expect((await request.get(calendarPath, { headers: foreign.headers })).status()).toBe(404);
    expect(await db.weeklyDigestFeedback.count({ where: { digestId: digest.id } })).toBe(2);
  } finally {
    if (digestId) { await db.weeklyDigestFeedback.deleteMany({ where: { digestId } }); await db.weeklyDigest.deleteMany({ where: { id: digestId } }); }
    if (profileId) { await db.mockExam.deleteMany({ where: { studentId: profileId } }); await db.parentStudent.deleteMany({ where: { studentId: profileId } }); await db.studentProfile.deleteMany({ where: { id: profileId } }); }
    await db.productMembership.deleteMany({ where: { userId: { in: userIds } } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
