import { useEffect, useState } from 'react'
import { useInView } from '../hooks/useInView'
import { BOOKING_URL } from '../data/site'

const SCRIPT_SRC = 'https://assets.calendly.com/assets/external/widget.js'

export function CalendlyInline() {
  const { ref, inView } = useInView<HTMLDivElement>('0px 0px 10% 0px')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!inView || !BOOKING_URL) return
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onerror = () => setFailed(true)
    document.body.appendChild(script)
  }, [inView])

  if (!BOOKING_URL) return null

  return (
    <div className="calendly" ref={ref}>
      <p className="mono micro-label">BOOK DIRECTLY</p>
      {failed ? (
        <p>
          The scheduler could not load.{' '}
          <a className="text-link" href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
            Open it in a new tab
          </a>
          .
        </p>
      ) : (
        <>
          {inView && (
            <div
              className="calendly-inline-widget"
              data-url={`${BOOKING_URL}?hide_gdpr_banner=1&background_color=ffffff&primary_color=227c7b`}
              style={{ minWidth: '320px', height: '660px' }}
            />
          )}
          <noscript>
            <a className="text-link" href={BOOKING_URL}>Book a 30-minute conversation</a>
          </noscript>
        </>
      )}
    </div>
  )
}
