# 0007 — Financial, purchase, order, and payment statuses remain separate

Status: Proposed

`FinancialStatus`, `PurchaseStatus`, `OdkOrderStatus`, and `OdkPaymentStatus` overlap on PENDING, PAID/ SUCCEEDED, FAILED, and REFUNDED. They represent ledger documents, intake purchases, customer orders, and provider payment attempts respectively.

Decision: keep separate. Their settlement, refund, cancellation, and reconciliation transitions are not interchangeable. Consolidation is a high-risk financial migration and requires separate approval.
