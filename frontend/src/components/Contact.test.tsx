import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Contact } from './Contact'
import { TallyForm } from './TallyForm'

function embedScripts() {
  return document.querySelectorAll('script[src*="tally.so"]')
}

afterEach(() => {
  for (const s of embedScripts()) s.remove()
})

describe('Contact', () => {
  it('offers both a form and a booking path', () => {
    render(<Contact />)
    expect(screen.getByText(/tell us about your operation/i)).toBeInTheDocument()
    expect(screen.getByText(/book directly/i)).toBeInTheDocument()
  })

  it('states plainly that the product is not generally available', () => {
    render(<Contact />)
    expect(screen.getByText(/not generally available yet/i)).toBeInTheDocument()
  })
})

describe('TallyForm', () => {
  // jsdom's IntersectionObserver stub never reports an intersection, so these also
  // assert the embed stays deferred rather than loading eagerly on mount.
  it('does not load the third-party script before the section is in view', () => {
    render(<TallyForm />)
    expect(embedScripts()).toHaveLength(0)
  })

  it('does not render the embed iframe before the section is in view', () => {
    const { container } = render(<TallyForm />)
    expect(container.querySelector('iframe')).toBeNull()
  })
})
