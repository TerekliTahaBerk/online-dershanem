import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAdminOrders, parseAdminOrder } from './admin-orders';
const summary = { id: 'o', packageName: 'Paket', status: 'PAID', provisioningStatus: 'MANUAL_REVIEW', totalCents: 10000, createdAt: '2026-10-12T09:00:00Z', customer: 'Öğrenci' };
test('sipariş listesi sürüm, para, tarih ve ödeme/erişim durumlarını doğrular', () => {
  const data = { contractVersion: 1, page: 1, pageCount: 1, total: 1, problemCount: 1, orders: [{ ...summary, products: [] }] };
  assert.equal(parseAdminOrders(data).ok, true);
  assert.equal(parseAdminOrders({ ...data, contractVersion: 2 }).ok, false);
  for (const patch of [{ totalCents: -1 }, { totalCents: 1.2 }, { status: 'SUCCEEDED' }, { provisioningStatus: 'PAID' }, { createdAt: 'dün' }]) assert.equal(parseAdminOrders({ ...data, orders: [{ ...summary, ...patch, products: [] }] }).ok, false);
});
test('sipariş detayı eksik sürüm ve bilinmeyen ürün durumunu reddeder; alıcı hassas bilgisi atılır', () => {
  const order = { ...summary, revision: 'r', canRetry: true, userId: null, studentProfileId: null, provisioningAttempts: 2, provisioningError: null, provisionedAt: null, onboarding: null, payments: [], lines: [], buyerInfo: { tc: 'secret' } };
  const result = parseAdminOrder({ contractVersion: 1, order }); assert.ok(result.ok); assert.equal('buyerInfo' in result.value.order, false);
  assert.equal(parseAdminOrder({ contractVersion: 1, order: { ...order, revision: undefined } }).ok, false);
  assert.equal(parseAdminOrder({ contractVersion: 1, order: { ...order, lines: [{ id: 'l', productName: 'P', status: 'BOGUS', error: null, attempts: 0 }] } }).ok, false);
});
