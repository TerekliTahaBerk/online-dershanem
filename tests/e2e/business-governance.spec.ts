import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "node:crypto";

/** Synthetic accounts only; no personal E2E account is required. */
test("P2.7d gerçek HTTP: izin, 428, işlem anahtarı, revizyon, tekrar ve sözleşme", async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, "İzole test veritabanı gerekli");
  const db = new PrismaClient();
  const run = randomUUID();
  const userIds: string[] = [];
  const knowledgeIds: string[] = [];
  const oldUnit = await db.businessUnit.findUnique({ where: { product: "OD" } });
  const unit = oldUnit ?? await db.businessUnit.create({ data: { code: run, name: "P27d HTTP", product: "OD" } });
  async function actor(role: "SUPER_ADMIN" | "VIEWER") {
    const user = await db.user.create({ data: { email: `${role}-${run}@example.com`, role: "ADMIN", status: "ACTIVE", mustChangePassword: false, passwordHash: "unused", inviteAcceptedAt: new Date() } });
    userIds.push(user.id);
    const token = randomBytes(32).toString("base64url");
    const session = await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3_600_000), mfaVerifiedAt: new Date() } });
    await db.businessRoleAssignment.create({ data: { userId: user.id, businessUnitId: unit.id, role } });
    return { user, session, headers: { authorization: `Bearer ${token}`, "x-od-client": "mobile", "x-od-client-version": "1.0.0" } };
  }
  try {
    const owner = await actor("SUPER_ADMIN");
    const viewer = await actor("VIEWER");
    const command = { type: "knowledge.create", title: "HTTP bilgi kaydı", category: "Test", content: "Gerçek HTTP üzerinden içerik", productInterest: "UNKNOWN", businessUnitId: unit.id };
    const post = (body: unknown, headers = owner.headers) => request.post("/api/panel/business/ops", { headers, data: body });
    const denied = await post({ command, idempotencyKey: randomUUID() }, viewer.headers);
    expect(denied.status(), await denied.text()).toBe(404);
    expect((await post({ command })).status()).toBe(400);
    const key = randomUUID();
    const response = await post({ command, idempotencyKey: key });
    expect(response.status(), await response.text()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["set-cookie"]).toBeUndefined();
    const first = await response.json();
    knowledgeIds.push(first.result.entityId);
    expect((await (await post({ command, idempotencyKey: key })).json()).replayed).toBe(true);
    expect((await post({ command: { ...command, title: "Başka içerik" }, idempotencyKey: key })).status()).toBe(409);
    const row = await db.knowledgeBaseEntry.findUniqueOrThrow({ where: { id: first.result.entityId } });
    const version = { type: "knowledge.version", id: row.id, content: "İkinci sürümün uzun içeriği", isActive: true };
    expect((await post({ command: version, idempotencyKey: randomUUID() })).status()).toBe(400);
    expect((await post({ command: { ...version, expectedRevision: "2000-01-01T00:00:00.000Z" }, idempotencyKey: randomUUID() })).status()).toBe(409);
    expect((await post({ command: { ...version, expectedRevision: row.updatedAt.toISOString() }, idempotencyKey: randomUUID() })).status()).toBe(200);
    const assign = { type: "role.assign", userId: viewer.user.id, businessUnitId: unit.id, role: "SALES" };
    const stepUp = await post({ command: assign, idempotencyKey: randomUUID() });
    expect(stepUp.status(), await stepUp.text()).toBe(428);
    expect((await stepUp.json()).code).toBe("STEP_UP_REQUIRED");
    await db.session.update({ where: { id: owner.session.id }, data: { stepUpAt: new Date() } });
    expect((await post({ command: assign, idempotencyKey: randomUUID() })).status()).toBe(200);
    expect((await db.session.findUniqueOrThrow({ where: { id: viewer.session.id } })).revokedAt).not.toBeNull();
    const section = await request.get("/api/panel/business/sections/ai-bilgi-merkezi", { headers: owner.headers });
    expect(section.status(), await section.text()).toBe(200);
    const body = await section.json();
    expect(body.can.knowledgeWrite).toBe(true);
    expect(body.governance.knowledge.some((item: { id: string }) => item.id === row.id)).toBe(true);
  } finally {
    await db.knowledgeBaseEntry.deleteMany({ where: { id: { in: knowledgeIds } } });
    await db.businessRoleAssignment.deleteMany({ where: { userId: { in: userIds } } });
    await db.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    if (!oldUnit) await db.businessUnit.delete({ where: { id: unit.id } });
    await db.$disconnect();
  }
});
