import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { motionAwareComputedStyle } from '../../setupTests'
import TaskList from '../TaskList'
import { STATUSES, STATUS_LABELS } from '../../constants'

const noop = vi.fn()
const onMotionSettled = vi.fn()

const sampleTasks = [
  { id: 1, title: 'First todo', status: 'todo' },
  { id: 2, title: 'Second todo', status: 'todo' },
  { id: 3, title: 'Active work', status: 'in-progress' },
]

function renderList(props = {}) {
  return render(
    <TaskList
      tasks={sampleTasks}
      filter="all"
      phase="ready"
      requestId={1}
      onAdvance={noop}
      onDelete={noop}
      {...props}
    />,
  )
}

describe('TaskList columns and counts', () => {
  it('renders three columns in STATUSES order with counts when filter is all', () => {
    renderList()

    const regions = screen.getAllByRole('region')
    expect(regions).toHaveLength(3)
    STATUSES.forEach((status, index) => {
      expect(regions[index]).toHaveAttribute('aria-label', STATUS_LABELS[status])
      expect(regions[index]).toHaveAttribute('data-status', status)
    })

    expect(screen.getByRole('heading', { level: 2, name: 'To Do (2)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'In Progress (1)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Done (0)' })).toBeInTheDocument()
  })

  it('renders exactly one column with its own count when filtered', () => {
    renderList({ filter: 'todo', tasks: sampleTasks })

    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'To Do' })).toHaveAttribute('data-status', 'todo')
    expect(screen.getByRole('heading', { level: 2, name: 'To Do (2)' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'In Progress' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Done' })).not.toBeInTheDocument()
  })

  it('matches column count to the number of rendered cards', () => {
    renderList()

    const todoRegion = screen.getByRole('region', { name: 'To Do' })
    const todoCards = todoRegion.querySelectorAll('[data-testid^="task-"]')
    expect(todoCards).toHaveLength(2)
    expect(screen.getByRole('heading', { level: 2, name: 'To Do (2)' })).toBeInTheDocument()

    const progressRegion = screen.getByRole('region', { name: 'In Progress' })
    const progressCards = progressRegion.querySelectorAll('[data-testid^="task-"]')
    expect(progressCards).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 2, name: 'In Progress (1)' })).toBeInTheDocument()
  })

  it('does not render a board-level empty message', () => {
    renderList({ tasks: [], phase: 'ready' })

    expect(screen.getAllByRole('region')).toHaveLength(3)
    expect(screen.queryByText(/no tasks on/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/board is empty/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/nothing here/i)).not.toBeInTheDocument()
  })
})

