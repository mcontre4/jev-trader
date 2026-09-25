# Sorno Marketing Site Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Sorno marketing page as a single polished landing page whose pain and product story are understood in under a minute, carried by three hand-built interactive product demos.

**Architecture:** React + Vite + TypeScript single-page site. The current 33-line minified `main.tsx` is decomposed into one component per section, each owning a stylesheet. All demo content lives in `data/demo.ts` so copy edits never touch component logic. Interaction logic that appears more than once (roving tablist keyboard nav, scroll entrance, typewriter) is extracted into tested hooks. No absolutely-positioned layout anywhere — everything is grid and flex.

**Tech Stack:** React 19, Vite 8, TypeScript, plain CSS with custom properties. Vitest + @testing-library/react as dev dependencies for the interactive components. No new runtime dependencies.

**Reference spec:** `docs/superpowers/specs/2026-07-30-marketing-site-revamp-design.md`

---

## Scope note on code in this plan

This plan gives complete code for everything with real logic: hooks, tests, tokens, data
contracts, and the three interactive demos. For purely presentational sections it gives
the complete component structure, content, and layout rules but does not transcribe every
decorative CSS declaration — those are written to the token system and the craft rules in
spec §5. This is deliberate: transcribing ~1500 lines of presentational CSS into the plan
and again into the source doubles the work and desynchronizes the moment either changes.

---

## File structure

**Created**

| File | Responsibility |
|---|---|
| `src/App.tsx` | Section composition only |
| `src/data/demo.ts` | All fictional demo content — units, sources, answers, parts, events |
| `src/data/site.ts` | Nav links, CTA URLs, form endpoint constant |
| `src/hooks/useInView.ts` | IntersectionObserver entrance trigger |
| `src/hooks/useTypewriter.ts` | Streaming text + `usePrefersReducedMotion` |
| `src/hooks/useRovingTabs.ts` | Arrow/Home/End keyboard nav for tablists |
| `src/components/primitives/Button.tsx` | Link and submit button variants |
| `src/components/primitives/StatusPill.tsx` | Status with color + always a text label |
| `src/components/primitives/SourceBadge.tsx` | Mono source-system attribution chip |
| `src/components/primitives/SectionHeader.tsx` | Kicker + heading + lead |
| `src/components/Nav.tsx` | Sticky nav |
| `src/components/Hero.tsx` | Hero + static summary card |
| `src/components/FragmentedAnswer.tsx` | **Interactive demo #1** |
| `src/components/UnitRecord.tsx` | **Interactive demo #2** |
| `src/components/AskSorno.tsx` | **Interactive demo #3** |
| `src/components/Pipeline.tsx` | Lifecycle + bottleneck view |
| `src/components/Roles.tsx` | Who it's for |
| `src/components/Integrations.tsx` | Works with your stack |
| `src/components/Contact.tsx` | Form + booking link |
| `src/components/Footer.tsx` | Footer |
| `src/styles/tokens.css` | Color, type, space, radius, elevation, motion |
| `src/styles/base.css` | Reset, typography, layout primitives, focus, selection |
| `src/styles/sections/*.css` | One per section |
| `public/favicon.svg` | Mark |
| `vitest.config.ts`, `src/test/setup.ts` | Test harness |

**Modified**

| File | Change |
|---|---|
| `src/main.tsx` | Reduced to entry point only |
| `index.html` | Meta, OG/Twitter tags, favicon, font preconnect |
| `package.json` | Dev deps + `test` script |

**Deleted**

`src/styles.css`, `src/problem.css` — replaced by `styles/`.

---

## Task 0: Commit the existing frontend as a baseline

The entire `frontend/` directory is currently untracked, so without this the revamp's diff
would be indistinguishable from the initial import of the site.

- [ ] **Step 1: Confirm the gitignore is working**

Run: `git status --porcelain --untracked-files=all frontend/ | grep -c node_modules`
Expected: `0`.

- [ ] **Step 2: Commit the current site as-is**

```bash
git add frontend/
git commit -m "chore: commit existing marketing site as revamp baseline"
```

- [ ] **Step 3: Verify a clean tree**

Run: `git status --porcelain frontend/`
Expected: empty output.

---

## Task 1: Test harness

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`

- [ ] **Step 1: Install dev dependencies**

```bash
cd frontend && npm i -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create `frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 3: Create `frontend/src/test/setup.ts`**

`matchMedia` is not implemented in jsdom and every reduced-motion code path calls it, so it
must be stubbed here or the whole suite throws.

```ts
import '@testing-library/jest-dom/vitest'

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
    root = null
    rootMargin = ''
    thresholds = []
  } as unknown as typeof IntersectionObserver
}
```

- [ ] **Step 4: Add the test script to `package.json`**

Add to `"scripts"`: `"test": "vitest run"` and `"test:watch": "vitest"`.

- [ ] **Step 5: Verify the harness runs**

Run: `npm test`
Expected: exits 0 with "No test files found" (no tests exist yet).

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/test/setup.ts
git commit -m "test: add vitest + testing-library harness"
```

---

## Task 2: Design tokens and base styles

**Files:**
- Create: `frontend/src/styles/tokens.css`, `frontend/src/styles/base.css`
- Delete: `frontend/src/styles.css`, `frontend/src/problem.css`

- [ ] **Step 1: Create `frontend/src/styles/tokens.css`**

```css
:root {
  /* ---- Color: base ---- */
  --ink: #0b1630;
  --ink-2: #1c2b4a;
  --slate: #536176;
  --slate-2: #7e899a;
  --paper: #f8f9fa;
  --surface: #ffffff;
  --surface-sunken: #f1f4f6;
  --line: #dce2e8;
  --line-strong: #c3ccd6;

  /* ---- Color: accent ---- */
  --teal: #227c7b;
  --teal-hover: #176968;
  --teal-soft: #eef5f5;

  /* ---- Color: status (never used without a text label) ---- */
  --status-ok: #067647;
  --status-ok-soft: #e7f6ee;
  --status-warn: #b45309;
  --status-warn-soft: #fdf3e7;
  --status-blocked: #b42318;
  --status-blocked-soft: #fdeceb;
  --status-idle: #536176;
  --status-idle-soft: #eef0f3;

  /* ---- Type ---- */
  --font-sans: Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'DM Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-base: 0.9375rem;
  --text-md: 1.0625rem;
  --text-lg: clamp(1.25rem, 1.6vw, 1.5rem);
  --text-xl: clamp(1.75rem, 2.6vw, 2.25rem);
  --text-2xl: clamp(2.25rem, 4vw, 3.25rem);
  --text-3xl: clamp(2.75rem, 5.4vw, 4.5rem);

  /* Progressive tracking: tighter as type gets larger */
  --tracking-display: -0.035em;
  --tracking-heading: -0.02em;
  --tracking-body: 0;
  --tracking-mono: 0.06em;

  /* ---- Space: 4px scale ---- */
  --s-1: 4px;  --s-2: 8px;   --s-3: 12px;  --s-4: 16px;  --s-5: 24px;
  --s-6: 32px; --s-7: 48px;  --s-8: 64px;  --s-9: 96px;  --s-10: 128px;

  --gutter: clamp(20px, 5vw, 80px);
  --maxw: 1240px;
  --nav-h: 68px;

  /* ---- Radius ---- */
  --r-sm: 5px;
  --r-md: 10px;
  --r-lg: 16px;
  --r-pill: 999px;

  /* ---- Elevation: layered, contact + ambient ---- */
  --e-1: 0 1px 2px rgba(11, 22, 48, 0.06), 0 1px 3px rgba(11, 22, 48, 0.05);
  --e-2: 0 2px 4px rgba(11, 22, 48, 0.05), 0 8px 20px rgba(11, 22, 48, 0.07);
  --e-3: 0 4px 8px rgba(11, 22, 48, 0.05), 0 20px 48px rgba(11, 22, 48, 0.11);

  /* ---- Motion ---- */
  --dur-1: 140ms;
  --dur-2: 220ms;
  --ease: cubic-bezier(0.2, 0.7, 0.3, 1);
}
```

