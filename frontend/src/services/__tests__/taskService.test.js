import { afterEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import * as taskService from '../taskService'

vi.mock('../api')

afterEach(() => vi.clearAllMocks())

describe('taskService', () => {
  it('omits the status param when filter is "all"', async () => {
    api.get.mockResolvedValue({ data: [] })
    await taskService.listTasks('all')
    expect(api.get).toHaveBeenCalledWith('/api/tasks', { params: {} })
  })

  it('passes status through when a filter is set', async () => {
    api.get.mockResolvedValue({ data: [] })
    await taskService.listTasks('todo')
    expect(api.get).toHaveBeenCalledWith('/api/tasks', { params: { status: 'todo' } })
  })

  it('posts a new task and returns the created record', async () => {
    api.post.mockResolvedValue({ data: { id: 7, title: 'x' } })
    const result = await taskService.createTask({ title: 'x' })
    expect(api.post).toHaveBeenCalledWith('/api/tasks', { title: 'x' })
    expect(result).toEqual({ id: 7, title: 'x' })
  })

  it('deletes by id', async () => {
    api.delete.mockResolvedValue({})
    await taskService.deleteTask(3)
    expect(api.delete).toHaveBeenCalledWith('/api/tasks/3')
  })

  it('lists comments for a task', async () => {
    api.get.mockResolvedValue({ data: [] })
    await taskService.listComments(4)
    expect(api.get).toHaveBeenCalledWith('/api/tasks/4/comments')
  })

  it('posts a comment', async () => {
    api.post.mockResolvedValue({ data: { id: 1, author: 'Ana', body: 'Hi' } })
    const result = await taskService.createComment(4, { author: 'Ana', body: 'Hi' })
    expect(api.post).toHaveBeenCalledWith('/api/tasks/4/comments', { author: 'Ana', body: 'Hi' })
    expect(result.body).toBe('Hi')
  })

  it('deletes a comment', async () => {
    api.delete.mockResolvedValue({})
    await taskService.deleteComment(4, 2)
    expect(api.delete).toHaveBeenCalledWith('/api/tasks/4/comments/2')
  })
})
