import { useEffect, useRef, useState } from 'react'

/**
 * Fires when the element scrolls into view. Used for entrance animations.
 * By default (`once: true`) it fires a single time and stops observing —
 * right for content that should only ever load or animate once, like a
 * third-party embed. Pass `once: false` to keep tracking visibility instead:
 * `inView` toggles back to false when the element scrolls out of view and
 * back to true each time it re-enters, for content that should replay its
 * entrance animation every time a visitor scrolls back to it.
 */
export function useInView<T extends HTMLElement>(rootMargin = '0px 0px -12% 0px', once = true) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return
    }

    // No fallback for a hidden document on purpose. IntersectionObserver delivers
    // no entries while a tab is in the background, but it does deliver them once
    // the tab becomes visible, so this self-heals. Revealing eagerly instead would
    // also trip consumers that gate a third-party embed on first view.
    // Content is protected from JS never running by the html.js gate in base.css.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (once) {
          if (entry.isIntersecting) {
            setInView(true)
            observer.disconnect()
          }
          return
        }
        setInView(entry.isIntersecting)
      },
      { rootMargin, threshold: 0.1 },
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [rootMargin, once])

  return { ref, inView }
}
