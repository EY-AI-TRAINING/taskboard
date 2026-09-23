import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BoardPage from '../BoardPage'
import * as taskService from '../../services/taskService'

vi.mock('../../services/taskService')

const todoTask = { id: 1, title: 'Todo task', status: 'todo', assignee: 'Priya' }
const inProgressTask = { id: 2, title: 'Active task', status: 'in-progress', assignee: 'Marco' }

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('BoardPage request sequencing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taskService.listTasks.mockResolvedValue([])
    taskService.createTask.mockResolvedValue({ id: 99, title: 'New', status: 'todo' })
    taskService.updateTask.mockResolvedValue({})
    taskService.deleteTask.mockResolvedValue(undefined)
  })

  async function settleInitialLoad() {
    await waitFor(() => {
      expect(taskService.listTasks).toHaveBeenCalled()
    })
  }

  it('keeps filter B data when filter A resolves after B', async () => {
    const loadA = deferred()
    const loadB = deferred()

    taskService.listTasks.mockImplementation((status) => {
      if (status === 'todo') return loadA.promise
      if (status === 'in-progress') return loadB.promise
      return Promise.resolve([])
    })

    render(<BoardPage />)
    await settleInitialLoad()

    const filter = screen.getByRole('combobox', { name: 'Filter by status' })
    await userEvent.selectOptions(filter, 'todo')
    await userEvent.selectOptions(filter, 'in-progress')

    loadB.resolve([inProgressTask])
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Active task/ })).toBeInTheDocument()
    })
    expect(filter).toHaveValue('in-progress')

    loadA.resolve([todoTask])
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Active task/ })).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: /Todo task/ })).not.toBeInTheDocument()
    expect(filter).toHaveValue('in-progress')
  })

  it('does not surface an error from A after B has already succeeded', async () => {
    const loadA = deferred()
    const loadB = deferred()

    taskService.listTasks.mockImplementation((status) => {
      if (status === 'todo') return loadA.promise
      if (status === 'in-progress') return loadB.promise
      return Promise.resolve([])
    })

    render(<BoardPage />)
    await settleInitialLoad()

    const filter = screen.getByRole('combobox', { name: 'Filter by status' })
    await userEvent.selectOptions(filter, 'todo')
    await userEvent.selectOptions(filter, 'in-progress')

    loadB.resolve([inProgressTask])
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Active task/ })).toBeInTheDocument()
    })

    loadA.reject(new Error('network'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Active task/ })).toBeInTheDocument()
    })
    expect(screen.queryByText('Could not load tasks. Is the backend running?')).not.toBeInTheDocument()
    expect(filter).toHaveValue('in-progress')
  })

  it('never renders filter B in A failed state when switching after A fails', async () => {
    const loadA = deferred()
    const loadB = deferred()
    const observed = []

    taskService.listTasks.mockImplementation((status) => {
      if (status === 'todo') return loadA.promise
      if (status === 'in-progress') return loadB.promise
      return Promise.resolve([])
    })

    const { container } = render(<BoardPage />)
    await settleInitialLoad()

    const filter = screen.getByRole('combobox', { name: 'Filter by status' })
    await userEvent.selectOptions(filter, 'todo')

    loadA.reject(new Error('network'))
    await waitFor(() => {
      expect(screen.getByText('Could not load tasks. Is the backend running?')).toBeInTheDocument()
    })

    const observer = new MutationObserver(() => {
      const select = screen.getByRole('combobox', { name: 'Filter by status' })
      if (select.value === 'in-progress') {
        observed.push(screen.queryByText('Could not load tasks. Is the backend running?') !== null)
      }
    })
    observer.observe(container, { childList: true, subtree: true })

    await userEvent.selectOptions(filter, 'in-progress')

    loadB.resolve([inProgressTask])
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Active task/ })).toBeInTheDocument()
    })

    observer.disconnect()
    expect(observed.every((hadError) => !hadError)).toBe(true)
    expect(filter).toHaveValue('in-progress')
    expect(screen.queryByText('Could not load tasks. Is the backend running?')).not.toBeInTheDocument()
  })

  it('re-fetches the live filter after a deferred create, not the closure filter', async () => {
    const create = deferred()

    taskService.listTasks.mockImplementation((status) => {
      if (status === 'todo') return Promise.resolve([todoTask])
      if (status === 'in-progress') return Promise.resolve([inProgressTask])
      return Promise.resolve([])
    })
    taskService.createTask.mockReturnValue(create.promise)

    render(<BoardPage />)
    await settleInitialLoad()

    const filter = screen.getByRole('combobox', { name: 'Filter by status' })
    await userEvent.selectOptions(filter, 'todo')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Todo task/ })).toBeInTheDocument()
    })

    const callsBeforeCreate = taskService.listTasks.mock.calls.length

    await userEvent.type(screen.getByLabelText('Title'), 'Deferred create')
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }))

    await userEvent.selectOptions(filter, 'in-progress')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Active task/ })).toBeInTheDocument()
    })

    create.resolve({ id: 99, title: 'Deferred create', status: 'todo' })
    await waitFor(() => {
      expect(taskService.listTasks.mock.calls.length).toBeGreaterThan(callsBeforeCreate)
    })

    const postCreateCalls = taskService.listTasks.mock.calls.slice(callsBeforeCreate)
    expect(postCreateCalls.every((call) => call[0] === 'in-progress')).toBe(true)
    expect(filter).toHaveValue('in-progress')
    expect(screen.getByRole('heading', { name: /Active task/ })).toBeInTheDocument()
  })
})

