import { Button } from './primitives/Button'
import { HeroVisual } from './HeroVisual'
import '../styles/sections/hero.css'

export function Hero() {
  return (
    <section className="hero">
      <div className="shell hero-inner">
        <div className="hero-copy">
          <p className="kicker mono hero-eyebrow">
            FOR REPAIR, REFURBISHMENT &amp; REMANUFACTURING OPERATIONS
          </p>
          <h1>The intelligence layer for manufacturing operations</h1>
          <p className="lead">
            Unify operational data, technical documentation, and shop-floor knowledge so
            managers and technicians can find answers, surface issues, and know what to do
            next.
          </p>
          <div className="hero-actions">
            <Button href="#contact">Book a conversation</Button>
            <Button href="#problem" variant="secondary">See how it works</Button>
          </div>
          <p className="micro">
            Built for repair, refurbishment, and remanufacturing operations.
          </p>
        </div>

        <HeroVisual />
      </div>
    </section>
  )
}
