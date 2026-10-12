import { expect, test, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../../lib/auth/password";
import { educationFormBody, parseEducationEditor, type EditorKind } from "../../lib/mobile-contracts/admin-education-editor";

// Synthetic accounts only; opt in against an isolated, migrated test database.
test.skip(process.env.P23_ISOLATED_HTTP_TEST !== "true", "İzole P2.3 HTTP test ortamı gerekli");
const db = new PrismaClient();
const headers = { "x-od-client": "mobile", "x-od-client-version": "1.0.0", "user-agent": "OnlineDershanemMobile/1.0.0 (ios)" };
test("P2.3 gerçek HTTP: yetki/step-up, seri kapsamı, ödev, materyal, kurulum, takvim ve kazanım yazmaları", async ({ request }) => {
  test.setTimeout(120_000);
  const users: string[] = [], groups: string[] = [], versions: string[] = [];
  async function user(role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT") {
    const password = `P23-${randomUUID()}`;
    const row = await db.user.create({ data: { email: `p23-${randomUUID()}@example.com`, passwordHash: await hashPassword(password), role, status: "ACTIVE", mustChangePassword: false, inviteAcceptedAt: new Date() } });
    users.push(row.id); return { ...row, password };
  }
  const admin = await user("ADMIN"), teacher = await user("TEACHER"), learner = await user("STUDENT"), parent = await user("PARENT");
  const student = await db.studentProfile.create({ data: { userId: learner.id } });
  const group = await db.group.create({ data: { name: "P2.3 HTTP", subject: "Fen", teacherId: teacher.id, enrollments: { create: { studentId: student.id } } } }); groups.push(group.id);
  let auth: Record<string, string>;
  const read = async (kind: EditorKind, id?: string) => {
    const response = await request.get(`/api/panel/admin/education/editor?kind=${kind}${id ? `&id=${id}` : ''}`, { headers: auth });
    expect(response.status(), await response.text()).toBe(200); expect(response.headers()["cache-control"]).toContain("no-store");
    const parsed = parseEducationEditor(await response.json()); if (!parsed.ok) throw new Error(parsed.error); return parsed.value;
  };
  const write = async (path: string, method: "POST" | "PATCH", body: unknown, revision?: string | null, key = randomUUID()) => request.fetch(`/api/panel/${path}`, { method, headers: { ...auth, "X-Od-Idempotency-Key": key, ...(revision ? { "X-Od-Expected-Revision": revision } : {}) }, data: body });
  const ok = async (response: Awaited<ReturnType<APIRequestContext["post"]>>) => { expect(response.status(), await response.text()).toBe(200); return response.json(); };
  try {
    const login = await request.post("/api/auth/login", { headers, data: { email: admin.email, password: admin.password } });
    const logged = await login.json(); expect(logged.token, JSON.stringify(logged)).toBeTruthy(); auth = { ...headers, authorization: `Bearer ${logged.token}` };
    const createLesson = { targetType: "GROUP", groupId: group.id, title: "HTTP serisi", mode: "SERIES", startsAt: "2030-10-14T09:00:00.000Z", durationMinutes: 60, totalOccurrences: 2, repeatWeeks: 2 };
    expect((await write("lessons", "POST", createLesson)).status()).toBe(428);
    await db.session.updateMany({ where: { userId: admin.id }, data: { stepUpAt: new Date() } });
    expect((await request.post("/api/panel/lessons", { headers: auth, data: createLesson })).status()).toBe(400);
    const education = await read("lesson"); const groupRevision = education.forms[0].fields.find((field) => field.key === "groupId")!.options.find((option) => option.id === group.id)!.revision;
    const preview = await ok(await request.post("/api/panel/lessons/preview-series", { headers: auth, data: createLesson })); expect(preview.count).toBe(2);
    const key = randomUUID();
    const concurrent = await Promise.all([write("lessons", "POST", createLesson, groupRevision, key), write("lessons", "POST", createLesson, groupRevision, key)]);
    const results = await Promise.all(concurrent.map(ok));
    expect(results.filter((result) => result.replayed)).toHaveLength(1);
    const first = results[0];
    expect((await write("lessons", "POST", { ...createLesson, title: "Anahtar farklı içerikte" }, groupRevision, key)).status()).toBe(409);
    expect((await ok(await write("lessons", "POST", createLesson, groupRevision, key))).replayed).toBe(true);
    expect(await db.lesson.count({ where: { groupId: group.id } })).toBe(2);
    const lessons = await db.lesson.findMany({ where: { groupId: group.id }, orderBy: { startsAt: "asc" } });
    const lessonEditor = await read("lesson", lessons[0].id);
    await ok(await write(`lessons/${lessons[0].id}`, "PATCH", { action: "UPDATE", scope: "ONE", title: "Yalnız ilk ders" }, lessonEditor.forms[0].revision));
    expect((await db.lesson.findUniqueOrThrow({ where: { id: lessons[1].id } })).title).toBe("HTTP serisi");
    expect((await db.lessonSeries.findUniqueOrThrow({ where: { id: lessons[0].seriesId! } })).title).toBe("HTTP serisi");
    expect((await write(`lessons/${lessons[0].id}`, "PATCH", { action: "CANCEL", scope: "ONE" }, lessonEditor.forms[0].revision)).status()).toBe(409);
    const fresh = await read("lesson", lessons[0].id);
    await ok(await write(`lessons/${lessons[0].id}`, "PATCH", { action: "CANCEL", scope: "FOLLOWING" }, fresh.forms[0].revision));
    expect(await db.lesson.count({ where: { groupId: group.id, status: "CANCELLED" } })).toBe(2);
    for (const action of [
      { action: "RESCHEDULE", scope: "ONE", startsAt: "2030-10-14T11:00:00.000Z", keepDurationMinutes: 45 },
      { action: "SUBSTITUTE", scope: "ONE", teacherId: teacher.id },
      { action: "MAKE_UP", startsAt: "2030-10-16T09:00:00.000Z", teacherId: teacher.id },
    ]) {
      const current = await read("lesson", lessons[0].id);
      await ok(await write(`lessons/${lessons[0].id}`, "PATCH", action, current.forms[0].revision));
    }
    const forIndividual = await read("lesson");
    const studentRevision = forIndividual.forms[0].fields.find((field) => field.key === "studentId")!.options.find((option) => option.id === student.id)!.revision;
    await ok(await write("lessons", "POST", { targetType: "STUDENT", studentId: student.id, teacherId: teacher.id, title: "Bireysel HTTP", mode: "SINGLE", startsAt: "2030-10-20T09:00:00.000Z", durationMinutes: 60 }, studentRevision));
    const uploadHeaders = { ...auth, "X-Od-Idempotency-Key": randomUUID(), "X-Od-Expected-Revision": groupRevision! };
    const upload = await request.post("/api/panel/materials/upload", { headers: uploadHeaders, multipart: { groupId: group.id, title: "Dosya", file: { name: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-test") } } });
    expect(upload.status(), await upload.text()).toBe(503);
    const oversized = await request.post("/api/panel/materials/upload", { headers: uploadHeaders, multipart: { groupId: group.id, title: "Dosya", file: { name: "large.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(4 * 1024 * 1024 + 1) } } });
    expect(oversized.status()).toBe(413);
    const assignment = await ok(await write("assignments", "POST", { groupId: group.id, title: "HTTP ödev", dueAt: "2030-10-15T09:00:00.000Z", outcomeIds: [], outcomeSkipReason: "COMPLETE_LATER", evidenceRequired: true, rubricCriteria: ["Doğruluk", "Açıklama"] }, groupRevision));
    const submission = await db.assignmentSubmission.create({ data: { assignmentId: assignment.id, studentId: student.id, attemptNumber: 1, textEvidence: "Çözüm açıklaması", idempotencyKey: randomUUID() } });
    const submissionEditor = await read("submission", submission.id);
    const reviewBody = educationFormBody(submissionEditor.forms[0], { feedback: "Açıklaman yeterli ve doğru." });
    await ok(await write(`assignment-submissions/${submission.id}/review`, "POST", reviewBody, submissionEditor.forms[0].revision));
    expect((await db.assignmentSubmission.findUniqueOrThrow({ where: { id: submission.id } })).status).toBe("APPROVED");
    const assignmentEditor = await read("assignment", assignment.id);
    const assignmentBody = educationFormBody(assignmentEditor.forms[0], {}); assignmentBody.isActive = false;
    await ok(await write(`assignments/${assignment.id}`, "PATCH", assignmentBody, assignmentEditor.forms[0].revision));
    const material = await ok(await write("materials", "POST", { groupId: group.id, title: "HTTP kaynak", url: "https://example.com/resource", kind: "LINK" }, groupRevision));
    const materialEditor = await read("material", material.material.id);
    await ok(await write(`materials/${material.material.id}`, "PATCH", { title: "Düzenlenen kaynak", isActive: true }, materialEditor.forms[0].revision));
    const updatedMaterial = await read("material", material.material.id);
    await ok(await write(`materials/${material.material.id}`, "PATCH", {}, updatedMaterial.forms[0].revision));
    expect((await db.learningMaterial.findUniqueOrThrow({ where: { id: material.material.id } })).isActive).toBe(false);
    const setup = await ok(await write("setup", "POST", { name: "Hızlı kurulum HTTP", subject: "Fen", teacherId: teacher.id, studentIds: [student.id], parentLinks: [{ parentId: parent.id, studentId: student.id }], lessonTitle: "Kurulum dersi", startsAt: "2030-11-01T09:00:00.000Z", repeatWeeks: 2 })); groups.push(setup.id);
    expect(await db.lesson.count({ where: { groupId: setup.id } })).toBe(2);
    expect((await read("calendar")).forms[0].fields.map((field) => field.key)).toEqual(["group", "teacher"]);
    const ics = await request.get("/api/panel/calendar/export", { headers: auth }); expect(ics.status(), await ics.text()).toBe(200); expect(await ics.text()).toContain("BEGIN:VCALENDAR");
    const version = await ok(await write("curriculum/versions", "POST", { code: `P23-${randomUUID().slice(0, 8)}`, title: "HTTP katalog", exam: "LGS", academicYear: 2030 })); versions.push(version.id);
    const versionEditor = await read("version", version.id);
    await ok(await write("curriculum/outcomes", "POST", { versionId: version.id, subjectCode: "FEN", subjectName: "Fen", unitCode: "U1", unitName: "İlk ünite", outcomeCode: "FEN.1", title: "Deney sonuçlarını değerlendirir", skills: ["Analiz"] }, versionEditor.forms[0].revision));
    expect((await write(`curriculum/versions/${version.id}`, "PATCH", { status: "ACTIVE" }, versionEditor.forms[0].revision)).status()).toBe(409);
    const updatedVersion = await read("version", version.id);
    await ok(await write(`curriculum/versions/${version.id}`, "PATCH", { status: "ACTIVE" }, updatedVersion.forms[0].revision));
    expect((await request.get("/api/panel/admin/education/editor?kind=bogus", { headers: auth })).status()).toBe(400);
    expect((await request.get("/api/panel/admin/education/editor?kind=lesson", { headers })).status()).toBe(401);
    const studentLogin = await request.post("/api/auth/login", { headers, data: { email: learner.email, password: learner.password } });
    const studentToken = (await studentLogin.json()).token;
    expect((await request.get("/api/panel/admin/education/editor?kind=lesson", { headers: { ...headers, authorization: `Bearer ${studentToken}` } })).status()).toBe(403);
    expect(first).toBeTruthy();
  } finally {
    await db.session.deleteMany({ where: { userId: { in: users } } });
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
    await db.learningMaterial.deleteMany({ where: { groupId: { in: groups } } });
    await db.assignment.deleteMany({ where: { groupId: { in: groups } } });
    await db.lesson.deleteMany({ where: { groupId: { in: groups } } }); await db.lessonSeries.deleteMany({ where: { groupId: { in: groups } } });
    await db.enrollment.deleteMany({ where: { groupId: { in: groups } } }); await db.group.deleteMany({ where: { id: { in: groups } } });
    await db.curriculumVersion.deleteMany({ where: { id: { in: versions } } });
    await db.parentStudent.deleteMany({ where: { parentId: { in: users } } }); await db.studentProfile.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
