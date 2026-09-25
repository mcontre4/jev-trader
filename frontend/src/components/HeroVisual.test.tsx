import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeroVisual } from './HeroVisual'
import { HERO_OPERATIONS, HERO_TECHNICIAN } from '../data/demo'

// Every field in the cascade types out via its own `useTypewriter` instance,
// gated by a React state update from the field before it (mirroring
// `SornoAnswer` in FragmentedAnswer.tsx) rather than one self-contained
// recursive timer chain (as `useChatReplay` uses). That means each stage's
// timer is only registered once React re-renders after the previous stage's
// state update commits — so a single giant `advanceTimersByTime` jump can
// outrun renders and never reach later stages. Stepping in small increments,
// each in its own `act()`, gives React a chance to flush and register the
// next stage's timer before advancing further.
async function advanceInSteps(totalMs: number, stepMs = 20) {
  let remaining = totalMs
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining)
    await act(async () => { vi.advanceTimersByTime(step) })
    remaining -= step
  }
}

const CASCADE_BUDGET_MS = 6000

describe('HeroVisual', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('opens on the Operations tab', () => {
    render(<HeroVisual />)
    expect(screen.getByRole('tab', { name: 'Operations' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Technician' })).toHaveAttribute('aria-selected', 'false')
  })

  it('reveals the full Operations answer after the cascade completes', async () => {
    render(<HeroVisual />)
    await advanceInSteps(CASCADE_BUDGET_MS)
    const panel = screen.getByTestId('hero-visual-panel')
    expect(panel).toHaveTextContent(HERO_OPERATIONS.question)
    expect(panel).toHaveTextContent(HERO_OPERATIONS.stat)
    for (const unit of HERO_OPERATIONS.units) {
      expect(panel).toHaveTextContent(unit.id)
      expect(panel).toHaveTextContent(unit.title)
      expect(panel).toHaveTextContent(unit.detail)
    }
    expect(panel).toHaveTextContent(HERO_OPERATIONS.recommendation)
    for (const source of HERO_OPERATIONS.sources) {
      expect(screen.getAllByText(source).length).toBeGreaterThan(0)
    }
  })

  it('switches to the Technician tab and reveals its answer', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<HeroVisual />)
    await user.click(screen.getByRole('tab', { name: 'Technician' }))
    expect(screen.getByRole('tab', { name: 'Technician' })).toHaveAttribute('aria-selected', 'true')
    await advanceInSteps(CASCADE_BUDGET_MS)
    const panel = screen.getByTestId('hero-visual-panel')
    expect(panel).toHaveTextContent(HERO_TECHNICIAN.question)
    for (const check of HERO_TECHNICIAN.checks) {
      expect(panel).toHaveTextContent(check)
    }
    for (const doc of HERO_TECHNICIAN.documentation) {
      expect(panel).toHaveTextContent(doc)
    }
    expect(panel).toHaveTextContent(HERO_TECHNICIAN.similarRepair.text)
    for (const source of HERO_TECHNICIAN.sources) {
      expect(screen.getAllByText(source).length).toBeGreaterThan(0)
    }
  })

  it('supports arrow key navigation between tabs', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<HeroVisual />)
    await user.click(screen.getByRole('tab', { name: 'Operations' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Technician' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Operations' })).toHaveAttribute('aria-selected', 'true')
  })

  it('does not auto-switch to Technician once the visitor has picked a tab themselves', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<HeroVisual />)
    await user.click(screen.getByRole('tab', { name: 'Operations' }))
    await advanceInSteps(CASCADE_BUDGET_MS + 10000)
    expect(screen.getByRole('tab', { name: 'Operations' })).toHaveAttribute('aria-selected', 'true')
  })

  it('auto-demos the Technician tab once after the Operations answer has been visible for a while', async () => {
    render(<HeroVisual />)
    await advanceInSteps(CASCADE_BUDGET_MS + 5000)
    expect(screen.getByRole('tab', { name: 'Technician' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows the full content immediately under reduced motion, without advancing timers', () => {
    const original = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia

    render(<HeroVisual />)
    const panel = screen.getByTestId('hero-visual-panel')
    expect(panel).toHaveTextContent(HERO_OPERATIONS.recommendation)

    window.matchMedia = original
  })
})