describe('BoardPage header and count refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taskService.listTasks.mockResolvedValue([todoTask, inProgressTask])
    taskService.createTask.mockResolvedValue({ id: 99, title: 'New task', status: 'todo' })
    taskService.updateTask.mockResolvedValue({})
    taskService.deleteTask.mockResolvedValue(undefined)
  })

  async function settleInitialLoad() {
    await waitFor(() => {
      expect(taskService.listTasks).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'To Do (1)' })).toBeInTheDocument()
    })
  }

  it('exposes accessible names for the page title, filter, and refresh', async () => {
    render(<BoardPage />)
    await settleInitialLoad()

    expect(screen.getByRole('heading', { level: 1, name: 'Engineering Task Board' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('refreshes column counts after a move via re-fetch', async () => {
    taskService.listTasks
      .mockResolvedValueOnce([todoTask, inProgressTask])
      .mockResolvedValueOnce([inProgressTask, { ...todoTask, status: 'in-progress' }])

    render(<BoardPage />)
    await settleInitialLoad()

    const callsBeforeMove = taskService.listTasks.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: /Move to In Progress/ }))

    await waitFor(() => {
      expect(taskService.listTasks.mock.calls.length).toBeGreaterThan(callsBeforeMove)
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'To Do (0)' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'In Progress (2)' })).toBeInTheDocument()
    })
  })

  it('refreshes column counts after create via re-fetch', async () => {
    taskService.listTasks
      .mockResolvedValueOnce([todoTask, inProgressTask])
      .mockResolvedValueOnce([todoTask, inProgressTask, { id: 99, title: 'New task', status: 'todo' }])

    render(<BoardPage />)
    await settleInitialLoad()

    const callsBeforeCreate = taskService.listTasks.mock.calls.length
    await userEvent.type(screen.getByLabelText('Title'), 'New task')
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }))

    await waitFor(() => {
      expect(taskService.listTasks.mock.calls.length).toBeGreaterThan(callsBeforeCreate)
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'To Do (2)' })).toBeInTheDocument()
    })
  })

  it('shows Refreshing… when loading with cards already on screen', async () => {
    const refresh = deferred()

    taskService.listTasks
      .mockResolvedValueOnce([todoTask, inProgressTask])
      .mockImplementationOnce(() => refresh.promise)

    render(<BoardPage />)
    await settleInitialLoad()

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(screen.getByText('Refreshing…')).toBeInTheDocument()
    expect(screen.getByTestId('task-1')).toBeInTheDocument()
    expect(document.querySelector('.board')).toHaveAttribute('aria-busy', 'true')

    refresh.resolve([todoTask, inProgressTask])
    await waitFor(() => {
      expect(screen.queryByText('Refreshing…')).not.toBeInTheDocument()
    })
  })

  it('refreshes column counts after delete via re-fetch', async () => {
    taskService.listTasks
      .mockResolvedValueOnce([todoTask, inProgressTask])
      .mockResolvedValueOnce([inProgressTask])

    render(<BoardPage />)
    await settleInitialLoad()

    const callsBeforeDelete = taskService.listTasks.mock.calls.length
    await userEvent.click(within(screen.getByTestId('task-1')).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(taskService.listTasks.mock.calls.length).toBeGreaterThan(callsBeforeDelete)
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'To Do (0)' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'In Progress (1)' })).toBeInTheDocument()
    })
  })
})