describe('TaskList board states', () => {
  it('shows skeleton placeholders only when loading with no tasks', () => {
    const { container } = renderList({ tasks: [], phase: 'loading' })

    expect(screen.getAllByRole('region')).toHaveLength(3)
    expect(container.querySelectorAll('.skeleton')).toHaveLength(3)
    expect(screen.getByText('Loading tasks…', { selector: '.visually-hidden' })).toBeInTheDocument()
    expect(container.querySelector('.board')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument()
    expect(screen.queryByText('Tasks unavailable')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: /To Do \(\d+\)/ })).not.toBeInTheDocument()
  })

  it('keeps cards mounted when loading with tasks present', () => {
    const { container } = renderList({ phase: 'loading' })

    expect(screen.getByTestId('task-1')).toBeInTheDocument()
    expect(screen.getByTestId('task-2')).toBeInTheDocument()
    expect(screen.getByTestId('task-3')).toBeInTheDocument()
    expect(container.querySelector('.board')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Loading tasks…', { selector: '.visually-hidden' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'To Do (2)' })).toBeInTheDocument()
  })

  it('shows Tasks unavailable with suppressed counts when failed and empty', () => {
    renderList({ tasks: [], phase: 'failed' })

    expect(screen.getAllByRole('region')).toHaveLength(3)
    expect(screen.getAllByText('Tasks unavailable')).toHaveLength(3)
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: /To Do \(\d+\)/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'To Do' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'In Progress' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Done' })).toBeInTheDocument()
  })

  it('shows No tasks yet only in ready empty columns', () => {
    renderList({ tasks: [], phase: 'ready' })

    expect(screen.getAllByText('No tasks yet')).toHaveLength(3)
    expect(screen.queryByText('Tasks unavailable')).not.toBeInTheDocument()
  })

  it('never shows No tasks yet in the failed state', () => {
    renderList({ tasks: [], phase: 'failed' })

    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument()
  })

  it('renders exactly one column when filtered while loading', () => {
    const { container } = renderList({ tasks: [], filter: 'todo', phase: 'loading' })

    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(container.querySelectorAll('.skeleton')).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'To Do' })).toBeInTheDocument()
  })

  it('renders exactly one column when filtered while failed', () => {
    renderList({ tasks: [], filter: 'in-progress', phase: 'failed' })

    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'In Progress' })).toBeInTheDocument()
    expect(screen.getByText('Tasks unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'To Do' })).not.toBeInTheDocument()
  })

  it('shows No tasks yet in a filtered ready empty column', () => {
    renderList({ tasks: [], filter: 'done', phase: 'ready' })

    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(screen.getByText('No tasks yet')).toBeInTheDocument()
  })
})

