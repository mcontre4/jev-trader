import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTypewriter } from './useTypewriter'

describe('useTypewriter', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    window.matchMedia = originalMatchMedia
  })

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
