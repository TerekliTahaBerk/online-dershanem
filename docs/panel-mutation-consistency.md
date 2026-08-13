# Panel mutation consistency

Panel mutations use the mutation response as the authoritative client commit. `router.refresh()` is a background reconciliation step; it is never the only mechanism that makes a successful change visible.

## Required pattern

1. Lock the affected form or row before sending the request. Re-entry while locked is a no-op.
2. Validate ownership, version/idempotency and write the transaction on the server.
3. Return the resulting record, status, version, or stable identifier needed to render the result.
4. Apply that response to local state before showing success UI.
5. Call `router.refresh()` after the local commit when other server-component regions may also depend on the write.
6. On failure, retain the previous visible state, unlock the control, and show an actionable error.

For offline-capable writes, queued input is shown optimistically and the replay event carries both the authoritative response and original request. Conflicts do not overwrite local state.

## Inventory and ownership

| Area | Visible convergence | Server boundary |
| --- | --- | --- |
| Users and access | Returned status/version or controlled form state; rows update locally | User, product, profile, accessibility APIs |
| Students | Returned check-in/help/progress state; offline replay event | Check-in, help feedback, assignment progress APIs |
| Teachers | Returned draft/review/help/material state; collections update locally | AI draft, rubric review, help response, material APIs |
| Notifications | Optimistic read marker after successful response; controlled preferences | Notification read/preferences APIs |
| Materials | Created material payload is inserted; archive state is replaced | Material create/upload/archive APIs |
| Operations | Server actions invalidate the owning panel layout/path | Business server actions and explicit `revalidatePath` |

Do not add `page.reload()` to compensate for a mutation race. E2E tests should assert the same in-place state transition a user sees, including disabled controls on narrow viewports and while responses are delayed.
