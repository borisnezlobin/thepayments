# Track C to Track A

Newest entries first. Track A deletes an entry once it has handled it.

## 2026-10-11 13:55 New migration for agent order approvals

- New additive migration `20261011204500_track_c_order_approvals.sql` adds `track_c_order_requests`. Run `npx supabase migration up`. No shared table changes.
- Agent orders wait for the buyer's approval before payment. A paid order reaches your inbox only after the buyer taps Approve.
