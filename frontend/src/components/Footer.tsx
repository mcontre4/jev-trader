import { Mark } from './Nav'
import { NAV_LINKS } from '../data/site'
import '../styles/sections/footer.css'

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <a className="wordmark" href="#top">
            <Mark />
          </a>
          <p className="micro footer-descriptor">
            Operational intelligence for repair and remanufacturing.
          </p>
        </div>
        <nav aria-label="Footer">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
        <span className="micro">© 2026 Sorno</span>
      </div>
    </footer>
  )
}
