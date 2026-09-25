import { useRef, useState } from 'react'
import { SectionHeader } from './primitives/SectionHeader'
import { StatusPill } from './primitives/StatusPill'
import { SourceBadge } from './primitives/SourceBadge'
import { useRovingTabs } from '../hooks/useRovingTabs'
import { useTypewriter } from '../hooks/useTypewriter'
import { useInView } from '../hooks/useInView'
import { SOURCES, RECONCILED, UNIT } from '../data/demo'
import type { Source, SourceScreen } from '../data/demo'
import '../styles/sections/fragmented.css'

const SHARED_DRIVE_PREVIEWS = [
  '/images/r-1842-exterior-v2.png',
  '/images/r-1842-internals-v2.png',
  '/images/r-1842-cover-seal-v3.png',
]

/**
 * Renders the source system in the shape that system actually uses. `answer` is the
 * system's headline claim; the message thread renders it as the first chat bubble
 * instead of showing it separately above the screen.
 */
function SourceScreenBody({ screen, answer }: { screen: SourceScreen; answer: string }) {
  switch (screen.kind) {
    case 'fields':
      return (
        <dl className="frag-fields">
          {screen.fields.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd className={f.tone ? `frag-value-${f.tone}` : undefined}>{f.value}</dd>
            </div>
          ))}
        </dl>
      )

    case 'table':
      return (
        <table className="frag-table">
          <thead>
            <tr>
              {screen.columns.map((c) => (
                <th key={c} scope="col">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {screen.rows.map((row) => (
              <tr key={row.cells[0]} className={row.tone ? `frag-row-${row.tone}` : undefined}>
                {row.cells.map((cell, i) => (
                  <td key={cell} className={i === 0 ? 'mono' : undefined}>
                    {i === row.cells.length - 1 && row.tone ? (
                      <StatusPill tone={row.tone} label={cell} />
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )

    case 'files':
      return (
        <div className="frag-files">
          {screen.files.map((f, index) => (
            <div className="frag-file" key={f.name}>
              <img
                className="frag-file-preview"
                src={SHARED_DRIVE_PREVIEWS[index]}
                alt=""
              />
              <span className="frag-file-name mono">{f.name}</span>
              <span className="frag-file-meta">{f.meta}</span>
            </div>
          ))}
          <p className="frag-file-empty">{screen.empty}</p>
        </div>
      )

    case 'message':
      return (
        <div className="frag-thread">
          <div className="frag-msg">
            <span className="frag-avatar" aria-hidden="true">{screen.avatar}</span>
            <div>
              <p className="frag-msg-meta">
                {screen.from} <span>{screen.time}</span>
              </p>
              <p className="frag-bubble frag-bubble-them">{answer}</p>
            </div>
          </div>
          <div className="frag-msg frag-msg-mine">
            <div>
              <p className="frag-msg-meta">
                {screen.reply.from} <span>{screen.reply.time}</span>
              </p>
              <p className="frag-bubble frag-bubble-me">{screen.reply.body}</p>
            </div>
          </div>
          <p className="frag-typing" aria-hidden="true">
            <i /><i /><i /> no reply
          </p>
        </div>
      )
  }
}

function SourcePanel({ source }: { source: Source }) {
  const isMessage = source.screen.kind === 'message'

  return (
    <>
      {/* Our commentary on the system sits outside the window, so everything inside
          the frame stays a faithful facsimile of that system's own screen. */}
      <div className={`frag-verdict frag-verdict-${source.tone}`}>
        <div className="frag-verdict-copy">
          <p className="frag-verdict-label mono">{source.failure}</p>
          <p className="frag-verdict-text">{source.problem}</p>
        </div>
        <span className="frag-verdict-elapsed mono">{source.elapsed}</span>
      </div>

      <div className="frag-window">
        <div className="frag-chrome">
          <span className="frag-dots" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="frag-chrome-title mono">{source.label}</span>
          <span className="frag-chrome-record mono">{source.recordId}</span>
          <span className="frag-chrome-stamp mono">{source.stamp}</span>
        </div>

        <div className="frag-screen">
          {/* For the message thread the answer IS the first bubble, so it renders
              inside the screen body rather than above it. */}
          {!isMessage && <p className="frag-answer">{source.answer}</p>}
          <SourceScreenBody screen={source.screen} answer={source.answer} />
        </div>
      </div>
    </>
  )
}

/* The payoff screen types out rather than appearing whole, so it reads as Sorno
 * actively generating the reconciled answer rather than a pre-written callout.
 * Headline, then body, then the conflict flag, each starting once the one before
 * it finishes — the evidence chips and the "One answer" status land only at the end.
 * `once: false` means this replays from scratch every time the card scrolls back
 * into view, not just the first time — leaving view resets `inView` to false, which
 * resets the headline typewriter, which cascades to reset body and conflict too. */
function SornoAnswer() {
  const { ref, inView } = useInView<HTMLDivElement>(undefined, false)
  const headline = useTypewriter(RECONCILED.headline, inView)
  const body = useTypewriter(RECONCILED.body, headline.done)
  const conflict = useTypewriter(RECONCILED.conflict, body.done)

  return (
    <div className="frag-window frag-sorno" ref={ref}>
      <div className="frag-chrome frag-chrome-sorno">
        <span className="frag-chrome-title frag-sorno-title">Sorno</span>
        <span className="frag-chrome-record mono">{RECONCILED.recordId}</span>
        <StatusPill
          tone={conflict.done ? 'ok' : 'idle'}
          label={conflict.done ? 'One answer' : 'Generating…'}
        />
      </div>

      <div className="frag-screen">
        <p className="frag-answer">
          {headline.shown}
          {!headline.done && <span className="frag-caret" aria-hidden="true" />}
        </p>
        {headline.done && (
          <p className="frag-sorno-body">
            {body.shown}
            {!body.done && <span className="frag-caret" aria-hidden="true" />}
          </p>
        )}
        {body.done && (
          <p className="frag-conflict">
            {conflict.shown}
            {!conflict.done && <span className="frag-caret" aria-hidden="true" />}
          </p>
        )}
        {conflict.done && (
          <div className="frag-evidence">
            <p className="frag-evidence-label mono">DRAWN FROM</p>
            <div className="frag-sources">
              {RECONCILED.sources.map((s) => (
                <SourceBadge key={s}>{s}</SourceBadge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="frag-statusbar">
        <span className="mono">{RECONCILED.stamp}</span>
      </div>
    </div>
  )
}

export function FragmentedAnswer() {
  const [active, setActive] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const select = (index: number) => {
    setActive(index)
    tabRefs.current[index]?.focus()
  }
  const onKeyDown = useRovingTabs(SOURCES.length, active, select)
  const source = SOURCES[active]

  return (
    <section className="section fragmented" id="problem">
      <div className="shell">
        <SectionHeader
          kicker="THE PROBLEM"
          title="Multiple systems. Different answers about your core units."
          lead={
            'Today, answering a routine question means opening the ERP, MES, quality system, ' +
            'and shared drive—then tracking down whoever was on shift. It takes the better ' +
            'part of half an hour, and when the systems disagree, there is no clear answer.'
          }
        />

        <div className="frag-grid">
          <div
            className="frag-tabs"
            role="tablist"
            aria-label="Systems consulted"
            onKeyDown={onKeyDown}
          >
            {SOURCES.map((s, i) => (
              <button
                key={s.key}
                ref={(el) => { tabRefs.current[i] = el }}
                type="button"
                role="tab"
                id={`frag-tab-${s.key}`}
                aria-selected={active === i}
                aria-controls={`frag-panel-${s.key}`}
                tabIndex={active === i ? 0 : -1}
                className={active === i ? 'selected' : ''}
                onClick={() => setActive(i)}
              >
                <span className="frag-tab-label">{s.label}</span>
                <span className="frag-tab-detail">{s.detail}</span>
              </button>
            ))}
          </div>

          <div
            className="frag-view"
            role="tabpanel"
            id={`frag-panel-${source.key}`}
            aria-labelledby={`frag-tab-${source.key}`}
            tabIndex={0}
          >
            <SourcePanel source={source} />
          </div>
        </div>

        <div className="frag-resolve">
          <div className="frag-tally">
            <div className="frag-tally-stats">
              {RECONCILED.tally.stats.map((stat) => (
                <div
                  className={`frag-stat${stat.tone ? ` frag-stat-${stat.tone}` : ''}`}
                  key={stat.label}
                >
                  <p className="frag-stat-value tnum">{stat.value}</p>
                  <p className="frag-stat-label">{stat.label}</p>
                </div>
              ))}
            </div>
            {/* Wrapper carries the rule so it spans the card, while the paragraph
                keeps a readable measure. */}
            <div className="frag-tally-foot">
              <p className="frag-tally-detail">{RECONCILED.tally.detail}</p>
            </div>
          </div>

          <div className="frag-outcome">
            <p className="kicker mono">WITH SORNO</p>
            <h3>{RECONCILED.heading}</h3>
            <p className="lead">{RECONCILED.lead}</p>
          </div>

          {/* Same window chrome as the five source panels, so the payoff reads as a
              sixth screen — the product — rather than a callout. */}
          <SornoAnswer />
        </div>
      </div>
    </section>
  )
}
