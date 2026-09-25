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
