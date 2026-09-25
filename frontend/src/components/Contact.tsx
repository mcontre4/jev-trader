import { SectionHeader } from './primitives/SectionHeader'
import { CalendlyInline } from './CalendlyInline'
import { TallyForm } from './TallyForm'
import '../styles/sections/contact.css'

export function Contact() {
  return (
    <section className="section contact" id="contact">
      <div className="shell">
        <SectionHeader
          kicker="EARLY PARTNERS"
          title="Build a clearer view of your operation."
          lead="Sorno is being built alongside a small number of repair and remanufacturing operations. It is not generally available yet — if the problems on this page look like yours, we'd like to talk."
        />

        <div className="contact-grid">
          <TallyForm />
          <CalendlyInline />
        </div>
      </div>
    </section>
  )
}
