import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FragmentedAnswer } from './FragmentedAnswer'
import { SOURCES, RECONCILED } from '../data/demo'

// jsdom's IntersectionObserver stub (src/test/setup.ts) never actually reports an
// intersection, so the Sorno answer's scroll-gated reveal would never fire in tests.
// This swaps in a stub that reports "intersecting" as soon as something observes it,
// standing in for the section having scrolled into view.
function mockIntersecting() {
  const original = window.IntersectionObserver
  window.IntersectionObserver = class {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as never)
    }
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
    root = null
    rootMargin = ''
    thresholds = []
  } as unknown as typeof IntersectionObserver
  return () => { window.IntersectionObserver = original }
}

/** Captures the observer callback so a test can report leaving/re-entering view on demand. */
function mockToggleableIntersection() {
  const original = window.IntersectionObserver
  let callback: IntersectionObserverCallback | null = null
  window.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      callback = cb
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
    root = null
    rootMargin = ''
    thresholds = []
  } as unknown as typeof IntersectionObserver
  return {
    report(isIntersecting: boolean) {
      callback?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
    },
    restore: () => { window.IntersectionObserver = original },
  }
}

async function advanceInSteps(steps: number, stepMs = 100) {
  for (let i = 0; i < steps; i++) {
    await act(async () => { vi.advanceTimersByTime(stepMs) })
  }
}

describe('FragmentedAnswer', () => {
  afterEach(() => vi.useRealTimers())


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

  it('does not start generating the reconciled answer before its section scrolls into view', () => {
    render(<FragmentedAnswer />)
    expect(screen.getByText(RECONCILED.heading)).toBeInTheDocument()
    expect(screen.queryByText(RECONCILED.headline)).not.toBeInTheDocument()
  })

  it('generates the reconciled answer once its section scrolls into view', async () => {
    const restoreIntersectionObserver = mockIntersecting()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<FragmentedAnswer />)
    // Small stepped advances, not one big jump: each of the headline/body/conflict
    // typewriters only starts once the previous one's completion has been committed,
    // so React needs a chance to render between steps for the chain to progress.
    await advanceInSteps(60)
    expect(screen.getByText(RECONCILED.headline)).toBeInTheDocument()
    expect(screen.getByText(RECONCILED.body)).toBeInTheDocument()
    expect(screen.getByText(RECONCILED.conflict)).toBeInTheDocument()
    restoreIntersectionObserver()
  })

  it('regenerates the reconciled answer from scratch each time it scrolls back into view', async () => {
    const observer = mockToggleableIntersection()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<FragmentedAnswer />)

    act(() => observer.report(true))
    await advanceInSteps(60)
    expect(screen.getByText(RECONCILED.headline)).toBeInTheDocument()
    expect(screen.getByText(RECONCILED.conflict)).toBeInTheDocument()

    // Scrolled out of view: the generated answer clears rather than staying rendered.
    act(() => observer.report(false))
    expect(screen.queryByText(RECONCILED.headline)).not.toBeInTheDocument()

    // Scrolled back into view: it plays again from the top, not just resumes.
    act(() => observer.report(true))
    expect(screen.queryByText(RECONCILED.conflict)).not.toBeInTheDocument()
    await advanceInSteps(60)
    expect(screen.getByText(RECONCILED.headline)).toBeInTheDocument()
    expect(screen.getByText(RECONCILED.body)).toBeInTheDocument()
    expect(screen.getByText(RECONCILED.conflict)).toBeInTheDocument()

    observer.restore()
  })

  it('scores the cost of the search alongside the answer', () => {
    render(<FragmentedAnswer />)
    for (const stat of RECONCILED.tally.stats) {
      expect(screen.getByText(stat.label)).toBeInTheDocument()
      expect(screen.getByText(stat.value)).toBeInTheDocument()
    }
  })

  it('explains why each source is not enough on its own', async () => {
    const user = userEvent.setup()
    render(<FragmentedAnswer />)
    expect(screen.getByText(SOURCES[0].problem)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Quality system/ }))
    expect(screen.getByText(SOURCES[2].problem)).toBeInTheDocument()
  })
})