- [ ] **Step 2: Create `frontend/src/styles/base.css`**

Must include, in this order:

```css
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--ink);
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
a { color: inherit; text-decoration: none; }
img, svg { max-width: 100%; display: block; }

/* Headings: balance kills orphans without manual <br> */
h1, h2, h3 { margin: 0; text-wrap: balance; line-height: 1.06; }
h1 { font-size: var(--text-3xl); letter-spacing: var(--tracking-display); }
h2 { font-size: var(--text-2xl); letter-spacing: var(--tracking-display); }
h3 { font-size: var(--text-lg); letter-spacing: var(--tracking-heading); }
p  { margin: 0; text-wrap: pretty; line-height: 1.62; }

/* Every number in the demos must not jitter as values change */
.tnum, table, dl, time { font-variant-numeric: tabular-nums; }

.mono {
  font-family: var(--font-mono);
  letter-spacing: var(--tracking-mono);
  font-variant-numeric: tabular-nums;
}

/* Sticky nav must not cover the heading it just scrolled to */
:target, section[id] { scroll-margin-top: calc(var(--nav-h) + var(--s-5)); }

:focus-visible {
  outline: 2px solid var(--teal);
  outline-offset: 2px;
  border-radius: var(--r-sm);
}
::selection { background: var(--teal-soft); color: var(--ink); }

.shell { max-width: var(--maxw); margin-inline: auto; padding-inline: var(--gutter); }
.section { padding-block: clamp(56px, 9vw, 128px); }
.lead { font-size: var(--text-md); color: var(--slate); max-width: 62ch; }

/* Entrance animation, opt-in via useInView */
.reveal { opacity: 0; transform: translateY(12px); transition: opacity var(--dur-2) var(--ease), transform var(--dur-2) var(--ease); }
.reveal.in { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .reveal { opacity: 1; transform: none; }
}
```

- [ ] **Step 3: Delete the old stylesheets**

```bash
cd frontend && rm src/styles.css src/problem.css
```

The app will not build until Task 6 rewires imports. That is expected.

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src
git commit -m "style: add design tokens and base stylesheet"
```

---

## Task 3: Hooks

**Files:**
- Create: `frontend/src/hooks/useTypewriter.ts`, `useInView.ts`, `useRovingTabs.ts`
- Test: `frontend/src/hooks/useRovingTabs.test.ts`, `useTypewriter.test.ts`

- [ ] **Step 1: Write the failing test for `useRovingTabs`**

Create `frontend/src/hooks/useRovingTabs.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRovingTabs } from './useRovingTabs'

function keyEvent(key: string) {
  return { key, preventDefault: vi.fn() } as unknown as React.KeyboardEvent
}

describe('useRovingTabs', () => {
  it('moves forward and wraps at the end', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useRovingTabs(3, 2, onSelect))
    result.current(keyEvent('ArrowRight'))
    expect(onSelect).toHaveBeenCalledWith(0)
  })

  it('moves backward and wraps at the start', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useRovingTabs(3, 0, onSelect))
    result.current(keyEvent('ArrowLeft'))
    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('jumps to first and last with Home and End', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useRovingTabs(4, 1, onSelect))
    result.current(keyEvent('Home'))
    expect(onSelect).toHaveBeenCalledWith(0)
    result.current(keyEvent('End'))
    expect(onSelect).toHaveBeenCalledWith(3)
  })

  it('ignores unrelated keys and does not preventDefault', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useRovingTabs(3, 0, onSelect))
    const e = keyEvent('a')
    result.current(e)
    expect(onSelect).not.toHaveBeenCalled()
    expect(e.preventDefault).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- useRovingTabs`
Expected: FAIL — cannot resolve `./useRovingTabs`.

- [ ] **Step 3: Implement `frontend/src/hooks/useRovingTabs.ts`**

```ts
import type { KeyboardEvent } from 'react'

/**
 * Arrow/Home/End keyboard navigation for a `role="tablist"`.
 * Returns a keydown handler; the caller owns selection state.
 */
export function useRovingTabs(
  count: number,
  active: number,
  onSelect: (index: number) => void,
) {
  return (event: KeyboardEvent) => {
    let next = active
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (active + 1) % count
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (active - 1 + count) % count
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = count - 1
        break
      default:
        return
    }
    event.preventDefault()
    onSelect(next)
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- useRovingTabs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing test for `useTypewriter`**

Create `frontend/src/hooks/useTypewriter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTypewriter } from './useTypewriter'

describe('useTypewriter', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders nothing until activated', () => {
    const { result } = renderHook(() => useTypewriter('hello', false))
    expect(result.current.shown).toBe('')
  })

  it('reveals the full text over time once active', () => {
    const { result } = renderHook(() => useTypewriter('hello', true))
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.shown).toBe('hello')
    expect(result.current.done).toBe(true)
  })

  it('renders instantly when reduced motion is preferred', () => {
    window.matchMedia = ((q: string) => ({
      matches: true, media: q, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    const { result } = renderHook(() => useTypewriter('hello', true))
    expect(result.current.shown).toBe('hello')
  })
})
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `npm test -- useTypewriter`
Expected: FAIL — cannot resolve `./useTypewriter`.

- [ ] **Step 7: Implement `frontend/src/hooks/useTypewriter.ts`**

```ts
import { useEffect, useState } from 'react'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return reduced
}

/**
 * Reveals `text` progressively once `active` is true.
 * Under reduced-motion the full text appears immediately.
 */
export function useTypewriter(text: string, active: boolean, charsPerTick = 2) {
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = useState('')

  useEffect(() => {
    if (!active) {
      setShown('')
      return
    }
    if (reduced) {
      setShown(text)
      return
    }

    setShown('')
    let index = 0
    const id = window.setInterval(() => {
      index = Math.min(index + charsPerTick, text.length)
      setShown(text.slice(0, index))
      if (index >= text.length) window.clearInterval(id)
    }, 16)

    return () => window.clearInterval(id)
  }, [text, active, reduced, charsPerTick])

  return { shown, done: shown === text, reduced }
}
```

- [ ] **Step 8: Implement `frontend/src/hooks/useInView.ts`**

No test — it is a thin IntersectionObserver wrapper with no branching logic worth asserting.

```ts
import { useEffect, useRef, useState } from 'react'

/** Fires once when the element scrolls into view. Used for entrance animations. */
export function useInView<T extends HTMLElement>(rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, inView }
}
```

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: PASS, 7 tests across 2 files.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/hooks
git commit -m "feat: add roving tablist, typewriter, and in-view hooks"
```

---

## Task 4: Demo data

**Files:**
- Create: `frontend/src/data/demo.ts`, `frontend/src/data/site.ts`

All content is fictional and illustrative. No real company names.

