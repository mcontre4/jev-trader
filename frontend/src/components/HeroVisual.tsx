import { useEffect, useRef, useState } from 'react'
import { StatusPill } from './primitives/StatusPill'
import { SourceBadge } from './primitives/SourceBadge'
import { useRovingTabs } from '../hooks/useRovingTabs'
import { useTypewriter, usePrefersReducedMotion } from '../hooks/useTypewriter'
import { HERO_OPERATIONS, HERO_TECHNICIAN } from '../data/demo'
import type { StatusTone } from '../data/demo'
import { DEMO_DISCLAIMER } from '../data/site'
import '../styles/sections/hero-visual.css'

type Mode = 'operations' | 'technician'

const TABS: { key: Mode; label: string }[] = [
  { key: 'operations', label: 'Operations' },
  { key: 'technician', label: 'Technician' },
]

// How long the "thinking" pause lasts between the question finishing and the
// structured answer starting to reveal. Skipped entirely under reduced motion.
const THINK_MS = 500
// How long the Operations answer stays fully visible before auto-demoing the
// Technician tab once, unless the visitor has already picked a tab themselves.
const AUTO_SWITCH_MS = 4000

function riskLabel(tone: StatusTone) {
  return tone === 'blocked' ? 'High risk' : 'Medium risk'
}

function Caret({ show }: { show: boolean }) {
  if (!show) return null
  return <span className="hv-caret" aria-hidden="true" />
}

const BALL_COUNT = 10
const BALL_RADIUS_FROM_CENTER = 23

/**
 * Cross-section schematic of the shaft/housing/bearing assembly, drawn like an
 * actual mechanical drawing rather than a diagram icon: a hatched housing
 * cross-section (via a mask cut around the bore), a ball bearing with its own
 * inner/outer race and ball ring, bolt holes, a lip seal, and a dimension
 * line — not just an outlined circle standing in for "bearing".
 */
function BearingDiagram() {
  const balls = Array.from({ length: BALL_COUNT }, (_, i) => {
    const angle = (i / BALL_COUNT) * Math.PI * 2
    return {
      cx: 160 + BALL_RADIUS_FROM_CENTER * Math.cos(angle),
      cy: 75 + BALL_RADIUS_FROM_CENTER * Math.sin(angle),
    }
  })

  return (
    <svg viewBox="0 0 320 158" role="img" aria-label="Cross-section schematic of the shaft and bearing housing assembly, with the ball bearing and seat highlighted">
      <defs>
        <linearGradient id="hvMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e6ea" />
          <stop offset="42%" stopColor="#f8f9fa" />
          <stop offset="58%" stopColor="#e2e6ea" />
          <stop offset="100%" stopColor="#b7c1cc" />
        </linearGradient>
        <pattern id="hvHatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--line-strong)" strokeWidth="1" />
        </pattern>
        <mask id="hvBoreMask">
          <rect x="116" y="26" width="88" height="98" fill="white" />
          <circle cx="160" cy="75" r="36" fill="black" />
        </mask>
        <marker id="hvArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--slate-2)" />
        </marker>
      </defs>

      {/* Centerline */}
      <line x1="6" y1="75" x2="314" y2="75" stroke="var(--slate-2)" strokeWidth="0.75" strokeDasharray="10 3 2 3" />

      {/* Shaft, running the full length behind the housing */}
      <rect x="10" y="67" width="300" height="16" rx="3" fill="url(#hvMetal)" stroke="var(--ink-2)" strokeWidth="1.25" />

      {/* Housing cross-section: hatched material with the bore cut out around the bearing */}
      <rect x="116" y="26" width="88" height="98" rx="8" fill="url(#hvHatch)" mask="url(#hvBoreMask)" stroke="var(--ink-2)" strokeWidth="2" />

      {/* Housing mounting bolt holes */}
      {[[132, 32], [188, 32], [132, 118], [188, 118]].map(([bx, by]) => (
        <g key={`${bx}-${by}`}>
          <circle cx={bx} cy={by} r="4.5" fill="var(--surface)" stroke="var(--ink-2)" strokeWidth="1.3" />
          <circle cx={bx} cy={by} r="1.4" fill="var(--ink-2)" />
        </g>
      ))}

      {/* Lip seal, pressed against the shaft at the bore's inner edge */}
      <path d="M194,63 L205,67 L205,83 L194,87 Z" fill="var(--ink-2)" opacity="0.85" />

      {/* Ball bearing: outer race, ball ring, inner race — the highlighted assembly */}
      <circle cx="160" cy="75" r="32" fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="2.5" />
      {balls.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r="3.2" fill="var(--teal-strong)" />
      ))}
      <circle cx="160" cy="75" r="14" fill="var(--surface)" stroke="var(--teal-strong)" strokeWidth="2" />

      {/* Bore diameter dimension line */}
      <line x1="128" y1="112" x2="128" y2="140" stroke="var(--slate-2)" strokeWidth="0.75" />
      <line x1="192" y1="112" x2="192" y2="140" stroke="var(--slate-2)" strokeWidth="0.75" />
      <line x1="128" y1="134" x2="192" y2="134" stroke="var(--slate-2)" strokeWidth="1" markerStart="url(#hvArrow)" markerEnd="url(#hvArrow)" />
      <text x="160" y="150" textAnchor="middle" className="hv-diagram-dim">⌀64 mm bore</text>

      {/* Leader callout to the highlighted bearing seat */}
      <line x1="160" y1="43" x2="160" y2="14" stroke="var(--teal-strong)" strokeWidth="1" />
      <line x1="160" y1="14" x2="222" y2="14" stroke="var(--teal-strong)" strokeWidth="1" />
      <circle cx="160" cy="43" r="2" fill="var(--teal-strong)" />
      <text x="226" y="17" className="hv-diagram-label">Bearing seat</text>
    </svg>
  )
}

