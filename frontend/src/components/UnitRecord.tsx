import { useRef, useState } from 'react'
import { SectionHeader } from './primitives/SectionHeader'
import { StatusPill } from './primitives/StatusPill'
import { SourceBadge } from './primitives/SourceBadge'
import { useRovingTabs } from '../hooks/useRovingTabs'
import {
  UNIT, RECORD_TABS, TIMELINE, FINDINGS, PARTS, QUALITY, DOCUMENTS,
} from '../data/demo'
import { DEMO_DISCLAIMER } from '../data/site'
import '../styles/sections/record.css'

const INSPECTION_PHOTOS = [
  {
    src: '/images/r-1842-exterior-v2.png',
    alt: 'Rear three-quarter inspection view of the R-1842 hydraulic pump housing',
  },
  {
    src: '/images/r-1842-internals-v2.png',
    alt: 'R-1842 internal rotor and valve plate assembly beside its opened housing',
  },
  {
    src: '/images/r-1842-cover-seal-v3.png',
    alt: 'R-1842 front cover and cracked seal laid flat on the inspection bench',
  },
]

export function UnitRecord() {
  const [active, setActive] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const select = (index: number) => {
    setActive(index)
    tabRefs.current[index]?.focus()
  }
  const onKeyDown = useRovingTabs(RECORD_TABS.length, active, select)
  const tab = RECORD_TABS[active]

  return (
    <section className="section record" id="product">
      <div className="shell">
        <SectionHeader
          kicker="THE UNIT RECORD"
          title="One complete record for every unit."
          lead="Sorno organizes events, inspections, parts, quality holds, and documents around the physical unit—while preserving the source behind every record."
        />

        <div className="record-frame">
          <div className="record-chrome" aria-hidden="true">
            <span className="record-chrome-brand">
              Sorno
            </span>
            <span>Units</span>
            <span>Operations</span>
            <span>Quality</span>
            <span>Reports</span>
          </div>

          <div className="record-head">
            <div>
              <p className="mono micro-label">{UNIT.id}</p>
              <h3>{UNIT.name}</h3>
              <p className="micro">{UNIT.customer} · {UNIT.order}</p>
            </div>
            <div className="record-head-status">
              <StatusPill tone={UNIT.tone} label={UNIT.status} />
              <p className="mono micro">{UNIT.model}</p>
            </div>
          </div>

          <div
            className="record-tabs"
            role="tablist"
            aria-label="Unit record sections"
            onKeyDown={onKeyDown}
          >
            {RECORD_TABS.map((t, i) => (
              <button
                key={t.key}
                ref={(el) => { tabRefs.current[i] = el }}
                type="button"
                role="tab"
                id={`record-tab-${t.key}`}
                aria-selected={active === i}
                aria-controls={`record-panel-${t.key}`}
                tabIndex={active === i ? 0 : -1}
                className={active === i ? 'selected' : ''}
                onClick={() => setActive(i)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div
            className="record-panel"
            role="tabpanel"
            id={`record-panel-${tab.key}`}
            aria-labelledby={`record-tab-${tab.key}`}
            tabIndex={0}
          >
            <RecordPanel tabKey={tab.key} />
          </div>
        </div>

        <p className="micro">{DEMO_DISCLAIMER}</p>
      </div>
    </section>
  )
}

function RecordPanel({ tabKey }: { tabKey: string }) {
  switch (tabKey) {
    case 'timeline':
      return (
        <div className="record-timeline">
          {TIMELINE.map((event, i) => (
            <div
              key={i}
              className={event.tone ? `record-event record-event-${event.tone}` : 'record-event'}
            >
              <time className="mono">{event.time}</time>
              <div>
                <p className="record-event-text">{event.event}</p>
                <p className="micro">{event.actor}</p>
              </div>
              <SourceBadge>{event.source}</SourceBadge>
            </div>
          ))}
        </div>
      )

    case 'inspection':
      return (
        <>
          <dl className="record-findings">
            {FINDINGS.map((f) => (
              <div className="record-finding" key={f.label}>
                <dt className="micro-label">{f.label}</dt>
                <dd>
                  {f.tone ? <StatusPill tone={f.tone} label={f.value} /> : f.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="record-photos">
            {INSPECTION_PHOTOS.map((photo) => (
              <div className="record-photo" key={photo.src}>
                <img src={photo.src} alt={photo.alt} />
              </div>
            ))}
          </div>
        </>
      )

    case 'parts':
      return (
        <div className="record-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Part</th>
                <th>Description</th>
                <th>Origin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {PARTS.map((p) => (
                <tr key={p.pn}>
                  <td className="mono" data-label="Part">{p.pn}</td>
                  <td data-label="Description">{p.desc}</td>
                  <td data-label="Origin">{p.origin}</td>
                  <td data-label="Status">
                    <StatusPill tone={p.tone} label={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'quality':
      return (
        <div className="record-list">
          {QUALITY.map((q) => (
            <div className="record-row" key={q.label}>
              <div>
                <p className="mono record-row-label">{q.label}</p>
                <p className="micro">{q.detail}</p>
              </div>
              <StatusPill tone={q.tone} label={q.status} />
            </div>
          ))}
        </div>
      )

    case 'documents':
      return (
        <div className="record-list">
          {DOCUMENTS.map((d) => (
            <div className="record-row" key={d.name}>
              <div>
                <p className="record-row-label">{d.name}</p>
                <p className="micro">{d.meta}</p>
              </div>
              <SourceBadge>{d.source}</SourceBadge>
            </div>
          ))}
        </div>
      )

    default:
      return null
  }
}
