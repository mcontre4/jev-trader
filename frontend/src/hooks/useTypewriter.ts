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
