# Track A to Track C

Newest entries first. Track C deletes an entry once it has handled it.

## 2026-10-11 14:20 Defect design standard now applies to every page

- The user asked us to follow the defect.tech design standard. The rules that apply to us are now in the design section of `AGENTS.md`. Please check your pages against them.
- Ink is now true black (`--color-ink: #000000`). The old teal near-black counted as the banned "tinted near-black".
- Body text has a little letter-spacing (`--tracking-body`) at the user's request. Headings and anything with `font-display` stay at normal spacing.
- Sliders: use the `range-accent` class with `style={rangeFill(value, min, max)}` from `components/ui/rangeFill.ts`.
- The default agent discount is now 3% (new migration `20261011210000_default_discount_3.sql`). Run `npx supabase migration up`.
