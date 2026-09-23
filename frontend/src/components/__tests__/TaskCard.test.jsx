import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TaskCard, { formatApproximateTime, formatCreatedLine, initialsOf } from '../TaskCard'

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
    expect(document.querySelector('.chip[aria-hidden="true"]')).toHaveTextContent('P')
  })

  it('shows Unassigned for a task with no assignee', () => {
    const { container } = render(
      <TaskCard
        task={{ ...baseTask, assignee: null }}
        onAdvance={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
    const chip = container.querySelector('.chip[aria-hidden="true"]')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveTextContent('')
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

  it('shows the comment control without a count when there are no comments', () => {
    render(<TaskCard task={baseTask} onAdvance={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: '💬' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '💬 3' })).not.toBeInTheDocument()
  })

  it('shows the comment count when the task has comments', () => {
    render(
      <TaskCard
        task={{ ...baseTask, commentCount: 3 }}
        onAdvance={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '💬 3' })).toBeInTheDocument()
  })

  it('expands the thread oldest-first and collapses it again', async () => {
    const onToggle = vi.fn()
    const comments = [
      { id: 1, author: 'Ana', body: 'First', createdAt: '2026-09-21T09:00:00' },
      { id: 2, author: 'Priya', body: 'Second', createdAt: '2026-09-21T10:00:00' },
    ]
    const { rerender } = render(
      <TaskCard
        task={{ ...baseTask, commentCount: 2 }}
        comments={comments}
        commentsOpen={false}
        onAdvance={vi.fn()}
        onDelete={vi.fn()}
        onToggleComments={onToggle}
      />,
    )
    expect(screen.queryByText('First')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '💬 2' }))
    expect(onToggle).toHaveBeenCalledWith({ ...baseTask, commentCount: 2 })

    rerender(
      <TaskCard
        task={{ ...baseTask, commentCount: 2 }}
        comments={comments}
        commentsOpen
        onAdvance={vi.fn()}
        onDelete={vi.fn()}
        onToggleComments={onToggle}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('First')
    expect(items[1]).toHaveTextContent('Second')

    await userEvent.click(screen.getByRole('button', { name: '💬 2' }))
    expect(onToggle).toHaveBeenCalledTimes(2)
  })

  it('does not post when author or body is blank', async () => {
    const onPost = vi.fn()
    render(
      <TaskCard
        task={baseTask}
        commentsOpen
        onAdvance={vi.fn()}
        onDelete={vi.fn()}
        onPostComment={onPost}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Post' }))
    expect(onPost).not.toHaveBeenCalled()
  })

  it('posts trimmed author and body', async () => {
    const onPost = vi.fn()
    render(
      <TaskCard
        task={baseTask}
        commentsOpen
        onAdvance={vi.fn()}
        onDelete={vi.fn()}
        onPostComment={onPost}
      />,
    )
    await userEvent.type(screen.getByLabelText('Author'), '  Ana  ')
    await userEvent.type(screen.getByLabelText('Comment'), '  Looks good  ')
    await userEvent.click(screen.getByRole('button', { name: 'Post' }))
    expect(onPost).toHaveBeenCalledWith(baseTask, { author: 'Ana', body: 'Looks good' })
  })

  describe('initialsOf', () => {
    it('returns the first letter for one word', () => {
      expect(initialsOf('Priya')).toBe('P')
    })

    it('returns first letters of the first two words', () => {
      expect(initialsOf('Sam Lee')).toBe('SL')
    })

    it('uses only the first two words when there are three or more', () => {
      expect(initialsOf('Ana Maria Costa')).toBe('AM')
    })

    it('ignores extra spaces', () => {
      expect(initialsOf('  Sam   Lee  ')).toBe('SL')
    })

    it('returns empty string for empty or missing assignee', () => {
      expect(initialsOf('')).toBe('')
      expect(initialsOf('   ')).toBe('')
      expect(initialsOf(null)).toBe('')
      expect(initialsOf(undefined)).toBe('')
    })

    it('uppercases the result', () => {
      expect(initialsOf('sam lee')).toBe('SL')
    })
  })

  describe('formatCreatedLine', () => {
    const now = new Date('2026-09-22T12:00:00')

    it('returns Created just now for under one minute', () => {
      expect(formatCreatedLine('2026-09-22T11:59:30', now)).toBe('Created just now')
    })

    it('returns Created just now for a future timestamp', () => {
      expect(formatCreatedLine('2026-09-22T12:05:00', now)).toBe('Created just now')
    })

    it('returns Created 1 minute ago at exactly one minute', () => {
      expect(formatCreatedLine('2026-09-22T11:59:00', now)).toBe('Created 1 minute ago')
    })

    it('returns Created N minutes ago for 2–59 minutes', () => {
      expect(formatCreatedLine('2026-09-22T11:30:00', now)).toBe('Created 30 minutes ago')
    })

    it('returns Created 1 hour ago at exactly one hour', () => {
      expect(formatCreatedLine('2026-09-22T11:00:00', now)).toBe('Created 1 hour ago')
    })

    it('returns Created N hours ago for 2–23 hours', () => {
      expect(formatCreatedLine('2026-09-22T09:00:00', now)).toBe('Created 3 hours ago')
    })

    it('returns Created 1 day ago at exactly one day', () => {
      expect(formatCreatedLine('2026-09-21T12:00:00', now)).toBe('Created 1 day ago')
    })

    it('returns Created N days ago for 2–30 days', () => {
      expect(formatCreatedLine('2026-09-19T12:00:00', now)).toBe('Created 3 days ago')
    })

    it('returns a calendar date older than 30 days', () => {
      expect(formatCreatedLine('2026-08-12T12:00:00', now)).toBe('Created 12 Aug 2026')
    })

    it('returns empty string for missing or invalid timestamps', () => {
      expect(formatCreatedLine(null, now)).toBe('')
      expect(formatCreatedLine(undefined, now)).toBe('')
      expect(formatCreatedLine('', now)).toBe('')
      expect(formatCreatedLine('not-a-date', now)).toBe('')
    })
  })

  describe('created line rendering', () => {
    const now = new Date('2026-09-22T12:00:00')

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(now)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('renders a muted time element when created_at is present', () => {
      render(
        <TaskCard
          task={{ ...baseTask, created_at: '2026-09-19T12:00:00' }}
          onAdvance={vi.fn()}
          onDelete={vi.fn()}
        />,
      )
      const time = screen.getByText('Created 3 days ago')
      expect(time.tagName).toBe('TIME')
      expect(time).toHaveAttribute('dateTime', '2026-09-19T12:00:00')
      expect(time).toHaveClass('card-created')
    })

    it('accepts createdAt as well as created_at', () => {
      render(
        <TaskCard
          task={{ ...baseTask, createdAt: '2026-09-21T12:00:00' }}
          onAdvance={vi.fn()}
          onDelete={vi.fn()}
        />,
      )
      expect(screen.getByText('Created 1 day ago')).toBeInTheDocument()
    })

    it('renders no time element when the timestamp is missing or invalid', () => {
      const { rerender } = render(
        <TaskCard task={baseTask} onAdvance={vi.fn()} onDelete={vi.fn()} />,
      )
      expect(screen.queryByRole('time')).not.toBeInTheDocument()

      rerender(
        <TaskCard
          task={{ ...baseTask, created_at: 'invalid' }}
          onAdvance={vi.fn()}
          onDelete={vi.fn()}
        />,
      )
      expect(screen.queryByRole('time')).not.toBeInTheDocument()
    })
  })

  it('keeps formatApproximateTime for comment timestamps', () => {
    const commentNow = new Date('2026-09-21T10:30:00')
    expect(formatApproximateTime('2026-09-21T10:00:00', commentNow)).toBe('30 minutes ago')
  })

  it('deletes a comment without a confirm dialog', async () => {
    const onDeleteComment = vi.fn()
    const comment = { id: 8, author: 'Ana', body: 'Remove me', createdAt: '2026-09-21T09:00:00' }
    render(
      <TaskCard
        task={{ ...baseTask, commentCount: 1 }}
        comments={[comment]}
        commentsOpen
        onAdvance={vi.fn()}
        onDelete={vi.fn()}
        onDeleteComment={onDeleteComment}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete comment' }))
    expect(onDeleteComment).toHaveBeenCalledWith({ ...baseTask, commentCount: 1 }, comment)
  })
})
