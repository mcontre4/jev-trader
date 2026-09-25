# Sorno Marketing Site Revamp — Design

**Date:** 2026-07-30
**Scope:** `frontend/` — the public marketing site
**Status:** Approved design, pending implementation plan

---

## 1. Context

Sorno is a pre-product B2B platform: an AI operating system for repair, refurbishment, and
remanufacturing operations. The marketing site is the first thing a prospect sees while
researching the category.

### Current state

A single-page React/Vite/TS site with nine sections (hero, problem tabs, unified record
diagram, how-it-works, AI chat, traceability, use cases, integrations, pilot CTA). The
messaging is directionally right and the palette is appropriate. The execution is not.

### Problems with the current site

1. **Layout breaks.** The `.node-*` and `.system-*` elements in the unified-record and
   problem-visual sections are absolutely positioned at fixed offsets. They overlap each
   other and their containers at most viewport widths.
2. **The visuals decorate instead of demonstrate.** Abstract node diagrams and a static
   card mockup do not show a visitor what the product does or make them feel the pain.
3. **Messaging is abstract.** "Connects your systems, people, and operational data" does
   not land for a plant manager. Nothing in the hero proves domain fluency.
4. **Not credible.** Reads like vaporware because nothing concrete is shown.
5. **Unmaintainable source.** All React is compressed onto 33 lines of one-liner
   components; both stylesheets are minified to a single line. Iterating is painful.
6. **Dead conversion path.** Every CTA is an `href="#pilot"` anchor to a section with no
   form and no booking link.

### Constraints

- **Pre-product.** No customers, no working UI, no logos, no metrics, no testimonials.
  Every product visual is illustrative and must be built from realistic but fictional data.
  The site must not imply customers or capabilities that do not exist.
- Solo founder maintaining this. Low dependency count and readable code matter.

---

## 2. Goals and non-goals

### Goals

- A visitor understands **the pain** within ~10 seconds of landing.
- A visitor understands **what the product does** within ~60 seconds.
- The product feels real and specific enough to be worth a conversation.
- The layout is correct and polished at every viewport.
- The source is structured so the founder can edit copy and sections easily.

### Non-goals

- Backend, CMS, blog, analytics, or A/B testing.
- SEO beyond correct meta tags and semantic HTML.
- Multi-page site (revisit once there is industry-specific proof to put on subpages).
- A design-system package. This is one site.

---

## 3. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Vocabulary | "Unit" by default; "core" where remanufacturing is specifically the subject | Keeps repair/refurb visitors included while signalling domain fluency where it counts |
| Aesthetic | Keep the existing light palette and Manrope/DM Mono pairing; elevate craft | Reman buyers are conservative; a dark neon AI repaint would hurt trust. Differentiation comes from information design, not decoration |
| Scope | One long landing page | Pre-product with no SEO traction — a single ordered narrative beats fragmenting the story across subpages |
| Demo technique | Hand-built interactive React components | Navattic/Storylane/Arcade all record a *real* product, which does not exist yet. Hand-built means total control, no dependency, and doubles as a design prototype for the real app |
| Dependencies | No new runtime dependencies | CSS transitions plus two small local hooks cover the motion needs |
| CTA | Inline form **and** a calendar booking link | Form captures leads who are not ready to book; booking link removes friction for those who are |

---

## 4. Information architecture

Nine sections, in narrative order: hook → pain → product → intelligence → visibility →
relevance → fit → ask → footer.

### 4.1 Nav

