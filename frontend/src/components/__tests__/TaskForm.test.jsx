import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TaskForm from '../TaskForm'

describe('TaskForm', () => {
  it('keeps submit disabled until a title is entered', async () => {
    render(<TaskForm onCreate={vi.fn()} />)
    const submit = screen.getByRole('button', { name: 'Add task' })
    expect(submit).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Title'), 'New task')
    expect(submit).toBeEnabled()
  })

  it('submits a trimmed payload and clears the form', async () => {
    const onCreate = vi.fn().mockResolvedValue({})
    render(<TaskForm onCreate={onCreate} />)

    await userEvent.type(screen.getByLabelText('Title'), '  Build API  ')
    await userEvent.type(screen.getByLabelText('Assignee'), 'Sam')
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(onCreate).toHaveBeenCalledWith({
      title: 'Build API',
      description: null,
      assignee: 'Sam',
    })
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })
})