- [ ] **Step 1: Create `frontend/src/data/site.ts`**

```ts
/** Swap for a Formspree/Tally endpoint or your own backend. */
export const FORM_ENDPOINT = ''

export const BOOKING_URL = 'https://calendly.com/martin-sorno/30min'

export const NAV_LINKS = [
  { href: '#problem', label: 'The problem' },
  { href: '#product', label: 'Product' },
  { href: '#roles', label: "Who it's for" },
  { href: '#contact', label: 'Contact' },
]

export const DEMO_DISCLAIMER =
  'Illustrative product concept. Data shown is fictional.'
```

- [ ] **Step 2: Create `frontend/src/data/demo.ts`**

```ts
export type StatusTone = 'ok' | 'warn' | 'blocked' | 'idle'

export const UNIT = {
  id: 'R-1842',
  name: 'Hydraulic Pump',
  model: 'HPX-400',
  customer: 'Northstar Industrial',
  order: 'SO-20784',
  station: 'Assembly',
  grade: 'B',
  promised: 'Aug 14',
  status: 'Blocked — quality hold',
  tone: 'blocked' as StatusTone,
}

/** Demo 1: five systems, five partial and conflicting answers. */
export const SOURCES = [
  {
    key: 'erp',
    label: 'ERP',
    detail: 'Work order module',
    answer: 'Status: In Repair.',
    caveat: 'Last updated 2 days ago.',
    failure: 'Stale',
    tone: 'warn' as StatusTone,
  },
  {
    key: 'mes',
    label: 'MES',
    detail: 'Shop floor execution',
    answer: 'No repair operation has been started.',
    caveat: 'Directly contradicts the ERP.',
    failure: 'Conflicting',
    tone: 'blocked' as StatusTone,
  },
  {
    key: 'qms',
    label: 'Quality system',
    detail: 'Holds and nonconformance',
    answer: 'Hold QH-441 open, awaiting disposition.',
    caveat: 'Never propagated to the ERP.',
    failure: 'Siloed',
    tone: 'blocked' as StatusTone,
  },
  {
    key: 'drive',
    label: 'Shared drive',
    detail: '/inspection/2026-07/',
    answer: '3 photos. IMG_2481.jpg, IMG_2482.jpg, IMG_2483.jpg.',
    caveat: 'No unit reference, no findings, no author.',
    failure: 'Unstructured',
    tone: 'idle' as StatusTone,
  },
  {
    key: 'people',
    label: 'Shift supervisor',
    detail: 'Verbal',
    answer: "Pretty sure it's waiting on a seal kit. Ask Elena.",
    caveat: 'Elena is on second shift.',
    failure: 'Tribal knowledge',
    tone: 'warn' as StatusTone,
  },
]

export const RECONCILED = {
  headline: 'R-1842 is blocked on quality hold QH-441.',
  body:
    'The hold was opened yesterday at 09:48 by Inspection. The unit is physically at ' +
    'Assembly, but no repair operation has started because seal kit P/N 4471-B is short. ' +
    'This blocks sales order SO-20784, promised Aug 14. Owner: Elena R.',
  conflict:
    'The ERP and MES disagree on status. Sorno flagged the conflict rather than picking one.',
  sources: ['ERP', 'MES', 'Quality system', 'Inventory', 'Inspection record'],
}

/** Demo 2: the unit record tabs. */
export const TIMELINE = [
  { time: 'Jul 28 · 14:02', event: 'Unit received at dock', actor: 'Receiving', source: 'ERP' },
  { time: 'Jul 28 · 15:19', event: 'Identified and matched to SO-20784', actor: 'D. Okafor', source: 'ERP' },
  { time: 'Jul 29 · 08:30', event: 'Initial inspection started', actor: 'M. Reyes', source: 'MES' },
  { time: 'Jul 29 · 09:48', event: 'Defect found — scoring on shaft bore', actor: 'M. Reyes', source: 'Inspection' },
  { time: 'Jul 29 · 09:48', event: 'Quality hold QH-441 opened', actor: 'Quality', source: 'QMS', tone: 'blocked' as StatusTone },
  { time: 'Jul 29 · 11:05', event: 'Condition graded B — repairable', actor: 'M. Reyes', source: 'Inspection' },
  { time: 'Jul 30 · 07:12', event: 'Seal kit P/N 4471-B short — 0 on hand', actor: 'Inventory', source: 'WMS', tone: 'blocked' as StatusTone },
  { time: 'Jul 30 · 10:32', event: 'Reassembly blocked, awaiting parts', actor: 'E. Novak', source: 'MES', tone: 'warn' as StatusTone },
]

export const FINDINGS = [
  { label: 'Condition grade', value: 'B — repairable' },
  { label: 'Primary failure mode', value: 'Seal degradation, secondary bore scoring' },
  { label: 'Shaft bore runout', value: '0.042 mm (limit 0.030 mm)', tone: 'blocked' as StatusTone },
  { label: 'Housing', value: 'Serviceable, no cracks' },
  { label: 'Inspector', value: 'M. Reyes' },
  { label: 'Photos', value: '3 attached' },
]

export const PARTS = [
  { pn: '4471-B', desc: 'Seal kit', origin: 'New — supplier', status: 'Short, 0 on hand', tone: 'blocked' as StatusTone },
  { pn: '2210-C', desc: 'Drive shaft', origin: 'Recovered from core C-9920', status: 'Inspected, reusable', tone: 'ok' as StatusTone },
  { pn: '8830-A', desc: 'Pump housing', origin: 'Original to this unit', status: 'Serviceable', tone: 'ok' as StatusTone },
  { pn: '5502-D', desc: 'Bearing set', origin: 'New — supplier', status: 'Reserved', tone: 'ok' as StatusTone },
  { pn: '1140-F', desc: 'Valve plate', origin: 'Original to this unit', status: 'Scrapped, out of tolerance', tone: 'warn' as StatusTone },
]

export const QUALITY = [
  { label: 'QH-441', detail: 'Quality hold — bore runout out of tolerance', status: 'Open', tone: 'blocked' as StatusTone },
  { label: 'NCR-2081', detail: 'Nonconformance — shaft bore scoring', status: 'Under review', tone: 'warn' as StatusTone },
  { label: 'Pressure test #1', detail: 'Failed at 2,800 psi, spec 3,200 psi', status: 'Failed', tone: 'blocked' as StatusTone },
  { label: 'Pressure test #2', detail: 'Retest after seal replacement', status: 'Not started', tone: 'idle' as StatusTone },
  { label: 'Dimensional check', detail: 'Housing and mounting face', status: 'Passed', tone: 'ok' as StatusTone },
]

export const DOCUMENTS = [
  { name: 'Inspection form INS-4471', meta: 'PDF · Jul 29 · M. Reyes', source: 'Inspection' },
  { name: 'HPX-400 service manual, §4 Reassembly', meta: 'PDF · rev C', source: 'Documents' },
  { name: 'Torque specification sheet', meta: 'PDF · rev A', source: 'Engineering' },
  { name: 'Pressure test report #1', meta: 'PDF · Jul 30', source: 'QMS' },
  { name: 'Technician note — E. Novak', meta: 'Text · Jul 30 · 10:32', source: 'MES' },
]

export const RECORD_TABS = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'inspection', label: 'Inspection' },
  { key: 'parts', label: 'Parts & lineage' },
  { key: 'quality', label: 'Quality' },
  { key: 'documents', label: 'Documents' },
]

/** Demo 3: preset questions. One answer must state a limitation. */
export const QUESTIONS = [
  {
    q: 'Which units are blocked by missing parts?',
    a:
      'Seven units are blocked on parts. Four are waiting on bearing assemblies, two on ' +
      'seal kits, and one on an approved replacement housing. R-1842 has been blocked ' +
      'longest at 6.3 days and is the only one tied to a promised date this week.',
    sources: ['ERP', 'Inventory', 'MES'],
    note: null,
  },
  {
    q: "What's at risk of missing its promised date this week?",
    a:
      'Three orders are at risk. SO-20784 (R-1842, promised Aug 14) is blocked on a quality ' +
      'hold and a parts shortage. SO-20791 and SO-20802 are both waiting on the same bearing ' +
      'assembly, expected to arrive Aug 11.',
    sources: ['ERP', 'Inventory', 'QMS'],
    note: null,
  },
  {
    q: 'Why has R-1842 been in inspection for three days?',
    a:
      'It left inspection on Jul 29 at 11:05. The ERP still shows it in inspection because ' +
      'its status has not been updated since Jul 28. The MES shows it at Assembly, blocked ' +
      'on quality hold QH-441 and a seal kit shortage.',
    sources: ['ERP', 'MES', 'QMS'],
    note: 'The ERP record is stale. Sorno is reporting the MES position and flagging the conflict.',
  },
  {
    q: 'Has this failure happened before on this product family?',
    a:
      'Bore scoring has been recorded on 11 HPX-400 units in the last 12 months, 9 of them ' +
      'from the same customer. Eight were repaired by sleeving; two were scrapped.',
    sources: ['Inspection', 'QMS'],
    note:
      'Confidence is limited — failure modes were only recorded as structured data from ' +
      'March onward. Earlier records are free text and may be undercounted.',
  },
]

/** Lifecycle view. */
export const STAGES = [
  { name: 'Intake', wip: 24, oldest: '2d', tone: 'ok' as StatusTone },
  { name: 'Inspection', wip: 18, oldest: '4d', tone: 'ok' as StatusTone },
  { name: 'Disposition', wip: 9, oldest: '6d', tone: 'warn' as StatusTone },
  { name: 'Disassembly', wip: 12, oldest: '3d', tone: 'ok' as StatusTone },
  { name: 'Repair', wip: 31, oldest: '11d', tone: 'blocked' as StatusTone, bottleneck: true },
  { name: 'Testing', wip: 7, oldest: '2d', tone: 'ok' as StatusTone },
  { name: 'Quality', wip: 5, oldest: '5d', tone: 'warn' as StatusTone },
  { name: 'Ready to ship', wip: 14, oldest: '1d', tone: 'ok' as StatusTone },
]

export const BOTTLENECK = {
  stage: 'Repair',
  summary: '31 units in repair, 11 of them idle more than a week.',
  causes: [
    { label: '9 units', detail: 'waiting on parts that were never reserved' },
    { label: '4 units', detail: 'on quality hold with no disposition decision' },
    { label: '2 units', detail: 'awaiting customer authorization for extra work' },
  ],
}

export const ROLES = [
  {
    role: 'Plant manager',
    question: 'Which orders are at risk this week, and why?',
    body: 'One view of every unit in the building, with the blockers surfaced instead of buried.',
  },
  {
    role: 'Core manager',
    question: 'Do I have enough usable cores for next month?',
    body: 'Core receipts, grades, and availability by product family, without a spreadsheet reconciliation.',
  },
  {
    role: 'Quality manager',
    question: "What's on hold, and what's the disposition?",
    body: 'Holds, nonconformances, and test history tied to the unit and its full evidence trail.',
  },
  {
    role: 'Customer service',
    question: 'When is R-1842 shipping, and what do I tell the customer?',
    body: 'An answer with a date and a reason, without walking to the floor to ask.',
  },
]

export const INTEGRATIONS = [
  'ERP', 'MES', 'Quality systems', 'Warehouse & inventory',
  'Maintenance systems', 'Spreadsheets', 'Document repositories', 'Internal tools',
]
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `src/data`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/data
git commit -m "feat: add fictional demo data for marketing site"
```

