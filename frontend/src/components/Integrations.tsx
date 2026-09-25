import { SectionHeader } from './primitives/SectionHeader'
import { INTEGRATIONS } from '../data/demo'
import '../styles/sections/integrations.css'

export function Integrations() {
  return (
    <section className="section integrations">
      <div className="shell">
        <div className="integrations-inner">
          <SectionHeader
            kicker="WORKS WITH YOUR STACK"
            title="Make your existing systems work together around each unit."
            lead="Sorno connects the information in your ERP, MES, QMS, WMS, spreadsheets, and internal tools without replacing the systems of record."
          />

          <div className="integration-grid">
            {INTEGRATIONS.map((item) => (
              <span className="integration-chip" key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