export function HeroVisual() {
  const [mode, setMode] = useState<Mode>('operations')
  const [userSelected, setUserSelected] = useState(false)
  const [autoSwitched, setAutoSwitched] = useState(false)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const reduced = usePrefersReducedMotion()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const threadRef = useRef<HTMLDivElement>(null)

  const activeIndex = mode === 'operations' ? 0 : 1
  const selectTab = (index: number) => {
    const next = TABS[index].key
    setUserSelected(true)
    setMode(next)
    tabRefs.current[index]?.focus()
  }
  const onKeyDown = useRovingTabs(TABS.length, activeIndex, selectTab)

  const questionText = mode === 'operations' ? HERO_OPERATIONS.question : HERO_TECHNICIAN.question
  const question = useTypewriter(questionText, true)

  // Once the question finishes typing, pause briefly (as if Sorno is thinking)
  // before the structured answer starts revealing. Resets whenever the mode
  // changes, so switching tabs replays the full sequence from the top.
  useEffect(() => {
    setRevealAnswer(false)
    if (!question.done) return
    if (reduced) {
      setRevealAnswer(true)
      return
    }
    const id = window.setTimeout(() => setRevealAnswer(true), THINK_MS)
    return () => window.clearTimeout(id)
  }, [question.done, mode, reduced])

  const opsActive = mode === 'operations' && revealAnswer
  const stat = useTypewriter(HERO_OPERATIONS.stat, opsActive)
  const u1Title = useTypewriter(HERO_OPERATIONS.units[0].title, stat.done)
  const u1Detail = useTypewriter(HERO_OPERATIONS.units[0].detail, u1Title.done)
  const u2Title = useTypewriter(HERO_OPERATIONS.units[1].title, u1Detail.done)
  const u2Detail = useTypewriter(HERO_OPERATIONS.units[1].detail, u2Title.done)
  const u3Title = useTypewriter(HERO_OPERATIONS.units[2].title, u2Detail.done)
  const u3Detail = useTypewriter(HERO_OPERATIONS.units[2].detail, u3Title.done)
  const recommendation = useTypewriter(HERO_OPERATIONS.recommendation, u3Detail.done)
  const opsSourcesVisible = recommendation.done

  const techActive = mode === 'technician' && revealAnswer
  const check1 = useTypewriter(HERO_TECHNICIAN.checks[0], techActive)
  const check2 = useTypewriter(HERO_TECHNICIAN.checks[1], check1.done)
  const check3 = useTypewriter(HERO_TECHNICIAN.checks[2], check2.done)
  const check4 = useTypewriter(HERO_TECHNICIAN.checks[3], check3.done)
  const diagramVisible = check4.done
  const doc1 = useTypewriter(HERO_TECHNICIAN.documentation[0], check4.done)
  const doc2 = useTypewriter(HERO_TECHNICIAN.documentation[1], doc1.done)
  const doc3 = useTypewriter(HERO_TECHNICIAN.documentation[2], doc2.done)
  const similar = useTypewriter(HERO_TECHNICIAN.similarRepair.text, doc3.done)
  const techSourcesVisible = similar.done

  // Auto-demo the Technician tab once, after the Operations answer has been
  // fully visible for a few seconds — never once the visitor has picked a tab
  // themselves, and never under reduced motion.
  useEffect(() => {
    if (mode !== 'operations' || !opsSourcesVisible || userSelected || autoSwitched || reduced) return
    const id = window.setTimeout(() => {
      setMode('technician')
      setAutoSwitched(true)
    }, AUTO_SWITCH_MS)
    return () => window.clearTimeout(id)
  }, [mode, opsSourcesVisible, userSelected, autoSwitched, reduced])

  // Keeps the newest content in view as the answer reveals, the same way
  // AskSorno's thread auto-follows the turn currently being typed, while
  // still letting a visitor scroll back up through a fixed-size window.
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  })

  return (
    <div className="hero-visual" aria-label="Sorno product interface demonstration">
      <div className="hv-chrome">
        <span className="hv-chrome-title hv-sorno-title">Sorno</span>
        <div className="hv-tabs" role="tablist" aria-label="Sorno view" onKeyDown={onKeyDown}>
          {TABS.map((t, i) => (
            <button
              key={t.key}
              ref={(el) => { tabRefs.current[i] = el }}
              type="button"
              role="tab"
              id={`hv-tab-${t.key}`}
              aria-selected={mode === t.key}
              aria-controls={`hv-panel-${t.key}`}
              tabIndex={mode === t.key ? 0 : -1}
              className={mode === t.key ? 'selected' : ''}
              onClick={() => selectTab(i)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <StatusPill tone="ok" label="Live" />
      </div>

      <div
        className="hv-body"
        role="tabpanel"
        id={`hv-panel-${mode}`}
        aria-labelledby={`hv-tab-${mode}`}
      >
        <div className="hv-thread" ref={threadRef} data-testid="hero-visual-panel">
          <p className="hv-msg hv-msg-user mono">
            {question.shown}
            <Caret show={!question.done} />
          </p>

          <div className="hv-msg hv-msg-sorno">
            <span className="hv-avatar" aria-hidden="true">S</span>
            <div className="hv-msg-body">
              {question.done && !revealAnswer && (
                <p className="hv-thinking" aria-hidden="true">
                  <i /><i /><i />
                </p>
              )}

              {mode === 'operations' ? (
                <>
                  {opsActive && (
                    <p className="hv-stat">
                      {stat.shown}
                      <Caret show={!stat.done} />
                    </p>
                  )}
                  {stat.done && (
                    <div className="hv-units">
                      {[
                        { unit: HERO_OPERATIONS.units[0], title: u1Title, detail: u1Detail },
                        { unit: HERO_OPERATIONS.units[1], title: u2Title, detail: u2Detail },
                        { unit: HERO_OPERATIONS.units[2], title: u3Title, detail: u3Detail },
                      ].map(({ unit, title, detail }, i) => {
                        if (!title.shown && i > 0) return null
                        return (
                          <div className="hv-unit-card" key={unit.id}>
                            <div className="hv-unit-head">
                              <span className="mono hv-unit-id">{unit.id}</span>
                              <StatusPill tone={unit.tone} label={riskLabel(unit.tone)} />
                            </div>
                            <p className="hv-unit-title">
                              {title.shown}
                              <Caret show={!title.done} />
                            </p>
                            {title.done && (
                              <p className="hv-unit-detail">
                                {detail.shown}
                                <Caret show={!detail.done} />
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {u3Detail.done && (
                    <div className="hv-recommendation">
                      <p className="hv-recommendation-label mono">RECOMMENDED ACTION</p>
                      <p>
                        {recommendation.shown}
                        <Caret show={!recommendation.done} />
                      </p>
                    </div>
                  )}
                  {opsSourcesVisible && (
                    <div className="hv-sources">
                      {HERO_OPERATIONS.sources.map((s) => (
                        <SourceBadge key={s}>{s}</SourceBadge>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {techActive && (
                    <div className="hv-checks">
                      <p className="hv-section-label mono">RECOMMENDED CHECKS</p>
                      <ol>
                        {[check1, check2, check3, check4].map((c, i) => {
                          if (!c.shown && i > 0) return null
                          return (
                            <li key={HERO_TECHNICIAN.checks[i]}>
                              {c.shown}
                              <Caret show={!c.done} />
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  )}

                  {diagramVisible && (
                    <div className="hv-diagram" aria-hidden="true">
                      <BearingDiagram />
                    </div>
                  )}

                  {check4.done && (
                    <div className="hv-docs">
                      <p className="hv-section-label mono">RELEVANT DOCUMENTATION</p>
                      <ul>
                        {[doc1, doc2, doc3].map((d, i) => {
                          if (!d.shown && i > 0) return null
                          return (
                            <li key={HERO_TECHNICIAN.documentation[i]}>
                              {d.shown}
                              <Caret show={!d.done} />
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {doc3.done && (
                    <div className="hv-similar">
                      <p className="hv-section-label mono">SIMILAR PREVIOUS REPAIR</p>
                      <p>
                        {similar.shown}
                        <Caret show={!similar.done} />
                      </p>
                    </div>
                  )}

                  {techSourcesVisible && (
                    <div className="hv-sources">
                      {HERO_TECHNICIAN.sources.map((s) => (
                        <SourceBadge key={s}>{s}</SourceBadge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="micro disclaimer hv-disclaimer">{DEMO_DISCLAIMER}</p>
    </div>
  )
}
