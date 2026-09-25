import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AskSorno } from './AskSorno'
import { QUESTIONS, type ChatTurn } from '../data/demo'

// Mirrors useChatReplay's own timing so tests can advance fake timers to exactly
// the moment a thread finishes, without overshooting into the 2s auto-advance
// pause that follows completion (see AskSorno's isComplete effect).
const PAUSE_MS = 550
const TICK_MS = 16
const CHARS_PER_TICK = 2

function timeToComplete(thread: ChatTurn[]) {
  return thread.reduce((total, turn, i) => {
    const revealTime = turn.role === 'sorno' ? Math.ceil(turn.text.length / CHARS_PER_TICK) * TICK_MS : 0
    const isLast = i === thread.length - 1
    return total + revealTime + (isLast ? 0 : PAUSE_MS)
  }, 0)
}

// jsdom's IntersectionObserver stub (src/test/setup.ts) never actually reports an
// intersection, so the section's scroll-gated autoplay would never fire in tests.
// This swaps in a stub that reports "intersecting" as soon as something observes
// it, standing in for the section having scrolled into view.
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

describe('AskSorno', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('renders every preset question as a button, labelled by its opening message', () => {
    render(<AskSorno />)
    for (const item of QUESTIONS) {
      expect(screen.getByRole('button', { name: item.thread[0].text })).toBeInTheDocument()
    }
  })

  it('replays the full thread, including the follow-up turn, for the selected question', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<AskSorno />)
    await user.click(screen.getByRole('button', { name: QUESTIONS[0].thread[0].text }))
    await act(async () => { vi.advanceTimersByTime(timeToComplete(QUESTIONS[0].thread) + 200) })
    const answer = screen.getByTestId('ask-answer')
    for (const turn of QUESTIONS[0].thread) {
      expect(answer).toHaveTextContent(turn.text)
    }
  })

  it('shows evidence chips under each Sorno turn once it completes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<AskSorno />)
    await user.click(screen.getByRole('button', { name: QUESTIONS[0].thread[0].text }))
    await act(async () => { vi.advanceTimersByTime(timeToComplete(QUESTIONS[0].thread) + 200) })
    const sornoTurns = QUESTIONS[0].thread.filter((t) => t.role === 'sorno')
    for (const turn of sornoTurns) {
      for (const source of turn.sources) {
        expect(screen.getAllByText(source).length).toBeGreaterThan(0)
      }
    }
  })

  it('surfaces the stated limitation when a turn has one', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<AskSorno />)
    const withNote = QUESTIONS.find((q) => q.thread.some((t) => t.role === 'sorno' && t.note))!
    await user.click(screen.getByRole('button', { name: withNote.thread[0].text }))
    await act(async () => { vi.advanceTimersByTime(timeToComplete(withNote.thread) + 200) })
    const note = withNote.thread.find((t) => t.role === 'sorno' && t.note)
    expect(note?.role).toBe('sorno')
    expect(screen.getByText((note as { note: string }).note)).toBeInTheDocument()
  })

  it('exposes the answer region as a polite live region', async () => {
    render(<AskSorno />)
    expect(screen.getByTestId('ask-answer')).toHaveAttribute('aria-live', 'polite')
  })

  it('restarts the replay from the first turn when a different question is picked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<AskSorno />)
    await user.click(screen.getByRole('button', { name: QUESTIONS[0].thread[0].text }))
    await act(async () => { vi.advanceTimersByTime(timeToComplete(QUESTIONS[0].thread) + 200) })
    await user.click(screen.getByRole('button', { name: QUESTIONS[1].thread[0].text }))
    await act(async () => { vi.advanceTimersByTime(timeToComplete(QUESTIONS[1].thread) + 200) })
    const answer = screen.getByTestId('ask-answer')
    expect(answer).toHaveTextContent(QUESTIONS[1].thread[0].text)
    expect(answer).not.toHaveTextContent(QUESTIONS[0].thread[2].text)
  })

  it('auto-advances to the next question two seconds after a thread completes on its own', async () => {
    const restoreIntersectionObserver = mockIntersecting()
    render(<AskSorno />)
    // Stop just short of the 2s auto-advance pause: still on question 0.
    await act(async () => { vi.advanceTimersByTime(timeToComplete(QUESTIONS[0].thread) + 200) })
    expect(screen.getByTestId('ask-answer')).toHaveTextContent(QUESTIONS[0].thread[0].text)
    // Cross the 2s pause: should now be replaying question 1 from the top.
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(screen.getByTestId('ask-answer')).toHaveTextContent(QUESTIONS[1].thread[0].text)
    restoreIntersectionObserver()
  })

  it('loops back to the first question after the last one finishes, unprompted', async () => {
    const restoreIntersectionObserver = mockIntersecting()
    render(<AskSorno />)
    // Ride the unprompted auto-advance all the way from question 0 to the last one.
    for (let i = 0; i < QUESTIONS.length - 1; i++) {
      await act(async () => { vi.advanceTimersByTime(timeToComplete(QUESTIONS[i].thread) + 200) })
      await act(async () => { vi.advanceTimersByTime(2000) })
    }
    const last = QUESTIONS[QUESTIONS.length - 1]
    expect(screen.getByTestId('ask-answer')).toHaveTextContent(last.thread[0].text)
    // Split into two advances so the isComplete effect commits and registers the
    // 2s follow-up timer before the second advance is what fires it — a single
    // combined jump registers that timer too late to be caught in the same pass.
    await act(async () => { vi.advanceTimersByTime(timeToComplete(last.thread) + 200) })
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(screen.getByTestId('ask-answer')).toHaveTextContent(QUESTIONS[0].thread[0].text)
    restoreIntersectionObserver()
  })

  it('stops auto-advancing once the visitor picks a question themselves', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<AskSorno />)
    await user.click(screen.getByRole('button', { name: QUESTIONS[1].thread[0].text }))
    await act(async () => { vi.advanceTimersByTime(timeToComplete(QUESTIONS[1].thread) + 200) })
    // Well past the 2s auto-advance pause: should still be sitting on question 1.
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(screen.getByTestId('ask-answer')).toHaveTextContent(QUESTIONS[1].thread[0].text)
  })
})
