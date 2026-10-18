# Demo video script, draft 4

Two minutes, 1920×1080, 30 fps. Voiceover plus on-screen supers. The shop is Mind Coffee on Euclid Ave, Berkeley. Numbers in brackets like [measure] are guesses until we time the real thing. The drink is a cortado, $5.50 on Mind Coffee's Snackpass menu. Every figure below comes from `lib/pricing.ts` at that price: Stripe takes 46¢ (8.4%), Square takes 29¢, and the agent price at 5% off is $5.23.

## What the video has to do

**What's true:** a shop that lets AI agents order from it keeps the money a card network would have taken, and setting it up takes one link.

**What the viewer should feel:** "The whole $5.23 arrived." Card payments shrink on the way to the shop, and ours doesn't.

**How the form says it:** in the opening, the price ticks down as it passes through card fees. In the middle, the number $5.23 sits on exactly the same pixels while the picture cuts from the phone to the payment request, the signature, the block explorer and the shop's balance. Because the figure never moves or shrinks, the viewer sees the money arrive whole without anyone saying so.

## The system

| Element | Choice |
| --- | --- |
| Motif | The zigzag-edged ticket from our own UI (`components/ui/Ticket.tsx`). In the opening, the card fee tears a strip off it. Menu items land as tickets during import, the order prints as a ticket in the inbox, and the savings panel stacks up the strips the shop didn't lose. The end card is a ticket. |
| Still point | "$5.23" at frame centre, held through the trace in beat 5 |
| Colour | The product's white and ink. Teal `#00BCA8` only as light: the inbox glow, the held figure's underline, the end card mark |
| Type | Syne for the big figures and the end card, Cooper Hewitt for supers, at one size |
| Silence | Once, from the moment Instinct pays until the tablet chimes |
| Hard sync | The inbox chime and the tablet flipping to its new-order state on the same frame |
| Pronouns | The card networks take, then we built, then the shop gets paid, and the last line is "you" |

## Beat sheet

| Time | Picture | Voiceover | Sound |
| --- | --- | --- | --- |
| **1. The bite** 0:00–0:12 | B-roll at the counter: a card taps the reader, and the receipt printer pushes out a slip. A hand tears it off, and on the tear we cut to the same receipt as a graphic on white: one cortado, $5.50. A strip tears off its bottom edge, labelled "Stripe 2.9% + 30¢", and the total ticks down to $5.04. A second ticket beside it loses 29¢ to Square. | "Mind Coffee sells a cortado for five-fifty. When someone orders it online, Stripe keeps forty-six cents before the shop sees any of it." | Music starts sparse. A paper-tear sound on each strip. |
| **2. One link** 0:12–0:35 | Our home page. The owner pastes Mind Coffee's ordering page and presses import. The menu fills in item by item as tickets [real Context.dev call, speed-ramped through the wait]. The discount switch goes to 5%, and every price drops by the same share. Publish. Cut to the live storefront with its "demo, not affiliated" label. | "The Payments lets a small shop sell to AI agents. The owner pastes one link to their website. Context.dev reads the menu and prices from it." *(pause)* "They give agents five percent off and publish. The whole setup took [40] seconds." | Music builds by one layer per bar. |
| **3. The order** 0:35–0:58 | B-roll of a hand pulling out a phone in the café line, then cut to the screen recording. A text to Instinct: "Get me a cortado from Mind Coffee, pickup under Boris." Speed-ramp through Instinct opening the storefront, reading the menu and filling in the pickup name. Slow back to real time as its cursor reaches "Pay $5.23 from wallet." | "A customer texts Instinct, their AI assistant." *(Let the phone play.)* "AUSD is a stablecoin that's always worth one dollar. Instinct pays five twenty-three of it from the customer's wallet." | Music at full energy. |
| **4. The drop** 0:58–1:06 | Split screen, one unbroken real-time take. The phone sits on the left and the shop's tablet inbox on the right. Instinct taps pay and nothing moves for [3–4] seconds. Then the tablet chimes and fills with the new order ticket: "Boris, cortado, $5.23, paid." | None | **Music cuts out on the tap.** Room tone only, then the inbox chime as the hard sync. |
| **5. Follow the $5.23** 1:06–1:24 | "$5.23" holds at frame centre while the world behind it cuts on the beat, about 3 s per stop: the 402 response in a terminal (`402 Payment Required`, AUSD, base-sepolia, payTo); Instinct's signed ERC-3009 authorization; the facilitator's settlement log; the transfer on the Base Sepolia explorer; the shop's balance. A thin teal line under the figure fills as it travels. | "Here's what happened while the music was off. Our storefront answered Instinct with HTTP 402, Payment Required, and the price. Instinct signed a transfer with the customer's key. Our facilitator settled it on Base and paid the gas." *(beat)* "The customer paid less than the menu price. The shop still kept nineteen cents more than Stripe would have left it." | Music slams back on the chime's tail. Cuts land on the beat. |
| **6. The money** 1:24–1:42 | B-roll, about 3 s: the barista calls "Boris" and slides the cortado across the counter, next to the tablet that still shows the paid ticket. Then the savings panel, built from this week's real orders: what Stripe and Square would have charged, and the difference. The torn strips from beat 1 stack up beside it. Click withdraw. The on-chain transfer appears with its explorer link, then the bank step, labelled "simulated". | "The savings panel adds this up from real orders. Once a week, the owner presses withdraw. The AUSD goes to an off-ramp that pays dollars into their bank. In this demo the bank deposit is simulated, but the on-chain transfer is real." | Music steady. |
| **7. Your turn** 1:42–2:00 | Claude Desktop places the same order through our MCP server [4 s, sped up]. The `/shops` directory with Mind Coffee in it. Then the "The" montage (see [the-montage.md](the-montage.md)): "The" holds on one spot while the world behind it cuts from the 1776 Declaration to a newspaper on Mind Coffee's counter, speeding up as it goes. It lands on our own "The" in Syne, and "Payments" appears beside it on the downbeat. Hold the end card for 3 s with thepayments.vercel.app under it. | "Instinct isn't the only agent that can order. Claude can buy the same cortado through our MCP server." *(beat)* "If you run a shop, paste your link." The montage plays without voiceover. | A receipt printer's chatter speeds up with the cuts and stops dead. "Payments" lands on the downbeat, then the music fades to silence. |

