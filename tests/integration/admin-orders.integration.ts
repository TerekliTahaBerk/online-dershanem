import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma as db } from '@/lib/prisma';
import { adminOrderProjection, adminOrdersProjection } from '@/lib/panel/admin-orders-projection';
import { parseAdminOrder, parseAdminOrders } from '@/lib/mobile-contracts/admin-orders';
import { orderRetryRevision, OrderRetryConflict } from '@/lib/panel/order-retry-core';
import { claimAdminOrderRetry } from '@/lib/panel/order-retry-claim';
import { retryOrderProvisioningService } from '@/lib/panel/order-provisioning-service';
import { integration } from './integration-utils';
async function fixture() {
  const admin = await db.user.create({ data: { email: `p26-${randomUUID()}@example.com`, role: 'ADMIN', passwordHash: 'unused' } });
  const label = `P26-${randomUUID()}`;
  const orders = await Promise.all(Array.from({ length: 31 }, (_, i) => db.odOrder.create({ data: { packageName: label, status: i === 0 ? 'PENDING' : 'PAID', subtotalCents: 10000, totalCents: 10000, buyerInfo: { tc: 'P26_PRIVATE_BUYER' }, provisioningStatus: 'MANUAL_REVIEW' } })));
  const ids = orders.map((o) => o.id);
  const input = (o = orders[1]) => ({ actorUserId: admin.id, orderId: o.id, idempotencyKey: randomUUID(), expectedRevision: orderRetryRevision(o) });
  const claim = (o = orders[1]) => ({ actorUserId: admin.id, receiptKey: `p26-${randomUUID()}`, digest: 'digest', expectedRevision: orderRetryRevision(o) });
  async function clean() { await db.auditLog.deleteMany({ where: { actorUserId: admin.id } }); await db.odOnboardingTransition.deleteMany({ where: { onboarding: { orderId: { in: ids } } } }); await db.odOnboarding.deleteMany({ where: { orderId: { in: ids } } }); await db.odOrder.deleteMany({ where: { id: { in: ids } } }); await db.user.delete({ where: { id: admin.id } }); }
  return { admin, label, orders, ids, input, claim, clean };
}
integration('P2.6 ortak listede arama/sayfalama/sorun filtresi; detayda alıcı kişisel verileri taşınmaz', async () => {
  const f = await fixture(); try {
    const first = await adminOrdersProjection({ q: f.label }); const second = await adminOrdersProjection({ q: f.label, sayfa: '2' });
    assert.equal(parseAdminOrders(first).ok, true); assert.equal(first.total, 31); assert.equal(first.orders.length, 30); assert.equal(second.orders.length, 1);
    assert.equal(new Set([...first.orders, ...second.orders].map((o) => o.id)).size, 31);
    assert.equal((await adminOrdersProjection({ q: f.label, filtre: 'sorun' })).total, 30);
    const detail = await adminOrderProjection(f.orders[1].id); assert.ok(detail); assert.equal(parseAdminOrder(detail).ok, true); assert.equal(detail.order.canRetry, false); assert.equal(JSON.stringify(detail).includes('P26_PRIVATE_BUYER'), false);
    assert.equal(await adminOrderProjection('missing-p26'), null);
  } finally { await f.clean(); }
});
integration('P2.6 aynı sürüme yarışan iki işlemden biri sahiplenir, tek audit; kayıt hatası sahiplenmeyi geri alır', async () => {
  const f = await fixture(); try {
    const o = f.orders[1]; const results = await Promise.allSettled([claimAdminOrderRetry('OD', o.id, f.claim()), claimAdminOrderRetry('OD', o.id, f.claim())]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1); assert.equal(await db.auditLog.count({ where: { actorUserId: f.admin.id } }), 1);
    assert.equal((await db.odOrder.findUniqueOrThrow({ where: { id: o.id } })).provisioningAttempts, 1);
    const other = f.orders[2], receipt = f.claim(other); receipt.receiptKey = (await db.auditLog.findFirstOrThrow({ where: { actorUserId: f.admin.id } })).idempotencyKey!;
    await assert.rejects(claimAdminOrderRetry('OD', other.id, receipt)); assert.equal((await db.odOrder.findUniqueOrThrow({ where: { id: other.id } })).provisioningAttempts, 0);
    await assert.rejects(claimAdminOrderRetry('OD', f.orders[0].id, f.claim(f.orders[0])), OrderRetryConflict);
  } finally { await f.clean(); }
});
integration('P2.6 başarısız provizyonun aynı anahtarla sonucu tekrar okunur; yeni eski sürüm ve farklı anahtar içeriği reddedilir', async () => {
  const f = await fixture(); try {
    const input = f.input(); await db.odOnboarding.create({ data: { orderId: input.orderId } }); const result = await retryOrderProvisioningService(input); assert.ok(result.found); assert.match(result.outcome, /manual_review:|error:/);
    assert.deepEqual(await retryOrderProvisioningService(input), result);
    assert.equal((await db.odOrder.findUniqueOrThrow({ where: { id: input.orderId } })).provisioningAttempts, 1);
    assert.equal(await db.auditLog.count({ where: { actorUserId: f.admin.id } }), 1);
    await assert.rejects(retryOrderProvisioningService({ ...input, idempotencyKey: randomUUID() }), OrderRetryConflict);
    await assert.rejects(retryOrderProvisioningService({ ...input, orderId: f.orders[2].id }), (e) => e instanceof OrderRetryConflict && e.code === 'IDEMPOTENCY_REUSE');
    assert.equal((await db.odOrder.findUniqueOrThrow({ where: { id: input.orderId } })).status, 'PAID');
  } finally { await f.clean(); }
});
integration('P2.6 başarıyla erişim açılır; aynı istek üyelik/iletişim üretimini tekrarlamaz', async () => {
  const f = await fixture(); const student = await db.user.create({ data: { email: `p26-student-${randomUUID()}@example.com`, role: 'STUDENT', passwordHash: 'unused', mustChangePassword: false } });
  try {
    const order = await db.odOrder.update({ where: { id: f.orders[1].id }, data: { userId: student.id, buyerInfo: { studentEmail: student.email }, onboarding: { create: {} } } });
    const input = f.input(order); const result = await retryOrderProvisioningService(input); assert.ok(result.found); assert.equal(result.outcome, 'succeeded'); assert.equal(result.userId, student.id);
    const outboxCount = await db.emailOutbox.count({ where: { recipients: { contains: student.email } } });
    assert.deepEqual(await retryOrderProvisioningService(input), result);
    assert.equal(await db.productMembership.count({ where: { userId: student.id, product: 'OD' } }), 1);
    assert.equal(await db.emailOutbox.count({ where: { recipients: { contains: student.email } } }), outboxCount);
    assert.equal((await db.odOrder.findUniqueOrThrow({ where: { id: order.id } })).provisioningAttempts, 1);
  } finally {
    await db.emailOutbox.deleteMany({ where: { recipients: { contains: student.email } } }); await db.auditLog.deleteMany({ where: { entityId: { in: f.ids } } });
    await db.productMembership.deleteMany({ where: { userId: student.id } }); await db.studentProfile.deleteMany({ where: { userId: student.id } }); await f.clean(); await db.user.delete({ where: { id: student.id } });
  }
});
integration('P2.6 Deneme Ligi provizyonu aynı sahiplenme ve tekrar makbuzu üzerinden çalışır', async () => {
  const f = await fixture(); const pkg = await db.odkPackage.create({ data: { title: 'P26 ODK', slug: `p26-${randomUUID()}`, priceCents: 10000 } });
  const order = await db.odkOrder.create({ data: { packageId: pkg.id, status: 'PAID', subtotalCents: 10000, totalCents: 10000 } });
  try {
    const input = { actorUserId: f.admin.id, orderId: order.id, idempotencyKey: randomUUID(), expectedRevision: orderRetryRevision(order) };
    const first = await retryOrderProvisioningService(input); assert.ok(first.found); assert.match(first.outcome, /error:/); assert.deepEqual(await retryOrderProvisioningService(input), first);
    assert.equal((await db.odkOrder.findUniqueOrThrow({ where: { id: order.id } })).provisioningAttempts, 1);
    await assert.rejects(retryOrderProvisioningService({ ...input, idempotencyKey: randomUUID() }), OrderRetryConflict);
  } finally { await db.odkOrder.delete({ where: { id: order.id } }); await db.odkPackage.delete({ where: { id: pkg.id } }); await f.clean(); }
});
