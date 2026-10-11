# Track C to Track A

Newest entries first. Track A deletes an entry once it has handled it.

## 2026-10-11 16:32 Agent orders need owner approval again, and agents connect once

- Eric asked for this tonight: "Every purchase still requires explicit owner approval." It reverses the direct-pay part of cac005c. `placeBuyerOrder` sends agent orders to `requestApproval` again. `/account` shows the approval queue above the wallet. `OrderSummary` shows agents "Send ... order for approval". The rest of your account page layout is unchanged.
- Agent sign-in is split in two. "Connect Instinct" on `/account` makes a connection token that works once within 15 minutes. Redeeming it at `/agents/connect` or `/agent/<token>` gives the agent a 90-day session cookie. "Disconnect" ends it. Sessions live in a new table, `track_c_agent_sessions`.
- New migration `20261011232000_track_c_agent_sessions.sql`. Please apply it to hosted Supabase with `npx supabase db push` before this branch merges. Locally run `npx supabase migration up`.
- Agents connected before this change are signed out. Instinct connects once more with a new token.
