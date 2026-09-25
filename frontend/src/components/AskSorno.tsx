import { useEffect, useRef, useState } from 'react'
import { SectionHeader } from './primitives/SectionHeader'
import { StatusPill } from './primitives/StatusPill'
import { SourceBadge } from './primitives/SourceBadge'
import { useChatReplay } from '../hooks/useChatReplay'
import { useInView } from '../hooks/useInView'
import { QUESTIONS } from '../data/demo'
import '../styles/sections/ask.css'

export function AskSorno() {
  const [active, setActive] = useState(0)
  const [asked, setAsked] = useState(false)
  // Once a visitor picks a question themselves, the demo stops driving itself —
  // looping is a hint to try the interaction, not something to fight once someone
  // is actually using it.
  const [userSelected, setUserSelected] = useState(false)
  const current = QUESTIONS[active]
  const revealed = useChatReplay(current.thread, asked)
  const threadRef = useRef<HTMLDivElement>(null)
  const { ref: sectionRef, inView } = useInView<HTMLElement>()

  const ask = (index: number) => {
    setActive(index)
    setAsked(true)
  }

  const askManually = (index: number) => {
    setUserSelected(true)
    ask(index)
  }

  // Plays the first question as soon as the section scrolls into view, so a
  // visitor sees the chat replaying rather than an inert "pick a question" prompt.
  useEffect(() => {
    if (inView) ask(0)
  }, [inView])

  // Messages stay their natural size — the box itself scrolls, tracking the turn
  // currently being typed, the same way a real chat window follows the newest
  // message while still letting you scroll back up to read earlier ones.
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [revealed])

  const isComplete =
    asked && revealed.length === current.thread.length && (revealed[revealed.length - 1]?.done ?? false)

  // Once a thread finishes playing, pause so the last message can be read, then
  // advance to the next question and loop back to the first once the list ends.
  // Stops entirely once the visitor has picked a question themselves.
  useEffect(() => {
    if (!isComplete || userSelected) return
    const id = window.setTimeout(() => {
      ask((active + 1) % QUESTIONS.length)
    }, 2000)
    return () => window.clearTimeout(id)
  }, [isComplete, active, userSelected])

  return (
    <section className="section ask" id="ask" ref={sectionRef}>
      <div className="shell">
        <SectionHeader
          kicker="ASK YOUR OPERATION"
          title="Questions answered with evidence, not guesses."
          lead="Every answer names the systems it came from and says so when the data is incomplete."
        />

        <div className="ask-panel">
          <div className="ask-questions">
            {QUESTIONS.map((item, i) => (
              <button
                key={item.thread[0].text}
                type="button"
                className={asked && active === i ? 'selected' : ''}
                onClick={() => askManually(i)}
              >
                {item.thread[0].text}
              </button>
            ))}
          </div>

          {/* Same window chrome as the other Sorno screens on the page (the payoff
              card and the pipeline mockup), so this reads as the product's own
              interface rather than a plain card. */}
          <div className="ask-window">
            <div className="ask-chrome">
              <span className="ask-chrome-title ask-sorno-title">Sorno</span>
              <span className="ask-chrome-view mono">Ask your operation</span>
              <StatusPill tone="ok" label="Live" />
            </div>

            <div className="ask-thread" ref={threadRef} data-testid="ask-answer" aria-live="polite">
              {asked && current.thread.map((turn, i) => {
                const r = revealed[i]
                if (!r) return null

                if (turn.role === 'user') {
                  return (
                    <p key={i} className="ask-msg ask-msg-user mono">
                      {r.text}
                    </p>
                  )
                }

                return (
                  <div key={i} className="ask-msg ask-msg-sorno">
                    <span className="ask-avatar" aria-hidden="true">S</span>
                    <div className="ask-msg-body">
                      <p>
                        {r.text}
                        {!r.done && <span className="ask-caret" aria-hidden="true" />}
                      </p>
                      {r.done && turn.attachment && (
                        <div className="ask-attachment">
                          <span className="ask-attachment-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
                              <path d="M14 3v5h5" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <span className="ask-attachment-meta">
                            <span className="ask-attachment-name">{turn.attachment.name}</span>
                            <span className="ask-attachment-detail">{turn.attachment.meta}</span>
                          </span>
                        </div>
                      )}
                      {r.done && (turn.sources.length > 0 || turn.note) && (
                        <div className="ask-evidence">
                          {turn.sources.length > 0 && (
                            <div className="ask-sources">
                              {turn.sources.map((s) => (
                                <SourceBadge key={s}>{s}</SourceBadge>
                              ))}
                            </div>
                          )}
                          {turn.note && <p className="ask-note">{turn.note}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Decorative composer: completes the chat look, but replies only ever
                come from the preset questions on the left — there is no free-text
                model behind this input. */}
            <div className="ask-composer">
              <input
                className="ask-composer-input"
                type="text"
                placeholder="Try one of the questions on the left…"
                disabled
              />
              <button className="ask-composer-send" type="button" disabled aria-label="Send">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
