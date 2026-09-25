import { useEffect, useState } from 'react'
import { useInView } from '../hooks/useInView'
import { TALLY_FORM_ID, TALLY_FORM_URL } from '../data/site'

const SCRIPT_SRC = 'https://tally.so/widgets/embed.js'

const EMBED_SRC =
  `https://tally.so/embed/${TALLY_FORM_ID}` +
  '?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1'

declare global {
  interface Window {
    Tally?: { loadEmbeds: () => void }
  }
}

/**
 * Tally's inline embed. Like the Calendly embed, the third-party script is only
 * fetched once the section scrolls into view rather than on page load.
 *
 * The iframe carries `data-tally-src` rather than `src`; embed.js promotes it and
 * wires up the height messages that `dynamicHeight=1` sends. If the script is
 * blocked the iframe never loads, so the fallback link is what the visitor gets.
 */
export function TallyForm() {
  const { ref, inView } = useInView<HTMLDivElement>('0px 0px 10% 0px')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!inView) return

    // Already loaded by an earlier mount — just ask Tally to pick up this iframe.
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      window.Tally?.loadEmbeds()
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onerror = () => setFailed(true)
    document.body.appendChild(script)
  }, [inView])

  return (
    <div className="tally" ref={ref}>
      <p className="mono micro-label">TELL US ABOUT YOUR OPERATION</p>
      {failed ? (
        <p>
          The form could not load.{' '}
          <a
            className="text-link"
            href={TALLY_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open it in a new tab
          </a>
          .
        </p>
      ) : (
        <>
          {inView && (
            <iframe
              data-tally-src={EMBED_SRC}
              loading="lazy"
              width="100%"
              height="280"
              frameBorder="0"
              title="Contact Sorno"
            />
          )}
          <noscript>
            <a className="text-link" href={TALLY_FORM_URL}>
              Open the contact form
            </a>
          </noscript>
        </>
      )}
    </div>
  )
}
