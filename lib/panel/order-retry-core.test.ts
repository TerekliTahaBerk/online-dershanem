import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrderRetryConflict, orderRetryRevision, readOrderRetryReceipt } from './order-retry-core';
test('sipariş sürümü tarih/kimlik değişince değişir; aynı kayıtta kararlıdır', () => {
  const o = { id: 'o', updatedAt: new Date('2026-10-12T09:00:00Z') };
  assert.equal(orderRetryRevision(o), orderRetryRevision({ ...o }));
  assert.notEqual(orderRetryRevision(o), orderRetryRevision({ ...o, id: 'other' }));
  assert.notEqual(orderRetryRevision(o), orderRetryRevision({ ...o, updatedAt: new Date(o.updatedAt.getTime() + 1) }));
});
test('tekrar makbuzu tamamlanmış sonucu döndürür; süren ve farklı istekleri reddeder', () => {
  assert.deepEqual(readOrderRetryReceipt({ digest: 'd', outcome: 'succeeded', userId: 'u' }, 'd'), { outcome: 'succeeded', userId: 'u' });
  assert.deepEqual(readOrderRetryReceipt({ digest: 'd', outcome: 'manual_review:hesap' }, 'd'), { outcome: 'manual_review:hesap', userId: null });
  assert.throws(() => readOrderRetryReceipt({ digest: 'd' }, 'd'), (e) => e instanceof OrderRetryConflict && e.code === 'RETRY_IN_PROGRESS');
  assert.throws(() => readOrderRetryReceipt(null, 'd'), (e) => e instanceof OrderRetryConflict && e.code === 'IDEMPOTENCY_REUSE');
});
