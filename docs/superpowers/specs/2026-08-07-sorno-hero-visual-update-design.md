# Sorno hero visual update — design

## Goal

Replace the current hero product visual on the Sorno landing page with a polished,
realistic product interface that demonstrates Sorno as the intelligence layer for
remanufacturing/refurbishment operations — for both operations teams and frontline
technicians. Everything else in the hero (headline, subhead, nav, CTAs, branding,
layout proportions) stays as-is.

## Scope

In scope: the `<aside className="hero-card">` block in
`frontend/src/components/Hero.tsx` and its supporting styles/data.

Out of scope: `hero-copy` (headline/subhead/CTAs), `Nav`, any other section of the
page, and any styling not needed to fit the new visual.

## Layout

Keep the existing `.hero-inner` two-column grid (`1.05fr 0.95fr`, stacking at
`900px` as today). The new visual replaces the `hero-card` aside 1:1 in that grid
cell and is free to grow taller than the current card to fit its content — the
column width and copy column stay as they are.

## Component structure

- `frontend/src/components/HeroVisual.tsx` — new component, replaces
  `<aside className="hero-card">` in `Hero.tsx`.
- `frontend/src/components/HeroVisual.test.tsx` — behavioral tests.
- `frontend/src/styles/sections/hero-visual.css` — new stylesheet for this
  component, imported by `HeroVisual.tsx`.
- `frontend/src/styles/sections/hero.css` — trimmed to keep only `.hero`,
  `.hero-inner`, `.hero-copy`, `.hero-actions` (and the `900px` stack rule); the
  now-unused `.hero-card*` rules are deleted.
- New data in `frontend/src/data/demo.ts` (existing convention: one shared demo
  data file), described below.

### Data

```ts
export type RiskTone = 'blocked' | 'warn' // reuses StatusTone

export const HERO_OPERATIONS = {
  question: 'Which units are at risk of missing their ship date this week?',
  stat: '3 units at risk',
  units: [
    { id: '#2841', tone: 'blocked', title: 'On quality hold after final inspection.',
      detail: 'Shaft runout exceeds tolerance.' },
    { id: '#2917', tone: 'blocked', title: 'Waiting for replacement bearing BR-482.',
      detail: 'Expected Thursday.' },
    { id: '#2876', tone: 'warn', title: 'Teardown revealed additional housing damage',
      detail: 'not identified during intake.' },
  ],
  recommendation:
    'Prioritize bearing procurement for #2917 and route #2876 to secondary inspection.',
  sources: ['ERP', 'Work Orders', 'Inspection Records', 'Inventory', 'Quality'],
}

export const HERO_TECHNICIAN = {
  question: 'Unit #2841 failed final test with excessive vibration. What should I check?',
  checks: [
    'Measure shaft runout — maximum 0.003"',
    'Inspect coupling alignment',
    'Verify bearing preload',
    'Check the bearing seat for housing wear',
  ],
  documentation: [
    'OEM Service Manual §7.4',
    'Service Bulletin SB-114',
    'Internal Rebuild SOP #23',
  ],
  diagramHighlight: 'bearing-seat', // which SVG part gets the highlight
  similarRepair: {
    unit: '#2197',
    text: 'Unit #2197 had the same test result. Root cause was an out-of-spec coupling.',
  },
  sources: ['OEM Manual', 'Service Bulletin', 'Internal SOP', 'Repair History'],
}
```

`tone` values reuse the existing `StatusTone`/`StatusPill` vocabulary
(`blocked` = high risk, `warn` = medium risk), so risk indicators look and read
consistently with the rest of the site.

### Visual structure

Window chrome bar, same pattern as `ask-chrome`/`frag-chrome`:
`Sorno` brand · `Operations | Technician` tab pair (`role="tablist"`, roving-tab
keyboard nav via the existing `useRovingTabs` hook) · a `StatusPill` showing
`Live`.

