import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusPill } from './StatusPill'

describe('StatusPill', () => {
  it('always renders a text label alongside the colour', () => {
    render(<StatusPill tone="blocked" label="Quality hold" />)
    expect(screen.getByText('Quality hold')).toBeInTheDocument()
  })

  it('applies a tone class so colour is driven by tokens', () => {
    const { container } = render(<StatusPill tone="ok" label="Passed" />)
    expect(container.firstChild).toHaveClass('pill', 'pill-ok')
  })
})
