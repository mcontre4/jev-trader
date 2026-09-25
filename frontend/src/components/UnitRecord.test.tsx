import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnitRecord } from './UnitRecord'

describe('UnitRecord', () => {
  it('opens on the timeline tab', () => {
    render(<UnitRecord />)
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Unit received at dock')).toBeInTheDocument()
  })

  it('switches panels when a tab is clicked', async () => {
    const user = userEvent.setup()
    render(<UnitRecord />)
    await user.click(screen.getByRole('tab', { name: 'Parts & lineage' }))
    expect(screen.getByText('Recovered from core C-9920')).toBeInTheDocument()
    expect(screen.queryByText('Unit received at dock')).not.toBeInTheDocument()
  })

  it('supports arrow key navigation across tabs', async () => {
    const user = userEvent.setup()
    render(<UnitRecord />)
    await user.click(screen.getByRole('tab', { name: 'Timeline' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Inspection' })).toHaveAttribute('aria-selected', 'true')
  })

  it('wraps from the last tab to the first with End then ArrowRight', async () => {
    const user = userEvent.setup()
    render(<UnitRecord />)
    await user.click(screen.getByRole('tab', { name: 'Timeline' }))
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Documents' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true')
  })
})