The voiceover runs about 230 words. At a calm 2.5 words a second that's about 90 seconds of talking, which leaves room for the silence in beat 4 and the phone in beat 3.

## What to record, in this order

1. **Instinct takes (beat 3 and 4).** Several takes, because Instinct is slow and unpredictable. Screen-record the phone for beat 3. For beat 4, film the phone and the tablet together on the counter with one camera, locked off, in a take that runs from the tap to the chime.
2. **Claude via MCP (beat 7).** It's also the backup for beats 3 and 4 if Instinct misbehaves on the day.
3. **Onboarding (beat 2).** A screen recording of a fresh import of Mind Coffee, at 2× scale for crisp text.
4. **The trace (beat 5).** Screenshots of the real 402 response, the signed authorization, the facilitator log and the explorer page for the same transaction as beat 4. Track B can give us the log lines.
5. **Savings and withdraw (beat 6).** A screen recording after a few test orders exist, so the panel isn't showing one order.

## B-roll at Mind Coffee

Ask whoever is running the counter before filming, and keep other customers' faces out of frame. Shoot 1080p or 4K at 30 fps, with the phone exposure locked so the light doesn't pump.

| Shot | Used in | How |
| --- | --- | --- |
| A card tapping the reader until it shows "Approved" | Beat 1 | Macro, handheld, 5 s. Three takes. |
| The receipt printing, then a hand tearing it off | Beat 1 | Macro on the printer slot. The tear is the cut into the graphic, so tear sideways, left to right. Record the tear sound up close as well. |
| A hand taking a phone out in the line | Beat 3 | Medium shot from behind the shoulder, 4 s |
| Phone and tablet side by side on the counter | Beat 4 | Locked off on a tripod, top-down or at 45°, with the tablet's sound on. One take from the tap to the chime, with no cut. |
| The barista calling "Boris" and handing over the cortado, tablet in frame | Beat 6 | Medium shot, 5 s. The cup in this shot is a real purchase, because the test-money order won't reach the café's real till. |
| Espresso pulling and milk steaming | Spare cutaways for beat 2 | Close, slow, 10 s each |
| 30 s of room tone with nobody talking near the mic | Beat 4's silence | The phone's mic is fine |

## Voiceover

One voice for the whole film reads best. Record in a closet or a car, with the phone 15 cm from the mouth, and read each beat as its own take so we can retime them. Read it like you're explaining it to a friend at the counter, not like an ad.

## Open questions

- **The import source.** Point the import at the Snackpass ordering page (order.snackpass.co/The-Mind-Coffee-63c72220b47597e7658e4e14), which has the prices; themindcoffee.com links its menu to Instagram. The Snackpass page loads its menu with JavaScript, so Track A should confirm Context.dev reads it before we film beat 2.
- Ask Mind Coffee before putting their name on a storefront we built, beyond the "demo, not affiliated" label. The same conversation covers filming at the counter.
- Is "nineteen cents more" right once the facilitator's gas is counted? It compares $5.23 against Stripe's $5.04 net, so check that the shop really receives the full $5.23. Against Square at the counter the shop comes out only 2¢ ahead, so the video compares with online orders on purpose.
- The fee figures come from third-party summaries. Check Stripe's and Square's own pricing pages before the opening goes on screen.
- Music: we need a licensed or royalty-free track at roughly 100–120 BPM with a clean break we can cut on.
