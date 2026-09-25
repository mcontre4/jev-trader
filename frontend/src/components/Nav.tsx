import { Button } from './primitives/Button'
import { NAV_LINKS } from '../data/site'
import '../styles/sections/nav.css'

export function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner shell">
        <a className="wordmark" href="#top">
          <Mark />
        </a>
        <nav aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
        <Button href="#contact">Book a conversation</Button>
      </div>
    </header>
  )
}

export function Mark() {
  return (
    <img className="mark" src="/sorno-logo.png" alt="Sorno" />
  )
}
