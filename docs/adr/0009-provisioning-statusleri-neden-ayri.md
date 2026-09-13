# 0009 — Provisioning and fulfillment statuses remain separate

Status: Proposed

`OdkProvisioningStatus`, `OdProvisioningStatus`, and `OrderLineFulfillmentStatus` share the automated pipeline states. OD additionally supports MANUAL_REVIEW; order-line fulfillment also supports REVOKED and is the cross-product orchestration record.

Decision: keep separate for now. The near-identical values merit a future design review, but merging them would alter active order/provisioning columns and must be handled in a human-approved migration PR.
