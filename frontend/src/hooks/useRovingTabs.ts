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
