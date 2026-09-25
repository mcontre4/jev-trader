import { SectionHeader } from './primitives/SectionHeader'
import { ROLES } from '../data/demo'
import '../styles/sections/roles.css'

export function Roles() {
  return (
    <section className="section roles" id="roles">
      <div className="shell">
        <SectionHeader
          kicker="WHO IT'S FOR"
          title="Answers for the people running the operation."
          lead="From plant management to quality and customer service, Sorno replaces status chasing with a shared, evidence-backed view."
        />

        <div className="role-grid">
          {ROLES.map((role) => (
            <article className="role-card" key={role.role}>
              <p className="role-name">{role.role}</p>
              <p className="role-question">“{role.question}”</p>
              <p className="role-body">{role.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
