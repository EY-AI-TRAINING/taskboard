import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import StatusFilter from '../StatusFilter'

describe('StatusFilter', () => {
  it('lists all statuses plus "All"', () => {
    render(<StatusFilter value="all" onChange={vi.fn()} />)
    expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'To Do' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'In Progress' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Done' })).toBeInTheDocument()
  })

  it('reports the selected value', async () => {
    const onChange = vi.fn()
    render(<StatusFilter value="all" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'in-progress')
    expect(onChange).toHaveBeenCalledWith('in-progress')
  })
})