---

## Task 5: Primitives

**Files:**
- Create: `frontend/src/components/primitives/{Button,StatusPill,SourceBadge,SectionHeader}.tsx`
- Create: `frontend/src/styles/sections/primitives.css`
- Test: `frontend/src/components/primitives/StatusPill.test.tsx`

- [ ] **Step 1: Write the failing test for `StatusPill`**

The spec requires status never be conveyed by color alone, so assert the label renders.

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusPill } from './StatusPill'

describe('StatusPill', () => {
  it('always renders a text label alongside the colour', () => {
    render(<StatusPill tone="blocked" label="Quality hold" />)
    expect(screen.getByText('Quality hold')).toBeInTheDocument()
  })

  it('applies a tone class so colour is driven by tokens', () => {
    const { container } = render(<StatusPill tone="ok" label="Passed" />)
    expect(container.firstChild).toHaveClass('pill', 'pill-ok')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- StatusPill`
Expected: FAIL — cannot resolve `./StatusPill`.

- [ ] **Step 3: Implement the primitives**

`StatusPill.tsx`:

```tsx
import type { StatusTone } from '../../data/demo'

export function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  return <span className={`pill pill-${tone}`}>{label}</span>
}
```

`SourceBadge.tsx`:

```tsx
export function SourceBadge({ children }: { children: React.ReactNode }) {
  return <span className="source-badge mono">{children}</span>
}
```

`Button.tsx` — `href` renders an anchor, otherwise a real `<button>`:

```tsx
type Props = {
  children: React.ReactNode
  href?: string
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}

export function Button({
  children, href, variant = 'primary', type = 'button', onClick, disabled,
}: Props) {
  const className = `btn btn-${variant}`
  if (href) {
    return (
      <a className={className} href={href}>
        {children}
        <span aria-hidden="true">→</span>
      </a>
    )
  }
  return (
    <button className={className} type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
```

`SectionHeader.tsx`:

```tsx
export function SectionHeader({
  kicker, title, lead,
}: { kicker: string; title: string; lead?: string }) {
  return (
    <header className="section-header">
      <p className="kicker mono">{kicker}</p>
      <h2>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </header>
  )
}
```

- [ ] **Step 4: Write `frontend/src/styles/sections/primitives.css`**

Required rules: `.btn` with 44px minimum height and hover that changes colour/transform only
(never layout); `.btn-primary` on `--teal`; `.btn-secondary` transparent with a `--line`
border. `.pill` as a `--r-pill` chip, one `.pill-{ok,warn,blocked,idle}` variant per tone
pairing the `--status-*` text colour with its `--status-*-soft` background.
`.source-badge` small, mono, uppercase, `--surface-sunken`. `.kicker` mono, `--teal`,
letterspaced. `.section-header` with `--s-3` stack spacing.

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm test -- StatusPill`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/primitives frontend/src/styles/sections/primitives.css
git commit -m "feat: add button, status pill, source badge, section header primitives"
```

---

## Task 6: App shell, Nav, and main entry rewiring

**Files:**
- Create: `frontend/src/App.tsx`, `frontend/src/components/Nav.tsx`, `frontend/src/styles/sections/nav.css`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Reduce `frontend/src/main.tsx` to an entry point**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/sections/primitives.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 2: Create `frontend/src/App.tsx`**

Sections are added one per task; start with Nav and Footer placeholders so the app builds.

```tsx
import { Nav } from './components/Nav'

export default function App() {
  return (
    <>
      <Nav />
      <main id="top" />
    </>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/Nav.tsx`**

```tsx
import { Button } from './primitives/Button'
import { NAV_LINKS } from '../data/site'

export function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner shell">
        <a className="wordmark" href="#top">
          <Mark />
          Sorno
        </a>
        <nav aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
        <Button href="#contact">Book a conversation</Button>
      </div>
    </header>
  )
}

export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <i /><i /><i />
    </span>
  )
}
```

- [ ] **Step 4: Write `frontend/src/styles/sections/nav.css`**

Sticky at `top: 0`, height `--nav-h`, `backdrop-filter: blur(12px)`, translucent `--paper`,
1px `--line` bottom border. `.nav-inner` is a flex row with the nav links pushed right of
the wordmark and the CTA last. Below 900px the `<nav>` is `display: none` — the CTA remains.
`.mark` is a 3-cell grid on `--teal`, matching the existing logo.

- [ ] **Step 5: Verify the app builds and renders**

Run: `npm run build`
Expected: PASS, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx frontend/src/main.tsx frontend/src/components/Nav.tsx frontend/src/styles/sections/nav.css
git commit -m "feat: add app shell and sticky nav"
```

---

## Task 7: Hero

**Files:**
- Create: `frontend/src/components/Hero.tsx`, `frontend/src/styles/sections/hero.css`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/components/Hero.tsx`**

```tsx
import { Button } from './primitives/Button'
import { StatusPill } from './primitives/StatusPill'
import { SourceBadge } from './primitives/SourceBadge'
import { UNIT } from '../data/demo'
import { DEMO_DISCLAIMER } from '../data/site'

export function Hero() {
  return (
    <section className="hero">
      <div className="shell hero-inner">
        <div className="hero-copy">
          <h1>Where is unit {UNIT.id}?</h1>
          <p className="lead">
            Answering that today means checking the ERP, opening the MES, finding the right
            spreadsheet, and asking whoever was on shift last night. Sorno unifies the
            systems you already run around every unit on your floor — so anyone gets the
            answer in seconds, with the evidence attached.
          </p>
          <div className="hero-actions">
            <Button href="#contact">Book a conversation</Button>
            <Button href="#problem" variant="secondary">See how it works</Button>
          </div>
          <p className="micro">
            Built for repair, refurbishment, and remanufacturing operations.
          </p>
        </div>

        <aside className="hero-card" aria-label={`Summary for unit ${UNIT.id}`}>
          <div className="hero-card-head">
            <div>
              <p className="mono micro-label">UNIT RECORD</p>
              <h2 className="hero-card-title">
                {UNIT.id} <span>{UNIT.name}</span>
              </h2>
              <p className="micro">{UNIT.customer} · {UNIT.order}</p>
            </div>
            <StatusPill tone={UNIT.tone} label={UNIT.status} />
          </div>
          <dl className="hero-card-grid">
            <div><dt>Station</dt><dd>{UNIT.station}</dd></div>
            <div><dt>Promised</dt><dd>{UNIT.promised}</dd></div>
            <div><dt>Grade</dt><dd>{UNIT.grade}</dd></div>
            <div><dt>Blocker</dt><dd>Seal kit short</dd></div>
          </dl>
          <div className="hero-card-sources">
            <SourceBadge>ERP</SourceBadge>
            <SourceBadge>MES</SourceBadge>
            <SourceBadge>QMS</SourceBadge>
            <SourceBadge>Inventory</SourceBadge>
          </div>
          <p className="micro disclaimer">{DEMO_DISCLAIMER}</p>
        </aside>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write `frontend/src/styles/sections/hero.css`**

`.hero-inner` is a two-column grid, `1.05fr 0.95fr`, `gap: clamp(32px, 5vw, 72px)`,
`align-items: center`. Collapses to one column below 900px with the card below the copy.
`.hero-card` uses `--surface`, `--r-lg`, `--e-3`, 1px `--line` border. `.hero-card-grid` is
a 2×2 grid of `dt`/`dd` pairs; `dt` is `--text-xs` `--slate`, `dd` is `--text-base` ink with
tabular numerals. Retain a soft radial `--teal-soft` wash behind the section, but positioned
with `background-position` rather than an absolutely positioned element.

- [ ] **Step 3: Mount it in `App.tsx`**

```tsx
<main id="top">
  <Hero />
</main>
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run build` then check the running dev server at 375px, 900px, and 1280px.
Expected: no overlap, no horizontal scroll, card legible at every width.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Hero.tsx frontend/src/styles/sections/hero.css frontend/src/App.tsx
git commit -m "feat: add hero section"
```

---

## Task 8: Interactive demo #1 — FragmentedAnswer

**Files:**
- Create: `frontend/src/components/FragmentedAnswer.tsx`, `frontend/src/styles/sections/fragmented.css`
- Test: `frontend/src/components/FragmentedAnswer.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FragmentedAnswer } from './FragmentedAnswer'
import { SOURCES, RECONCILED } from '../data/demo'

describe('FragmentedAnswer', () => {
  it('shows the first source answer by default', () => {
    render(<FragmentedAnswer />)
    expect(screen.getByText(SOURCES[0].answer)).toBeInTheDocument()
  })

  it('switches answers when another source is selected', async () => {
    const user = userEvent.setup()
    render(<FragmentedAnswer />)
    await user.click(screen.getByRole('tab', { name: /MES/ }))
    expect(screen.getByText(SOURCES[1].answer)).toBeInTheDocument()
    expect(screen.queryByText(SOURCES[0].answer)).not.toBeInTheDocument()
  })

  it('marks exactly one tab as selected', async () => {
    const user = userEvent.setup()
    render(<FragmentedAnswer />)
    await user.click(screen.getByRole('tab', { name: /Quality system/ }))
    const selected = screen.getAllByRole('tab').filter(
      (t) => t.getAttribute('aria-selected') === 'true',
    )
    expect(selected).toHaveLength(1)
    expect(selected[0]).toHaveAccessibleName(/Quality system/)
  })

  it('moves selection with arrow keys', async () => {
    const user = userEvent.setup()
    render(<FragmentedAnswer />)
    await user.click(screen.getByRole('tab', { name: /ERP/ }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /MES/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('reveals the reconciled answer only after asking Sorno', async () => {
    const user = userEvent.setup()
    render(<FragmentedAnswer />)
    expect(screen.queryByText(RECONCILED.headline)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /ask sorno/i }))
    expect(screen.getByText(RECONCILED.headline)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- FragmentedAnswer`
Expected: FAIL — cannot resolve `./FragmentedAnswer`.

- [ ] **Step 3: Implement `frontend/src/components/FragmentedAnswer.tsx`**

```tsx
import { useRef, useState } from 'react'
import { SectionHeader } from './primitives/SectionHeader'
import { StatusPill } from './primitives/StatusPill'
import { SourceBadge } from './primitives/SourceBadge'
import { Button } from './primitives/Button'
import { useRovingTabs } from '../hooks/useRovingTabs'
import { SOURCES, RECONCILED, UNIT } from '../data/demo'

export function FragmentedAnswer() {
  const [active, setActive] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const select = (index: number) => {
    setActive(index)
    tabRefs.current[index]?.focus()
  }
  const onKeyDown = useRovingTabs(SOURCES.length, active, select)
  const source = SOURCES[active]

  return (
    <section className="section fragmented" id="problem">
      <div className="shell">
        <SectionHeader
          kicker="THE PROBLEM"
          title={`Five systems. Five different answers about ${UNIT.id}.`}
          lead="This is what answering one routine question costs today. Click through the systems your team actually checks."
        />

        <div className="frag-grid">
          <div
            className="frag-tabs"
            role="tablist"
            aria-label="Systems consulted"
            onKeyDown={onKeyDown}
          >
            {SOURCES.map((s, i) => (
              <button
                key={s.key}
                ref={(el) => { tabRefs.current[i] = el }}
                type="button"
                role="tab"
                id={`frag-tab-${s.key}`}
                aria-selected={active === i}
                aria-controls={`frag-panel-${s.key}`}
                tabIndex={active === i ? 0 : -1}
                className={active === i ? 'selected' : ''}
                onClick={() => setActive(i)}
              >
                <span className="frag-tab-label">{s.label}</span>
                <span className="frag-tab-detail">{s.detail}</span>
              </button>
            ))}
          </div>

          <div
            className="frag-panel"
            role="tabpanel"
            id={`frag-panel-${source.key}`}
            aria-labelledby={`frag-tab-${source.key}`}
            tabIndex={0}
          >
            <div className="frag-panel-head">
              <p className="mono micro-label">{source.label} SAYS</p>
              <StatusPill tone={source.tone} label={source.failure} />
            </div>
            <p className="frag-answer">{source.answer}</p>
            <p className="frag-caveat">{source.caveat}</p>
          </div>
        </div>

        <div className="frag-resolve">
          {!revealed ? (
            <>
              <p className="lead">
                None of them is wrong. None of them is complete. Two of them disagree.
              </p>
              <Button onClick={() => setRevealed(true)}>Ask Sorno instead</Button>
            </>
          ) : (
            <div className="frag-reconciled" aria-live="polite">
              <p className="mono micro-label">SORNO</p>
              <h3>{RECONCILED.headline}</h3>
              <p>{RECONCILED.body}</p>
              <p className="frag-conflict">{RECONCILED.conflict}</p>
              <div className="frag-sources">
                {RECONCILED.sources.map((s) => (
                  <SourceBadge key={s}>{s}</SourceBadge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- FragmentedAnswer`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write `frontend/src/styles/sections/fragmented.css`**

`.frag-grid` is `grid-template-columns: minmax(220px, 300px) 1fr`, collapsing to one column
below 900px where `.frag-tabs` becomes a wrapping row of chips. Selected tab gets a
`--teal` left border (top border in the collapsed layout) and `--surface` background.
`.frag-panel` is a `--surface` card with `--e-1`. `.frag-reconciled` is visually distinct —
`--teal-soft` background, `--teal` left rule — so the payoff reads as a different kind of
answer. `.frag-answer` is `--text-md`.

- [ ] **Step 6: Mount in `App.tsx` after `<Hero />` and verify in the browser**

Check: keyboard-only operation works, and the reveal does not shift layout above it.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/FragmentedAnswer.tsx frontend/src/components/FragmentedAnswer.test.tsx frontend/src/styles/sections/fragmented.css frontend/src/App.tsx
git commit -m "feat: add fragmented answer interactive demo"
```

---

## Task 9: Interactive demo #2 — UnitRecord

**Files:**
- Create: `frontend/src/components/UnitRecord.tsx`, `frontend/src/styles/sections/record.css`
- Test: `frontend/src/components/UnitRecord.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnitRecord } from './UnitRecord'

describe('UnitRecord', () => {
  it('opens on the timeline tab', () => {
    render(<UnitRecord />)
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Unit received at dock')).toBeInTheDocument()
  })

  it('switches panels when a tab is clicked', async () => {
    const user = userEvent.setup()
    render(<UnitRecord />)
    await user.click(screen.getByRole('tab', { name: 'Parts & lineage' }))
    expect(screen.getByText('Recovered from core C-9920')).toBeInTheDocument()
    expect(screen.queryByText('Unit received at dock')).not.toBeInTheDocument()
  })

  it('supports arrow key navigation across tabs', async () => {
    const user = userEvent.setup()
    render(<UnitRecord />)
    await user.click(screen.getByRole('tab', { name: 'Timeline' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Inspection' })).toHaveAttribute('aria-selected', 'true')
  })

  it('wraps from the last tab to the first with End then ArrowRight', async () => {
    const user = userEvent.setup()
    render(<UnitRecord />)
    await user.click(screen.getByRole('tab', { name: 'Timeline' }))
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Documents' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- UnitRecord`
Expected: FAIL — cannot resolve `./UnitRecord`.

- [ ] **Step 3: Implement `frontend/src/components/UnitRecord.tsx`**

Structure: an application-shell frame (`.record-chrome` with the Sorno mark and fake nav
items), a unit header reusing `UNIT`, then a tablist over `RECORD_TABS` driven by the same
`useRovingTabs` hook and ref-focus pattern as Task 8. Each panel renders its dataset:

- `timeline` → `TIMELINE.map` into `.record-event` rows: `<time>` (mono), event text, actor,
  and a `SourceBadge`. Rows with a `tone` get a matching left border.
- `inspection` → `FINDINGS` as a `<dl>`, plus three placeholder photo tiles (CSS-drawn, no
  image files) labelled "Photo 1–3".
- `parts` → `PARTS` as a `<table>` with columns Part / Description / Origin / Status, the
  status cell rendering a `StatusPill`.
- `quality` → `QUALITY` as rows of label, detail, and `StatusPill`.
- `documents` → `DOCUMENTS` as rows of name, meta, and `SourceBadge`.

Panels must use the same `role="tabpanel"` / `aria-labelledby` / `tabIndex={0}` wiring as
Task 8. Extract the panel body into a local `RecordPanel` switch component so the file stays
readable.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- UnitRecord`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write `frontend/src/styles/sections/record.css`**

`.record-chrome` is the dark `--ink` application bar with `--r-lg` top corners. The tab bar
scrolls horizontally below 640px with an edge fade (`mask-image` linear gradient) and
`scrollbar-width: none`. Tables use `border-collapse: collapse`, hairline `--line` row
borders, and `font-variant-numeric: tabular-nums`. Below 640px each table row becomes a
stacked block with `::before` labels drawn from `data-label` attributes.

- [ ] **Step 6: Mount in `App.tsx` with `id="product"` and verify in the browser**

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/UnitRecord.tsx frontend/src/components/UnitRecord.test.tsx frontend/src/styles/sections/record.css frontend/src/App.tsx
git commit -m "feat: add unit record interactive demo"
```

---

## Task 10: Interactive demo #3 — AskSorno

**Files:**
- Create: `frontend/src/components/AskSorno.tsx`, `frontend/src/styles/sections/ask.css`
- Test: `frontend/src/components/AskSorno.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write the failing test**

Reduced motion is stubbed to `false` in setup, so the typewriter runs; use fake timers to
flush it.

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AskSorno } from './AskSorno'
import { QUESTIONS } from '../data/demo'

describe('AskSorno', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('renders every preset question as a button', () => {
    render(<AskSorno />)
    for (const item of QUESTIONS) {
      expect(screen.getByRole('button', { name: item.q })).toBeInTheDocument()
    }
  })

  it('streams the answer for the selected question', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<AskSorno />)
    await user.click(screen.getByRole('button', { name: QUESTIONS[0].q }))
    await act(async () => { vi.advanceTimersByTime(10000) })
    expect(screen.getByTestId('ask-answer')).toHaveTextContent(QUESTIONS[0].a)
  })

  it('shows evidence chips once the answer completes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<AskSorno />)
    await user.click(screen.getByRole('button', { name: QUESTIONS[0].q }))
    await act(async () => { vi.advanceTimersByTime(10000) })
    for (const source of QUESTIONS[0].sources) {
      expect(screen.getByText(source)).toBeInTheDocument()
    }
  })

  it('surfaces the stated limitation when an answer has one', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<AskSorno />)
    const limited = QUESTIONS.find((q) => q.note)!
    await user.click(screen.getByRole('button', { name: limited.q }))
    await act(async () => { vi.advanceTimersByTime(20000) })
    expect(screen.getByText(limited.note!)).toBeInTheDocument()
  })

  it('exposes the answer region as a polite live region', async () => {
    render(<AskSorno />)
    expect(screen.getByTestId('ask-answer')).toHaveAttribute('aria-live', 'polite')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- AskSorno`
Expected: FAIL — cannot resolve `./AskSorno`.

- [ ] **Step 3: Implement `frontend/src/components/AskSorno.tsx`**

```tsx
import { useState } from 'react'
import { SectionHeader } from './primitives/SectionHeader'
import { SourceBadge } from './primitives/SourceBadge'
import { useTypewriter } from '../hooks/useTypewriter'
import { QUESTIONS } from '../data/demo'

export function AskSorno() {
  const [active, setActive] = useState(0)
  const [asked, setAsked] = useState(false)
  const current = QUESTIONS[active]
  const { shown, done } = useTypewriter(current.a, asked)

  const ask = (index: number) => {
    setActive(index)
    setAsked(true)
  }

  return (
    <section className="section ask">
      <div className="shell">
        <SectionHeader
          kicker="ASK YOUR OPERATION"
          title="Questions answered with evidence, not guesses."
          lead="Every answer names the systems it came from and says so when the data is incomplete."
        />

        <div className="ask-panel">
          <div className="ask-questions">
            {QUESTIONS.map((item, i) => (
              <button
                key={item.q}
                type="button"
                className={asked && active === i ? 'selected' : ''}
                onClick={() => ask(i)}
              >
                {item.q}
              </button>
            ))}
          </div>

          <div className="ask-thread">
            {asked && <p className="ask-question mono">{current.q}</p>}
            <div className="ask-answer" data-testid="ask-answer" aria-live="polite">
              {asked ? (
                <>
                  <span className="ask-avatar" aria-hidden="true">S</span>
                  <p>
                    {shown}
                    {!done && <span className="ask-caret" aria-hidden="true" />}
                  </p>
                </>
              ) : (
                <p className="ask-idle">Pick a question to see how Sorno answers it.</p>
              )}
            </div>

            {asked && done && (
              <div className="ask-evidence">
                <p className="mono micro-label">EVIDENCE</p>
                <div className="ask-sources">
                  {current.sources.map((s) => (
                    <SourceBadge key={s}>{s}</SourceBadge>
                  ))}
                </div>
                {current.note && <p className="ask-note">{current.note}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- AskSorno`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write `frontend/src/styles/sections/ask.css`**

`.ask-panel` is `grid-template-columns: minmax(240px, 340px) 1fr`, one column below 900px.
`.ask-questions button` are left-aligned pills with a `--surface` background that becomes
`--teal-soft` with a `--teal` border when selected. `.ask-thread` is a `--surface` card with
`--e-2`. `.ask-caret` is a 2px `--teal` block with a blink animation, suppressed under
reduced motion. `.ask-note` sits on `--status-warn-soft` with a `--status-warn` left rule so
stated limitations read as a distinct class of information.

- [ ] **Step 6: Mount in `App.tsx` and commit**

```bash
git add frontend/src/components/AskSorno.tsx frontend/src/components/AskSorno.test.tsx frontend/src/styles/sections/ask.css frontend/src/App.tsx
git commit -m "feat: add ask-sorno interactive demo"
```

---

## Task 11: Pipeline, Roles, Integrations

**Files:**
- Create: `frontend/src/components/{Pipeline,Roles,Integrations}.tsx`
- Create: `frontend/src/styles/sections/{pipeline,roles,integrations}.css`
- Modify: `frontend/src/App.tsx`

These are presentational; no tests.

- [ ] **Step 1: Create `Pipeline.tsx`**

Renders `SectionHeader` (kicker `LIFECYCLE VISIBILITY`, title "See where the work actually
stops."), then `STAGES.map` into a horizontal row of `.stage` cards. Each shows the stage
name, `wip` (tabular numerals, large), and `oldest` age with a `StatusPill`. The stage with
`bottleneck: true` gets `.stage-bottleneck` and `aria-current="true"`. Below the row, render
`BOTTLENECK` as a callout: the stage name, `summary`, and `causes.map` into a list of
`<strong>{label}</strong> {detail}`.

Use a `useInView` ref on the section root and toggle `.reveal.in` for the entrance.

- [ ] **Step 2: Create `Roles.tsx`**

`SectionHeader` (kicker `WHO IT'S FOR`, title "The question each person stops chasing."),
then `ROLES.map` into a responsive grid of cards: role name, the question in quotes as the
card's emphasis, and the body line. Grid is
`repeat(auto-fit, minmax(240px, 1fr))`.

- [ ] **Step 3: Create `Integrations.tsx`**

Two-column layout: copy on the left (kicker `WORKS WITH YOUR STACK`, title "Sorno does not
replace your ERP.", lead explaining it connects the systems teams already rely on), and
`INTEGRATIONS.map` into a grid of neutral category chips on the right. **No vendor logos.**

- [ ] **Step 4: Mount all three in `App.tsx`, add `id="roles"` to Roles**

- [ ] **Step 5: Verify the build and browser at three widths**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Pipeline.tsx frontend/src/components/Roles.tsx frontend/src/components/Integrations.tsx frontend/src/styles/sections frontend/src/App.tsx
git commit -m "feat: add pipeline, roles, and integrations sections"
```

---

## Task 12: Contact form and footer

**Files:**
- Create: `frontend/src/components/Contact.tsx`, `frontend/src/components/Footer.tsx`
- Create: `frontend/src/styles/sections/contact.css`
- Test: `frontend/src/components/Contact.test.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Contact } from './Contact'

describe('Contact', () => {
  it('rejects submission when required fields are empty', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    await user.click(screen.getByRole('button', { name: /send/i }))
    expect(screen.getByText(/please enter your name/i)).toBeInTheDocument()
    expect(screen.queryByText(/thanks/i)).not.toBeInTheDocument()
  })

  it('rejects an invalid email address', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    await user.type(screen.getByLabelText(/name/i), 'Dana Okafor')
    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /send/i }))
    expect(screen.getByText(/valid work email/i)).toBeInTheDocument()
  })

  it('shows a success state once the form is valid', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    await user.type(screen.getByLabelText(/name/i), 'Dana Okafor')
    await user.type(screen.getByLabelText(/email/i), 'dana@example.com')
    await user.type(screen.getByLabelText(/company/i), 'Example Reman')
    await user.click(screen.getByRole('button', { name: /send/i }))
    expect(await screen.findByText(/thanks/i)).toBeInTheDocument()
  })

  it('associates each error with its field for screen readers', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    await user.click(screen.getByRole('button', { name: /send/i }))
    expect(screen.getByLabelText(/name/i)).toHaveAttribute('aria-invalid', 'true')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- Contact`
Expected: FAIL — cannot resolve `./Contact`.

- [ ] **Step 3: Implement `frontend/src/components/Contact.tsx`**

Controlled form with fields Name, Work email, Company, Role (optional), Message (optional).
Validation runs on submit:

```ts
const errors: Record<string, string> = {}
if (!values.name.trim()) errors.name = 'Please enter your name.'
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Please enter a valid work email.'
if (!values.company.trim()) errors.company = 'Please enter your company.'
```

On success, if `FORM_ENDPOINT` is a non-empty string, `POST` the values as JSON; otherwise
resolve immediately. Either way set `sent` true and render:

> **Thanks — we'll be in touch.** We read every message and usually reply within a day.

Each input gets `aria-invalid`, `aria-describedby` pointing at its error node, and the error
node gets `role="alert"`.

Include the honest positioning copy: Sorno is being built alongside a small number of
repair and remanufacturing operations, and is not generally available yet.

- [ ] **Step 3b: Add the inline Calendly embed**

Create `frontend/src/components/CalendlyInline.tsx`. The embed loads a third-party script,
so it must not run on page load — mount it only when the contact section scrolls into view.

```tsx
import { useEffect, useState } from 'react'
import { useInView } from '../hooks/useInView'
import { BOOKING_URL } from '../data/site'

const SCRIPT_SRC = 'https://assets.calendly.com/assets/external/widget.js'

export function CalendlyInline() {
  const { ref, inView } = useInView<HTMLDivElement>('0px 0px 10% 0px')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!inView || !BOOKING_URL) return
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onerror = () => setFailed(true)
    document.body.appendChild(script)
  }, [inView])

  if (!BOOKING_URL) return null

  return (
    <div className="calendly" ref={ref}>
      <p className="mono micro-label">BOOK DIRECTLY</p>
      {failed ? (
        <p>
          The scheduler could not load.{' '}
          <a className="text-link" href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
            Open it in a new tab
          </a>
          .
        </p>
      ) : (
        <>
          {inView && (
            <div
              className="calendly-inline-widget"
              data-url={`${BOOKING_URL}?hide_gdpr_banner=1&background_color=ffffff&primary_color=227c7b`}
              style={{ minWidth: '320px', height: '660px' }}
            />
          )}
          <noscript>
            <a className="text-link" href={BOOKING_URL}>Book a 30-minute conversation</a>
          </noscript>
        </>
      )}
    </div>
  )
}
```

Render `<CalendlyInline />` beside the form: two columns above 900px, stacked below, with
the form first in DOM order so keyboard users reach it before the embed's iframe.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- Contact`
Expected: PASS, 4 tests.

- [ ] **Step 5: Implement `Footer.tsx`**

Wordmark (reusing `Mark` from `Nav.tsx`), the four nav anchors, and `© 2026 Sorno`. No
social links — none exist.

- [ ] **Step 6: Mount both in `App.tsx` with `id="contact"` on the section**

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Contact.tsx frontend/src/components/Contact.test.tsx frontend/src/components/Footer.tsx frontend/src/styles/sections/contact.css frontend/src/App.tsx
git commit -m "feat: add contact form and footer"
```

---

## Task 13: Document head, favicon, and social cards

**Files:**
- Modify: `frontend/index.html`
- Create: `frontend/public/favicon.svg`

- [ ] **Step 1: Create `frontend/public/favicon.svg`**

A 32×32 SVG matching the three-bar mark: a `--teal` (#227c7b) rounded square with three
vertical light bars at descending opacity (1, 0.65, 0.35).

- [ ] **Step 2: Rewrite the `<head>` in `frontend/index.html`**

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sorno — Where is unit R-1842?</title>
<meta name="description" content="Sorno unifies your ERP, MES, quality, and inventory data around every unit on your floor, so anyone can answer where it is and what is blocking it in seconds." />
<meta name="theme-color" content="#227c7b" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="canonical" href="https://sorno.com/" />

<meta property="og:type" content="website" />
<meta property="og:title" content="Sorno — the operating system for repair and remanufacturing" />
<meta property="og:description" content="One operational record for every unit. Sorno connects the systems you already run and makes the whole lifecycle visible." />
<meta property="og:url" content="https://sorno.com/" />
<meta name="twitter:card" content="summary_large_image" />

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" />
```

Update `og:url` and `canonical` when the real domain is known.

- [ ] **Step 3: Remove the font `@import` from `tokens.css`**

The stylesheet link in `index.html` replaces it. A CSS `@import` of a remote stylesheet is
render-blocking and serialises the font request behind the CSS request.

- [ ] **Step 4: Verify**

Run: `npm run build`, then load the dev server and confirm the network panel shows no 404
for `favicon.svg` and that fonts still load.

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html frontend/public/favicon.svg frontend/src/styles/tokens.css
git commit -m "feat: add favicon, social cards, and non-blocking font loading"
```

---

## Task 14: Responsive, accessibility, and final verification

**Files:** any requiring fixes.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS, all files.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: exit 0, no TypeScript errors.

- [ ] **Step 3: Check every breakpoint**

Load the dev server at 320px, 375px, 768px, 1280px, and 1600px. At each width confirm:
no horizontal page scroll, no element overlapping another, no text clipped, and every
table or tab bar that overflows scrolls inside its own container.

- [ ] **Step 4: Keyboard-only pass**

Tab through the entire page. Confirm a visible focus ring on every interactive element,
that both tablists respond to arrow/Home/End, that the contact form is completable, and
that no interaction requires hover.

- [ ] **Step 5: Reduced-motion pass**

Enable reduced motion emulation. Confirm entrance animations are absent, the typewriter
renders instantly, and the caret does not blink.

- [ ] **Step 6: Anchor-offset check**

Click each nav link. Confirm the sticky nav never covers the heading of the target section.

- [ ] **Step 7: Honesty audit**

Grep the built output for fabricated proof:

```bash
cd frontend && npm run build && grep -riE "customers|trusted by|testimonial|% (faster|increase)" dist/assets/*.js || echo "clean"
```

Expected: `clean`, or only matches that are clearly generic product copy rather than claims.

- [ ] **Step 8: Commit any fixes**

```bash
git add -A frontend
git commit -m "fix: responsive and accessibility corrections from verification pass"
```

---

## Self-review notes

**Spec coverage.** §4.1 Nav → Task 6. §4.2 Hero → Task 7. §4.3 → Task 8. §4.4 → Task 9.
§4.5 → Task 10. §4.6–4.8 → Task 11. §4.9 → Task 12. §4.10 → Task 12. §5 tokens/type/space/
elevation → Task 2. §5 craft details → Tasks 2 (typography, focus, selection, scroll-margin,
tabular numerals), 5 (touch targets, hover), 13 (favicon, OG, font loading). §6 file
structure → Tasks 3–12. §7 accessibility → Tasks 8, 9, 10, 12, 14. §8 responsive → Tasks
7–11, 14. §9 verification → Task 14.

**Known deviation.** The plan does not transcribe every presentational CSS declaration, as
stated in the scope note. All CSS with layout consequences — grid definitions, breakpoint
behaviour, overflow containment — is specified.
