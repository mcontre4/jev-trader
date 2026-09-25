import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from './useTypewriter'
import type { ChatTurn } from '../data/demo'

export type RevealedTurn = { text: string; done: boolean }

const PAUSE_MS = 550
const TICK_MS = 16
const CHARS_PER_TICK = 2

/**
 * Replays a scripted chat thread turn by turn: user turns appear whole after a
 * reading pause, Sorno turns type out character by character. Restarts whenever
 * `thread` changes identity, so picking a different preset question resets the reveal.
 */
export function useChatReplay(thread: ChatTurn[], active: boolean): RevealedTurn[] {
  const reduced = usePrefersReducedMotion()
  const [revealed, setRevealed] = useState<RevealedTurn[]>([])

  useEffect(() => {
    if (!active) {
      setRevealed([])
      return
    }

    let cancelled = false
    const timers: number[] = []
    // Nothing is revealed until its own turn starts — no message box or avatar
    // should exist before the turn it belongs to has actually begun.
    setRevealed([])

    const revealNext = (i: number) => {
      if (cancelled || i >= thread.length) return
      const turn = thread[i]

      if (turn.role === 'user' || reduced) {
        setRevealed((prev) => {
          const next = [...prev]
          next[i] = { text: turn.text, done: true }
          return next
        })
        timers.push(window.setTimeout(() => revealNext(i + 1), reduced ? 0 : PAUSE_MS))
        return
      }

      // The bubble (and its avatar) appears the instant typing starts, not before.
      setRevealed((prev) => {
        const next = [...prev]
        next[i] = { text: '', done: false }
        return next
      })

      let index = 0
      const id = window.setInterval(() => {
        index = Math.min(index + CHARS_PER_TICK, turn.text.length)
        const done = index >= turn.text.length
        setRevealed((prev) => {
          const next = [...prev]
          next[i] = { text: turn.text.slice(0, index), done }
          return next
        })
        if (done) {
          window.clearInterval(id)
          timers.push(window.setTimeout(() => revealNext(i + 1), PAUSE_MS))
        }
      }, TICK_MS)
      timers.push(id)
    }

    revealNext(0)

    return () => {
      cancelled = true
      timers.forEach((id) => {
        window.clearTimeout(id)
        window.clearInterval(id)
      })
    }
  }, [thread, active, reduced])

  return revealed
}