describe('TaskList motion intents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        return 80
      },
    })
  })

  afterEach(() => {
    delete HTMLElement.prototype.offsetHeight
  })

  function renderMotion(props = {}) {
    return render(
      <TaskList
        tasks={[]}
        filter="all"
        phase="ready"
        requestId={2}
        pendingCreates={[]}
        pendingMoves={[]}
        onMotionSettled={onMotionSettled}
        onAdvance={noop}
        onDelete={noop}
        {...props}
      />,
    )
  }

  it('applies entrance only for ids in pendingCreates, not refresh-discovered ids', () => {
    const tasks = [{ id: 42, title: 'Discovered', status: 'todo' }]
    const { container, rerender } = renderMotion({ tasks, requestId: 1 })

    expect(container.querySelector('.card-slot--entering')).not.toBeInTheDocument()

    rerender(
      <TaskList
        tasks={tasks}
        filter="all"
        phase="ready"
        requestId={2}
        pendingCreates={[{ key: 'create:42', taskId: 42, revealedByRequestId: 2 }]}
        pendingMoves={[]}
        onMotionSettled={onMotionSettled}
        onAdvance={noop}
        onDelete={noop}
      />,
    )

    expect(container.querySelector('.card-slot--entering')).toBeInTheDocument()
  })

  it('still animates when a slow refresh lands with armed create intent', () => {
    const { container, rerender } = renderMotion({
      phase: 'loading',
      requestId: 1,
      pendingCreates: [{ key: 'create:99', taskId: 99, revealedByRequestId: 2 }],
    })

    expect(container.querySelector('.card-slot--entering')).not.toBeInTheDocument()

    rerender(
      <TaskList
        tasks={[{ id: 99, title: 'New task', status: 'todo' }]}
        filter="all"
        phase="ready"
        requestId={2}
        pendingCreates={[{ key: 'create:99', taskId: 99, revealedByRequestId: 2 }]}
        pendingMoves={[]}
        onMotionSettled={onMotionSettled}
        onAdvance={noop}
        onDelete={noop}
      />,
    )

    expect(container.querySelector('.card-slot--entering')).toBeInTheDocument()
  })

  it('grows the destination and leaves a ghost in the source on move with filter all', () => {
    const movedTask = { id: 1, title: 'First todo', status: 'in-progress' }
    const { container } = renderMotion({
      tasks: [movedTask, { id: 2, title: 'Second todo', status: 'todo' }],
      pendingMoves: [{
        key: 'move:1:todo',
        task: { id: 1, title: 'First todo', status: 'todo' },
        from: 'todo',
        to: 'in-progress',
        revealedByRequestId: 2,
      }],
    })

    expect(container.querySelector('.card-slot--growing')).toBeInTheDocument()
    const todoRegion = screen.getByRole('region', { name: 'To Do' })
    expect(todoRegion.querySelector('.card-ghost')).toBeInTheDocument()
    expect(todoRegion.querySelector('[data-testid="task-1"]')).not.toBeInTheDocument()
  })

  it('ghosts the selected column when a filtered move removes the card from the list', () => {
    const { container } = renderMotion({
      filter: 'todo',
      tasks: [],
      pendingMoves: [{
        key: 'move:1:todo',
        task: { id: 1, title: 'First todo', status: 'todo' },
        from: 'todo',
        to: 'in-progress',
        revealedByRequestId: 2,
      }],
    })

    expect(container.querySelector('.card-ghost')).toBeInTheDocument()
    expect(container.querySelector('.card-slot--growing')).not.toBeInTheDocument()
  })

  it('keeps separate measured heights for two concurrent moves', () => {
    let heightCall = 0
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        heightCall += 1
        return heightCall === 1 ? 80 : 120
      },
    })

    const { container, rerender } = renderMotion({
      tasks: [
        { id: 1, title: 'First todo', status: 'todo' },
        { id: 2, title: 'Second todo', status: 'todo' },
      ],
      requestId: 1,
      pendingMoves: [
        {
          key: 'move:1:todo',
          task: { id: 1, title: 'First todo', status: 'todo' },
          from: 'todo',
          to: 'in-progress',
          revealedByRequestId: null,
        },
        {
          key: 'move:2:todo',
          task: { id: 2, title: 'Second todo', status: 'todo' },
          from: 'todo',
          to: 'in-progress',
          revealedByRequestId: null,
        },
      ],
    })

    rerender(
      <TaskList
        tasks={[
          { id: 1, title: 'First todo', status: 'in-progress' },
          { id: 2, title: 'Second todo', status: 'in-progress' },
        ]}
        filter="all"
        phase="ready"
        requestId={2}
        pendingCreates={[]}
        pendingMoves={[
          {
            key: 'move:1:todo',
            task: { id: 1, title: 'First todo', status: 'todo' },
            from: 'todo',
            to: 'in-progress',
            revealedByRequestId: 2,
          },
          {
            key: 'move:2:todo',
            task: { id: 2, title: 'Second todo', status: 'todo' },
            from: 'todo',
            to: 'in-progress',
            revealedByRequestId: 2,
          },
        ]}
        onMotionSettled={onMotionSettled}
        onAdvance={noop}
        onDelete={noop}
      />,
    )

    const ghosts = container.querySelectorAll('.card-ghost')
    expect(ghosts).toHaveLength(2)
    expect(ghosts[0].style.getPropertyValue('--ghost-height')).toBe('80px')
    expect(ghosts[1].style.getPropertyValue('--ghost-height')).toBe('120px')
  })

  it('keeps the first collapse running when the same card is moved twice', () => {
    const { container, rerender } = renderMotion({
      tasks: [{ id: 1, title: 'First todo', status: 'in-progress' }],
      pendingMoves: [{
        key: 'move:1:todo',
        task: { id: 1, title: 'First todo', status: 'todo' },
        from: 'todo',
        to: 'in-progress',
        revealedByRequestId: 2,
      }],
    })

    const firstGhost = container.querySelector('.card-ghost')
    expect(firstGhost).toBeInTheDocument()

    rerender(
      <TaskList
        tasks={[{ id: 1, title: 'First todo', status: 'done' }]}
        filter="all"
        phase="ready"
        requestId={3}
        pendingCreates={[]}
        pendingMoves={[
          {
            key: 'move:1:todo',
            task: { id: 1, title: 'First todo', status: 'todo' },
            from: 'todo',
            to: 'in-progress',
            revealedByRequestId: 2,
          },
          {
            key: 'move:1:in-progress',
            task: { id: 1, title: 'First todo', status: 'in-progress' },
            from: 'in-progress',
            to: 'done',
            revealedByRequestId: 3,
          },
        ]}
        onMotionSettled={onMotionSettled}
        onAdvance={noop}
        onDelete={noop}
      />,
    )

    expect(container.querySelectorAll('.card-ghost')).toHaveLength(2)
    expect(container.querySelector('.card-slot--growing')).toBeInTheDocument()
  })

  it('settles immediately when a create intent has nothing to play', async () => {
    renderMotion({
      tasks: [],
      pendingCreates: [{ key: 'create:99', taskId: 99, revealedByRequestId: 2 }],
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(onMotionSettled).toHaveBeenCalledWith('create:99')
  })

  it('renders ghosts without test ids, buttons, or headings and excludes them from counts', () => {
    const { container } = renderMotion({
      tasks: [{ id: 2, title: 'Second todo', status: 'todo' }],
      pendingMoves: [{
        key: 'move:1:todo',
        task: { id: 1, title: 'First todo', status: 'todo' },
        from: 'todo',
        to: 'in-progress',
        revealedByRequestId: 2,
      }],
    })

    const ghost = container.querySelector('.card-ghost')
    expect(ghost).toBeInTheDocument()
    expect(ghost.querySelector('[data-testid]')).not.toBeInTheDocument()
    expect(ghost.querySelector('button')).not.toBeInTheDocument()
    expect(ghost.querySelector('h1, h2, h3')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'To Do (1)' })).toBeInTheDocument()
  })

  it('does not apply motion classes for delete, filter change, or plain refresh', () => {
    const { container } = renderMotion({
      tasks: sampleTasks,
      requestId: 5,
      pendingCreates: [],
      pendingMoves: [],
    })

    expect(container.querySelector('.card-slot--entering')).not.toBeInTheDocument()
    expect(container.querySelector('.card-slot--growing')).not.toBeInTheDocument()
    expect(container.querySelector('.card-ghost')).not.toBeInTheDocument()
  })

  it('settles create intent immediately when animation is disabled', async () => {
    const styleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (el, pseudo) => motionAwareComputedStyle(el, pseudo, { animationName: 'none' }),
    )

    const tasks = [{ id: 42, title: 'Discovered', status: 'todo' }]
    const { container } = renderMotion({
      tasks,
      pendingCreates: [{ key: 'create:42', taskId: 42, revealedByRequestId: 2 }],
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(onMotionSettled).toHaveBeenCalledTimes(1)
    expect(onMotionSettled).toHaveBeenCalledWith('create:42')
    expect(container.querySelector('.card-slot--entering')).not.toBeInTheDocument()
    styleSpy.mockRestore()
  })

  it('settles move intent immediately when animation and ghost are disabled', async () => {
    const styleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (el, pseudo) => motionAwareComputedStyle(el, pseudo, {
        animationName: 'none',
        ghostDisplay: 'none',
      }),
    )

    const { container } = renderMotion({
      tasks: [
        { id: 1, title: 'First todo', status: 'in-progress' },
        { id: 2, title: 'Second todo', status: 'todo' },
      ],
      pendingMoves: [{
        key: 'move:1:todo',
        task: { id: 1, title: 'First todo', status: 'todo' },
        from: 'todo',
        to: 'in-progress',
        revealedByRequestId: 2,
      }],
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(onMotionSettled).toHaveBeenCalledTimes(1)
    expect(onMotionSettled).toHaveBeenCalledWith('move:1:todo')
    expect(container.querySelector('.card-slot--growing')).not.toBeInTheDocument()
    expect(container.querySelector('.card-ghost')).not.toBeInTheDocument()
    styleSpy.mockRestore()
  })
})