**Operations panel** (in reveal order): question line → stat line
("3 units at risk") → 3 risk cards (id badge, `StatusPill` for tone, title,
detail) → recommendation callout ("Recommended action") → source badges row.

**Technician panel** (in reveal order): question line → "Recommended checks"
numbered list (4 items) → inline SVG schematic with the relevant part
highlighted in teal → "Relevant documentation" list (3 items) → "Similar
previous repair" callout → source badges row.

The SVG schematic is a small, custom, hand-drawn line-art diagram (ink/teal
palette, consistent with the brand) built inline in the component — no new
image assets. It renders once the "Recommended checks" section finishes.

## Animation

Reuses the codebase's existing chained-`useTypewriter` cascade pattern (see
`SornoAnswer` in `FragmentedAnswer.tsx` and the per-turn reveal in
`AskSorno.tsx`) rather than a new animation mechanism. Each field types out
character-by-character with a blinking caret; the next field starts only once
the previous one's `done` flag is true. Source badges appear as a group once
the last text field finishes (they don't type).

**Operations cascade:** question → stat line → card 1 (title, then detail) →
card 2 → card 3 → recommendation → sources.

**Technician cascade:** question → check 1 → check 2 → check 3 → check 4 →
schematic fades in → doc line 1 → doc line 2 → doc line 3 → similar-repair note
→ sources.

Text is kept short per field (a risk-card detail is one sentence, a check is
one line) so the full cascade stays quick — this is not a paragraph typing out,
it's several short structured fields typing in sequence, matching how the rest
of the page's "Sorno" chat panels already behave.

**Orchestration** (new local state in `HeroVisual.tsx`, modeled on the
`ask`/`asked`/`userSelected` pattern already in `AskSorno.tsx` — not
`useChatReplay` itself, since that hook is shaped for a linear list of chat
turns, not two independently-selectable structured panels):

- On mount, the Operations cascade auto-plays once the hero is in view (reuse
  `useInView`).
- Once Operations finishes and has been visible for a few seconds, auto-switch
  to Technician once and play its cascade — unless the visitor has already
  clicked a tab themselves (`userSelected` flag), which permanently cancels all
  further auto behavior, exactly as `AskSorno` does today.
- Manual tab clicks always work immediately, set `userSelected`, and replay
  that tab's cascade from the top.
- `prefers-reduced-motion` (via the existing `usePrefersReducedMotion` hook):
  whichever tab is active renders its fully-revealed final state immediately,
  no typing, no auto tab-switch. Manual tab switching still works, just
  without motion.

## Responsive behavior

Below `900px` (existing breakpoint), the two-column grid already stacks as
today. On small screens, simplify rather than shrink:
- Operations: show at most the top 2 risk cards.
- Technician: show at most the top 2 checks and omit the schematic.
Both panels keep the recommendation/similar-repair callout and the sources row
at every size, since those are single short lines.

## Testing

Vitest + Testing Library, following the patterns already in
`UnitRecord.test.tsx` (tab switching, roving-tab keyboard nav, default tab) and
`AskSorno.test.tsx` (fake-timer-driven cascade assertions):

- Operations is the default/selected tab on render.
- Operations cascade reveals question, stat, all 3 units, recommendation, and
  sources after the cascade completes (fake timers).
- Clicking the Technician tab switches panels and reveals its content on
  completion; clicking back to Operations replays it.
- Arrow-key roving-tab navigation moves focus/selection between the two tabs.
- Manual tab selection prevents the automatic Operations → Technician
  auto-switch from later overriding the visitor's choice.
- Under `prefers-reduced-motion`, the active panel's full content is present
  immediately without advancing fake timers.

## Out of scope / explicitly not doing

- No free-text input — this remains a scripted demo, same as `AskSorno`'s
  composer.
- No changes to `hero-copy`, `Nav`, CTAs, or any other page section.
- No new image assets; the schematic is inline SVG.
- No continuous looping/carousel between Operations and Technician — the
  auto-switch to Technician happens at most once per page load.