Sticky, translucent. Wordmark, four anchors (Product, How it works, Who it's for, Contact),
and a primary CTA. Mobile: wordmark plus CTA only; anchors collapse.

### 4.2 Hero

Leads with the question the buyer actually asks, rather than a category description.

> # Where is unit R-1842?
>
> Answering that today means checking the ERP, opening the MES, finding the right
> spreadsheet, and asking whoever was on shift last night. Sorno unifies the systems you
> already run around every unit on your floor — so anyone gets the answer in seconds, with
> the evidence attached.

Primary CTA "Book a conversation", secondary "See how it works". Microcopy naming the
audience: repair, refurbishment, and remanufacturing operations.

Visual: a condensed, non-interactive unit summary card — a still frame that previews the
interactive record in §4.4 without competing with it.

### 4.3 The problem — *interactive demo #1*

Replaces the current four-tab problem section. Dramatizes fragmentation rather than
describing it.

**Behavior.** A row of five source chips: ERP, MES, Quality system, Shared drive, Shift
supervisor. The visitor clicks each and gets that system's answer to "Where is R-1842?"
Answers are deliberately partial, stale, and mutually contradictory:

| Source | Answer | Failure mode |
|---|---|---|
| ERP | "Status: In Repair. Last updated 2 days ago." | Stale |
| MES | "No repair operation has been started." | Contradicts the ERP |
| Quality system | "Hold QH-441 open, awaiting disposition." | Never propagated |
| Shared drive | "3 photos. `IMG_2481.jpg`. No context." | Unstructured |
| Shift supervisor | "Pretty sure it's waiting on a seal kit. Ask Elena." | Tribal knowledge |

Once the visitor has opened at least one — and always available via a button — a "Ask
Sorno instead" action collapses all five into one reconciled answer:

> **R-1842 is blocked on quality hold QH-441.** The hold was opened yesterday at 09:48 by
> Inspection. The unit is physically at Assembly, but no repair operation has started
> because seal kit P/N 4471-B is short. This blocks sales order 20784, promised Aug 14.
> Owner: Elena R.
>
> *The ERP and MES disagree on status. Sorno flagged the conflict.*

With source attribution chips beneath.

**Why this section exists.** It is the highest-leverage element on the page: it makes the
problem *felt* in seconds, and the reveal demonstrates the core value proposition in the
same interaction. It also directly showcases cross-system conflict detection, which is a
differentiator no ERP or MES offers.

### 4.4 The unit record — *interactive demo #2*

A full-width, application-shell mockup of a unit detail page. Five tabs, all clickable:

- **Timeline** — chronological events with actor, timestamp, and source system.
- **Inspection** — condition grade, findings, defect list, photo thumbnails.
- **Parts & lineage** — dynamic repair BOM: part number, new/used/recovered/repaired
  status, and source (including "recovered from core C-9920").
- **Quality** — open holds, nonconformance records, test results including a failure and
  its rework loop.
- **Documents** — inspection form, torque spec, test certificate, technician note.

Every row carries a small source-system badge, reinforcing that Sorno preserves lineage
rather than replacing the system of record.

**Why this section exists.** This is "what the product offers" made tangible. It is the
answer to "not credible enough."

### 4.5 Ask your operation — *interactive demo #3*

Four preset questions the visitor clicks:

- "Which units are blocked by missing parts?"
- "What's at risk of missing its promised date this week?"
- "Why has R-1842 been in inspection for three days?"
- "Has this failure happened before on this product family?"

The answer streams in with a typewriter effect, then reveals evidence chips naming the
source systems and record timestamps. At least one answer explicitly states a limitation
(for example, missing data or a stale record) to demonstrate that the assistant
communicates uncertainty rather than bluffing.

**Why this section exists.** It separates Sorno from "a chatbot over your documents." The
evidence chips and the stated uncertainty are the trust argument.

### 4.6 Lifecycle and bottleneck visibility

A horizontal pipeline of lifecycle stages — Intake, Inspection, Disposition, Disassembly,
Repair, Testing, Quality, Ready to ship — each showing a WIP count and the oldest item's
age. One stage is visibly the bottleneck. Hovering or focusing a stage reveals what is
stuck there and why.

This is where remanufacturing-specific language appears: core intake, disposition
decisions, harvested parts.

### 4.7 Who it's for

Four role cards. Each names the role and the specific question that role stops having to
chase:

- **Plant manager** — "Which orders are at risk this week, and why?"
- **Core / reverse-logistics manager** — "Do I have enough usable cores for next month?"
- **Quality manager** — "What's on hold, and what's the disposition?"
- **Customer service** — "When is unit R-1842 shipping, and what do I tell the customer?"

### 4.8 Works with your stack

Restates the positioning: Sorno is not an ERP replacement. Integration categories (ERP,
MES, QMS, WMS, inventory, spreadsheets, documents, internal tools) shown as neutral
category labels — **no vendor logos**, since no integrations are built and logos would
imply partnerships that do not exist.

### 4.9 Contact

Honest pre-product framing: Sorno is being built alongside a small number of repair and
remanufacturing operations. Two paths:

1. **Inline form** — name, work email, company, role, optional message. Client-side
   validation, clear error and success states, submits to a single configurable endpoint
   constant that the founder swaps for Formspree/Tally/a backend. Until then it resolves
   to a no-op that still shows the success state, and this is documented in code.
2. **Booking link** — a clearly-marked placeholder constant for a Cal.com/Calendly URL.

### 4.10 Footer

Wordmark, anchors, copyright. No fabricated social links.

---

## 5. Visual system

### Color

Keep the existing base (`--ink #0b1630`, `--teal #227c7b`, `--paper #f8f9fa`) and add a
status palette. The current palette has no way to express a problem — which is why the
demos would not read correctly without this addition.

| Token | Value | Use |
|---|---|---|
| `--status-ok` | `#067647` | Passed, complete, released |
| `--status-warn` | `#b45309` | At risk, aging, approaching deadline |
| `--status-blocked` | `#b42318` | Hold, shortage, failed test, conflict |
| `--status-idle` | `#536176` | Not started, unknown |

All status colors pair with a text label or icon — never color alone.

### Typography

Manrope (UI and headings) and DM Mono (identifiers, timestamps, source badges, kickers).
Monospace on IDs and timestamps is the main device that makes the demos feel like real
operational software. A fluid type scale replaces the current ad-hoc `clamp()` calls.

### Space, radius, elevation

A 4px spacing scale, three radius steps, and three elevation steps, all as tokens. The
current stylesheet uses arbitrary one-off values throughout.

### Layout

**All absolutely-positioned diagram nodes are removed.** The `.node-0`…`.node-7` and
`.system-0`…`.system-3` patterns are the direct cause of the overlapping reported by the
founder. Everything is rebuilt on grid and flex so it reflows correctly at every width.

### Motion

CSS transitions only, 150–250ms, `ease-out`. Section entrances via a small
`useInView` hook. Everything inside `@media (prefers-reduced-motion: reduce)` collapses to
instant, including the typewriter effect, which renders its full text immediately.

Motion is used to clarify cause and effect — a source chip revealing its answer, the five
answers collapsing into one — never as ambient decoration. Nothing moves that a visitor
did not cause.

### Craft details

These are the details that make a site read as considered rather than merely clean. Most
are invisible when present and obvious when missing.

**Typography**

- `text-wrap: balance` on headings, `text-wrap: pretty` on body copy — kills orphans and
  ragged last lines without manual `<br>` tags.
- Progressive letter-spacing: tighter as type gets larger (roughly `-0.03em` at display
  sizes, `0` at body). The current stylesheet applies a flat `-0.07em` everywhere, which
  is too tight on the smaller headings.
- `font-variant-numeric: tabular-nums` on every number in the demos. Counts, timestamps,
  ages, and part numbers stop shifting as values change. This is the single highest-impact
  detail for making operational data feel like real software.
- Measure capped at 60–70 characters on prose.

**Surfaces**

- Hairlines at 1px in a low-contrast neutral, not `#000` at low opacity — opacity-based
  borders muddy against tinted backgrounds.
- Layered shadows (two stops: a tight contact shadow plus a soft ambient one) rather than
  one large diffuse blur. Single-shadow cards are the most common tell of a template.
- Consistent corner radii by role: small for chips and badges, medium for cards, large for
  the application-shell mockups. Radii do not vary arbitrarily within a role.

**Interaction**

- `:focus-visible` rings styled deliberately, matched to the accent, never removed.
- All interactive targets at least 44×44px on touch.
- `scroll-margin-top` on every anchor target so the sticky nav does not cover the heading
  it just scrolled to — a near-universal miss on single-page sites.
- Custom `::selection` color drawn from the palette.
- `cursor` correctness: `pointer` only on genuinely clickable elements.
- Hover states never move layout. Transform and color only.

**Page-level**

- Real favicon and an SVG mark, plus Open Graph and Twitter card tags so shared links
  render properly. Currently the page has neither, which makes every shared link look
  broken.
- `<title>` and meta description rewritten to match the new positioning.
- Fonts loaded via `preconnect` + `display=swap` instead of a render-blocking `@import`.
- Semantic landmarks and one `<h1>`, with heading levels never skipped.
- `lang`, `theme-color`, and a canonical URL placeholder.

**Restraint**

No parallax, no scroll-jacking, no autoplaying carousels, no animated gradient meshes, no
cursor followers, no count-up number animations. The site should feel like it was built by
someone who ships operational software, not by a landing-page generator.

---

## 6. Technical structure

Each component owns one section and can be understood without reading the others. Demo
data lives entirely in `data/demo.ts` so copy edits never require touching component logic.

```
frontend/src/
  main.tsx                  entry only
  App.tsx                   section composition
  data/
    demo.ts                 all fictional demo content, single source
    site.ts                 nav links, CTA URLs, form endpoint constant
  hooks/
    useInView.ts            IntersectionObserver entrance animations
    useTypewriter.ts        streaming text, reduced-motion aware
  components/
    Nav.tsx
    Hero.tsx
    FragmentedAnswer.tsx    interactive demo #1
    UnitRecord.tsx          interactive demo #2
    AskSorno.tsx            interactive demo #3
    Pipeline.tsx
    Roles.tsx
    Integrations.tsx
    Contact.tsx             form + booking link
    Footer.tsx
    primitives/
      Button.tsx
      SourceBadge.tsx
      StatusPill.tsx
      SectionHeader.tsx
  styles/
    tokens.css              color, type, space, radius, elevation
    base.css                reset, typography, layout primitives
    sections/*.css          one stylesheet per section
```

Stylesheets are written expanded and readable. Vite minifies on build; the source does not
need to be pre-minified.

Fonts move from a render-blocking Google Fonts `@import` to `<link rel="preconnect">` plus
a stylesheet link with `display=swap`.

---

## 7. Accessibility

- Tab groups (§4.3, §4.4) use `role="tablist"` with roving tabindex and arrow-key
  navigation.
- The streaming answer region is an `aria-live="polite"` region that announces the
  completed text, not each character.
- Visible focus rings on every interactive element; no focus suppression.
- Body and UI text meet WCAG AA contrast. Status is never conveyed by color alone.
- Demo mockups are decorative-but-informative: each has an accessible summary so screen
  reader users get the point without traversing the fake UI.
- Full keyboard operability — no interaction requires hover.

---

## 8. Responsive

Mobile-first. Breakpoints at 640px, 900px, and 1200px.

- **Hero** — single column below 900px; summary card below the copy.
- **Fragmented answer** — source chips wrap into a two-column grid; answers stack.
- **Unit record** — tab bar becomes horizontally scrollable with edge fade; tables become
  stacked definition lists below 640px.
- **Pipeline** — horizontally scrollable with a scroll affordance; hover detail becomes
  tap-to-expand on touch.
- No horizontal page scroll at any width from 320px up.

---

## 9. Verification

- `npm run build` passes with no TypeScript errors.
- Manual pass at 375px, 768px, 1280px, and 1600px confirming no overlap and no horizontal
  page scroll.
- All three interactive demos operable by keyboard alone.
- `prefers-reduced-motion` honored (verified with the emulation setting on).
- No fabricated customer names, logos, testimonials, or metrics anywhere in the output.
- Every anchor link lands with its heading clear of the sticky nav.
- Open Graph tags present and favicon resolves (no 404 in the network panel).
- Focus ring visible on every interactive element when tabbing the full page.

---

## 10. Out of scope

Backend or real form delivery, analytics, CMS, blog, subpages, dark mode, i18n, and any
production deployment configuration.
