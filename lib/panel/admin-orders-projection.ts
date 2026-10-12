import "server-only";
import type { AdminOrders, AdminOrder } from "@/lib/mobile-contracts/admin-orders";
import { OD_ONBOARDING_LABELS, OD_ONBOARDING_NEXT_ACTION } from "@/lib/od/onboarding-state";
import { loadAdminOrders, loadAdminOrder } from "./admin-orders-server";
import { orderRetryRevision } from "./order-retry-core";
const customer = (user: { fullName: string | null; email: string } | null) => user?.fullName || user?.email || "Hesaba bağlanmadı";
export async function adminOrdersProjection(input: Parameters<typeof loadAdminOrders>[0]): Promise<AdminOrders> {
  const data = await loadAdminOrders(input);
  return { contractVersion: 1, page: data.page, pageCount: data.pageCount, total: data.total, problemCount: data.problemCount, orders: data.orders.map((o) => ({ id: o.id, packageName: o.packageName, status: o.status, provisioningStatus: o.provisioningStatus, totalCents: o.totalCents, createdAt: o.createdAt.toISOString(), customer: customer(o.user), products: o.lines.map((l) => l.productName) })) };
}
export async function adminOrderProjection(id: string): Promise<{ contractVersion: 1; order: AdminOrder } | null> {
  const o = await loadAdminOrder(id);
  if (!o) return null;
  return { contractVersion: 1, order: {
    id: o.id, packageName: o.packageName, status: o.status, provisioningStatus: o.provisioningStatus, totalCents: o.totalCents, createdAt: o.createdAt.toISOString(), customer: customer(o.user), revision: orderRetryRevision(o), canRetry: o.status === "PAID" && o.provisioningStatus !== "SUCCEEDED" && Boolean(o.user) && (o.provisioningStatus !== "RUNNING" || o.updatedAt.getTime() < Date.now() - 5 * 60_000), userId: o.user?.id ?? null, studentProfileId: o.user?.studentProfile?.id ?? null,
    provisioningAttempts: o.provisioningAttempts, provisioningError: o.provisioningError, provisionedAt: o.provisionedAt?.toISOString() ?? null,
    onboarding: o.onboarding ? { label: OD_ONBOARDING_LABELS[o.onboarding.state], nextAction: OD_ONBOARDING_NEXT_ACTION[o.onboarding.state], owner: o.onboarding.owner ? customer(o.onboarding.owner) : null, dueAt: o.onboarding.dueAt?.toISOString() ?? null } : null,
    payments: o.payments.map((p) => ({ ...p, paidAt: p.paidAt?.toISOString() ?? null })), lines: o.lines.map((l) => ({ id: l.id, productName: l.productName, status: l.fulfillmentStatus, error: l.fulfillmentError, attempts: l.fulfillmentAttempts })),
  } };
}