describe('BoardPage loading and failure states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taskService.createTask.mockResolvedValue({ id: 99, title: 'New', status: 'todo' })
    taskService.updateTask.mockResolvedValue({})
    taskService.deleteTask.mockResolvedValue(undefined)
  })

  it('shows error and unavailable columns on first-load failure', async () => {
    taskService.listTasks.mockRejectedValue(new Error('network'))

    render(<BoardPage />)

    await waitFor(() => {
      expect(screen.getByText('Could not load tasks. Is the backend running?')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Tasks unavailable')).toHaveLength(3)
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument()
    expect(screen.queryByTestId(/^task-/)).not.toBeInTheDocument()
  })
})

describe('BoardPage motion intents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        return 80
      },
    })
    taskService.listTasks.mockResolvedValue([todoTask, inProgressTask])
    taskService.createTask.mockResolvedValue({ id: 99, title: 'New task', status: 'todo' })
    taskService.updateTask.mockResolvedValue({})
    taskService.deleteTask.mockResolvedValue(undefined)
  })

  afterEach(() => {
    delete HTMLElement.prototype.offsetHeight
    vi.useRealTimers()
  })

  async function settleInitialLoad() {
    await waitFor(() => {
      expect(taskService.listTasks).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'To Do (1)' })).toBeInTheDocument()
    })
  }

  it('plays entrance animation after create arms intent with returned id and load id', async () => {
    taskService.listTasks
      .mockResolvedValueOnce([todoTask, inProgressTask])
      .mockResolvedValueOnce([todoTask, inProgressTask, { id: 99, title: 'New task', status: 'todo' }])

    const { container } = render(<BoardPage />)
    await settleInitialLoad()

    await userEvent.type(screen.getByLabelText('Title'), 'New task')
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }))

    await waitFor(() => {
      expect(container.querySelector('.card-slot--entering')).toBeInTheDocument()
    })
    expect(screen.getByTestId('task-99')).toBeInTheDocument()
  })

  it('raises move intent synchronously before the update resolves', async () => {
    const update = deferred()
    taskService.updateTask.mockReturnValue(update.promise)
    taskService.listTasks
      .mockResolvedValueOnce([todoTask, inProgressTask])
      .mockResolvedValueOnce([inProgressTask, { ...todoTask, status: 'in-progress' }])

    render(<BoardPage />)
    await settleInitialLoad()

    await userEvent.click(screen.getByRole('button', { name: /Move to In Progress/ }))

    expect(screen.getByTestId('task-1')).toBeInTheDocument()
    expect(taskService.updateTask).toHaveBeenCalled()

    update.resolve({})
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'In Progress (2)' })).toBeInTheDocument()
    })
  })

  it('does not consume a move intent when Refresh completes before the move refresh', async () => {
    const update = deferred()
    const moveRefresh = deferred()
    const plainRefresh = deferred()

    taskService.updateTask.mockReturnValue(update.promise)
    taskService.listTasks
      .mockResolvedValueOnce([todoTask, inProgressTask])
      .mockImplementationOnce(() => plainRefresh.promise)
      .mockImplementationOnce(() => moveRefresh.promise)

    const { container } = render(<BoardPage />)
    await settleInitialLoad()

    await userEvent.click(screen.getByRole('button', { name: /Move to In Progress/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    plainRefresh.resolve([todoTask, inProgressTask])
    await waitFor(() => {
      expect(screen.queryByText('Refreshing…')).not.toBeInTheDocument()
    })
    expect(container.querySelector('.card-ghost')).not.toBeInTheDocument()

    update.resolve({})
    moveRefresh.resolve([inProgressTask, { ...todoTask, status: 'in-progress' }])
    await waitFor(() => {
      expect(container.querySelector('.card-ghost')).toBeInTheDocument()
    })
  })

  it('retains create intent across a filter change and still animates in the live filter', async () => {
    const create = deferred()

    taskService.listTasks.mockImplementation((status) => {
      if (status === 'todo') return Promise.resolve([todoTask])
      if (status === 'in-progress') {
        return Promise.resolve([inProgressTask, { id: 99, title: 'Deferred create', status: 'in-progress' }])
      }
      return Promise.resolve([todoTask, inProgressTask])
    })
    taskService.createTask.mockReturnValue(create.promise)

    const { container } = render(<BoardPage />)
    await settleInitialLoad()

    const filter = screen.getByRole('combobox', { name: 'Filter by status' })
    await userEvent.selectOptions(filter, 'todo')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Todo task/ })).toBeInTheDocument()
    })

    await userEvent.type(screen.getByLabelText('Title'), 'Deferred create')
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }))
    await userEvent.selectOptions(filter, 'in-progress')

    create.resolve({ id: 99, title: 'Deferred create', status: 'todo' })
    await waitFor(() => {
      expect(filter).toHaveValue('in-progress')
      expect(screen.getByTestId('task-99')).toBeInTheDocument()
    })
    expect(container.querySelector('.card-slot--entering')).toBeInTheDocument()
  })

  it('settles a filtered-out create intent without animation', async () => {
    const create = deferred()

    taskService.listTasks.mockImplementation((status) => {
      if (status === 'todo') return Promise.resolve([todoTask])
      if (status === 'in-progress') return Promise.resolve([inProgressTask])
      return Promise.resolve([todoTask, inProgressTask])
    })
    taskService.createTask.mockReturnValue(create.promise)

    const { container } = render(<BoardPage />)
    await settleInitialLoad()

    const filter = screen.getByRole('combobox', { name: 'Filter by status' })
    await userEvent.selectOptions(filter, 'todo')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Todo task/ })).toBeInTheDocument()
    })

    await userEvent.type(screen.getByLabelText('Title'), 'Deferred create')
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }))
    await userEvent.selectOptions(filter, 'in-progress')

    create.resolve({ id: 99, title: 'Deferred create', status: 'todo' })
    await waitFor(() => {
      expect(filter).toHaveValue('in-progress')
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(container.querySelector('.card-slot--entering')).not.toBeInTheDocument()
    expect(screen.queryByTestId('task-99')).not.toBeInTheDocument()
  })

  it('removes move intent when the mutation rejects', async () => {
    taskService.updateTask.mockRejectedValue(new Error('network'))
    const onUnhandled = vi.fn()
    process.on('unhandledRejection', onUnhandled)

    const { container } = render(<BoardPage />)
    await settleInitialLoad()

    await userEvent.click(screen.getByRole('button', { name: /Move to In Progress/ }))

    await waitFor(() => {
      expect(taskService.updateTask).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(onUnhandled).toHaveBeenCalled()
    })
    expect(container.querySelector('.card-ghost')).not.toBeInTheDocument()
    expect(container.querySelector('.card-slot--growing')).not.toBeInTheDocument()
    process.off('unhandledRejection', onUnhandled)
  })

  it('clears pending intents after motion settles', async () => {
    taskService.listTasks
      .mockResolvedValueOnce([todoTask, inProgressTask])
      .mockResolvedValueOnce([todoTask, inProgressTask, { id: 99, title: 'New task', status: 'todo' }])
      .mockResolvedValueOnce([todoTask, inProgressTask, { id: 99, title: 'New task', status: 'todo' }])

    const { container } = render(<BoardPage />)
    await settleInitialLoad()

    await userEvent.type(screen.getByLabelText('Title'), 'New task')
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }))

    await waitFor(() => {
      expect(container.querySelector('.card-slot--entering')).toBeInTheDocument()
    })

    const slot = container.querySelector('.card-slot--entering')
    await act(async () => {
      slot.dispatchEvent(new Event('animationend'))
    })

    await waitFor(() => {
      expect(container.querySelector('.card-slot--entering')).not.toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => {
      expect(screen.queryByText('Refreshing…')).not.toBeInTheDocument()
    })
    expect(container.querySelector('.card-slot--entering')).not.toBeInTheDocument()
  })
})
