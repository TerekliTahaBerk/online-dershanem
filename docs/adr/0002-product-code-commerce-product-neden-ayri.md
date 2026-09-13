# 0002 — Product access, sales, and coupon scopes remain separate

Status: Proposed

`ProductCode` is used by access/membership and cross-product evidence. `CommerceProduct` is the order-line product discriminator, while `CouponService` also has the aggregate `ALL` scope. Existing finance/provisioning branches assume the commerce-specific contract.

Decision: keep `ProductCode`, `CommerceProduct`, and `CouponService` separate. A consolidation would couple entitlement, fulfillment, and discount semantics and requires a separately approved migration and code audit.
