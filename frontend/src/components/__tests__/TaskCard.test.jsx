import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TaskCard from '../TaskCard'

const baseTask = {
  id: 1,
  title: 'Write the schema',
  description: 'Define the tasks table',
  status: 'todo',
  assignee: 'Priya',
}

describe('TaskCard', () => {
  it('shows the title, description and assignee', () => {
    render(<TaskCard task={baseTask} onAdvance={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Write the schema' })).toBeInTheDocument()
    expect(screen.getByText('Define the tasks table')).toBeInTheDocument()
    expect(screen.getByText('Assigned to Priya')).toBeInTheDocument()
  })

  it('advances a todo task to in-progress', async () => {
    const onAdvance = vi.fn()
    render(<TaskCard task={baseTask} onAdvance={onAdvance} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Move to In Progress/ }))
    expect(onAdvance).toHaveBeenCalledWith(baseTask, 'in-progress')
  })

  it('has no advance button for a done task', () => {
    render(
      <TaskCard task={{ ...baseTask, status: 'done' }} onAdvance={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: /Move to/ })).not.toBeInTheDocument()
  })

  it('deletes when the delete button is clicked', async () => {
    const onDelete = vi.fn()
    render(<TaskCard task={baseTask} onAdvance={vi.fn()} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(baseTask)
  })
})
