import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TaskForm from '../TaskForm'

function panelElement() {
  return document.querySelector('details.panel')
}

function summaryElement() {
  return panelElement()?.querySelector('summary')
}

async function expandPanel() {
  await userEvent.click(screen.getByText('Add a task'))
}

describe('TaskForm', () => {
  it('starts collapsed without an open attribute', () => {
    render(<TaskForm onCreate={vi.fn()} />)
    const panel = panelElement()
    expect(panel).not.toHaveAttribute('open')
    expect(summaryElement()).toHaveAccessibleName('Add a task')
  })

  it('expands to reveal Title, Description, and Assignee fields', async () => {
    render(<TaskForm onCreate={vi.fn()} />)
    expect(panelElement()).not.toHaveAttribute('open')
    await expandPanel()
    expect(panelElement()).toHaveAttribute('open')
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Assignee')).toBeInTheDocument()
  })

  it('preserves a partial draft when collapsed and re-expanded', async () => {
    render(<TaskForm onCreate={vi.fn()} />)
    await expandPanel()
    await userEvent.type(screen.getByLabelText('Title'), 'Draft title')
    await userEvent.type(screen.getByLabelText('Description'), 'Draft desc')
    await userEvent.click(screen.getByText('Add a task'))
    expect(panelElement()).not.toHaveAttribute('open')
    await expandPanel()
    expect(screen.getByLabelText('Title')).toHaveValue('Draft title')
    expect(screen.getByLabelText('Description')).toHaveValue('Draft desc')
  })

  it('keeps submit disabled until a title is entered', async () => {
    render(<TaskForm onCreate={vi.fn()} />)
    await expandPanel()
    const submit = screen.getByRole('button', { name: 'Add task' })
    expect(submit).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Title'), 'New task')
    expect(submit).toBeEnabled()
  })

  it('submits a trimmed payload and clears the form', async () => {
    const onCreate = vi.fn().mockResolvedValue({})
    render(<TaskForm onCreate={onCreate} />)
    await expandPanel()

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
