import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useInView } from './useInView'

/** Captures the observer callback so a test can report intersection changes on demand. */
function mockIntersectionObserver() {
  const original = window.IntersectionObserver
  let callback: IntersectionObserverCallback | null = null
  let disconnected = false

  window.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      callback = cb
    }
    observe() {}
    unobserve() {}
    disconnect() {
      disconnected = true
    }
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  } as unknown as typeof IntersectionObserver

  return {
    report(isIntersecting: boolean) {
      callback?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
    },
    isDisconnected: () => disconnected,
    restore: () => { window.IntersectionObserver = original },
  }
}

function Probe({ once }: { once?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>(undefined, once)
  return <div ref={ref}>{inView ? 'in' : 'out'}</div>
}

describe('useInView', () => {
  it('defaults to once: true — stays in view and disconnects after the first intersection', () => {
    const observer = mockIntersectionObserver()
    render(<Probe />)

    expect(screen.getByText('out')).toBeInTheDocument()
    act(() => observer.report(true))
    expect(screen.getByText('in')).toBeInTheDocument()
    expect(observer.isDisconnected()).toBe(true)

    // Leaving view afterward has no effect once disconnected.
    act(() => observer.report(false))
    expect(screen.getByText('in')).toBeInTheDocument()
    observer.restore()
  })

  it('with once: false, toggles back to out of view on exit, and in view again on re-entry', () => {
    const observer = mockIntersectionObserver()
    render(<Probe once={false} />)

    act(() => observer.report(true))
    expect(screen.getByText('in')).toBeInTheDocument()
    expect(observer.isDisconnected()).toBe(false)

    act(() => observer.report(false))
    expect(screen.getByText('out')).toBeInTheDocument()

    act(() => observer.report(true))
    expect(screen.getByText('in')).toBeInTheDocument()
    observer.restore()
  })
})
