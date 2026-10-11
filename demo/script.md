# Demo video script, draft 1

Two minutes, 1920×1080, 30 fps. Voiceover plus on-screen supers. Numbers in brackets like [measure] are guesses until we time the real thing.

## What the video has to do

**What's true:** a shop that lets AI agents order from it keeps the money a card network would have taken, and setting it up takes one link.

**What the viewer should feel:** "The whole $4.75 arrived." Card payments shrink on the way to the shop, and ours doesn't.

**How the form says it:** in the opening, the price ticks down as it passes through card fees. In the middle, the number $4.75 sits on exactly the same pixels while the picture cuts from the phone to the payment request, the signature, the block explorer and the shop's balance. Because the figure never moves or shrinks, the viewer sees the money arrive whole without anyone saying so.

## The system

| Element | Choice |
| --- | --- |
| Motif | The zigzag-edged ticket from our own UI (`components/ui/Ticket.tsx`). In the opening, the card fee tears a strip off it. Menu items land as tickets during import, the order prints as a ticket in the inbox, and the savings panel stacks up the strips the shop didn't lose. The end card is a ticket. |
| Still point | "$4.75" at frame centre, held through the trace in beat 5 |
| Colour | The product's white and ink. Teal `#00BCA8` only as light: the inbox glow, the held figure's underline, the end card mark |
| Type | Syne for the big figures and the end card, Cooper Hewitt for supers, at one size |
| Silence | Once, from the moment Instinct pays until the tablet chimes |
| Hard sync | The inbox chime and the tablet flipping to its new-order state on the same frame |
| Pronouns | The card networks take, then we built, then the shop gets paid, and the last line is "you" |

## Beat sheet

| Time | Picture | Voiceover | Sound |
| --- | --- | --- | --- |
| **1. The bite** 0:00–0:12 | A paper ticket for one oat latte, $5.00, slides in on white. A strip tears off its bottom edge, labelled "Stripe 2.9% + 30¢", and the total ticks down to $4.55. A second ticket beside it loses 28¢ to Square. | "Ladle & Leaf sells a five-dollar latte. When someone orders it online, Stripe keeps forty-five cents before the shop sees any of it." | Music starts sparse. A paper-tear sound on each strip. |
| **2. One link** 0:12–0:35 | Our home page. The owner pastes ladleandleaf's URL and presses import. The menu fills in item by item as tickets [real Context.dev call, speed-ramped through the wait]. The discount switch goes to 5%, and every price drops by the same share. Publish. Cut to the live storefront with its "demo, not affiliated" label. | "The Payments lets a small shop sell to AI agents. The owner pastes one link to their website. Context.dev reads the menu and prices from it." *(pause)* "They give agents five percent off and publish. The whole setup took [40] seconds." | Music builds by one layer per bar. |
| **3. The order** 0:35–0:58 | A phone on a café counter, filmed for real. A text to Instinct: "Get me an oat latte from Ladle & Leaf, pickup under Boris." Speed-ramp through Instinct opening the storefront, reading the menu and filling in the pickup name. Slow back to real time as its cursor reaches "Pay $4.75 from wallet." | "A customer texts Instinct, their AI assistant." *(Let the phone play.)* "AUSD is a stablecoin that's always worth one dollar. Instinct pays four seventy-five of it from the customer's wallet." | Music at full energy. |
| **4. The drop** 0:58–1:06 | Split screen, one unbroken real-time take. The phone sits on the left and the shop's tablet inbox on the right. Instinct taps pay and nothing moves for [3–4] seconds. Then the tablet chimes and fills with the new order ticket: "Boris, oat latte, $4.75, paid." | None | **Music cuts out on the tap.** Room tone only, then the inbox chime as the hard sync. |
| **5. Follow the $4.75** 1:06–1:24 | "$4.75" holds at frame centre while the world behind it cuts on the beat, about 3 s per stop: the 402 response in a terminal (`402 Payment Required`, AUSD, base-sepolia, payTo); Instinct's signed ERC-3009 authorization; the facilitator's settlement log; the transfer on the Base Sepolia explorer; the shop's balance. A thin teal line under the figure fills as it travels. | "Here's what happened while the music was off. Our storefront answered Instinct with HTTP 402, Payment Required, and the price. Instinct signed a transfer with the customer's key. Our facilitator settled it on Base and paid the gas." *(beat)* "The customer paid less than the menu price. The shop still kept twenty cents more than Stripe would have left it." | Music slams back on the chime's tail. Cuts land on the beat. |
| **6. The money** 1:24–1:42 | The savings panel, built from this week's real orders: what Stripe and Square would have charged, and the difference. The torn strips from beat 1 stack up beside it. Click withdraw. The on-chain transfer appears with its explorer link, then the bank step, labelled "simulated". | "The savings panel adds this up from real orders. Once a week, the owner presses withdraw. The AUSD goes to an off-ramp that pays dollars into their bank. In this demo the bank deposit is simulated, but the on-chain transfer is real." | Music steady. |
| **7. Your turn** 1:42–2:00 | Claude Desktop places the same order through our MCP server [4 s, sped up]. The `/shops` directory with Ladle & Leaf in it. End card: a single ticket on white reading "The Payments" in Syne with thepayments.vercel.app under it. Hold for 3 s. | "Instinct isn't the only agent that can order. Claude can buy the same latte through our MCP server." *(beat)* "If you run a shop, paste your link." | Music resolves and fades to silence under the end card. |

The voiceover runs about 230 words. At a calm 2.5 words a second that's about 90 seconds of talking, which leaves room for the silence in beat 4 and the phone in beat 3.

## What to record, in this order

1. **Instinct takes (beat 3 and 4).** Several takes, because Instinct is slow and unpredictable. Film the phone and the tablet together on a real counter with one camera, locked off. A screen recording of the phone as a backup.
2. **Claude via MCP (beat 7).** This also becomes the whole of beats 3 and 4 if nobody gets an Instinct invite.
3. **Onboarding (beat 2).** A screen recording of a fresh import of Ladle & Leaf, at 2× scale for crisp text.
4. **The trace (beat 5).** Screenshots of the real 402 response, the signed authorization, the facilitator log and the explorer page for the same transaction as beat 4. Track B can give us the log lines.
5. **Savings and withdraw (beat 6).** A screen recording after a few test orders exist, so the panel isn't showing one order.

## Open questions

- Who has the Instinct invite? Beats 3 and 4 depend on it.
- Who reads the voiceover? A teammate in a quiet room is enough.
- Is "twenty cents more" right once the facilitator's gas is counted? It is $4.75 against Stripe's $4.55 net, so check that the shop really receives the full $4.75.
- The fee figures come from third-party summaries. Check Stripe's and Square's own pricing pages before the opening goes on screen.
- Music: we need a licensed or royalty-free track at roughly 100–120 BPM with a clean break we can cut on.
