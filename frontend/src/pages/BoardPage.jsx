import { useCallback, useEffect, useState } from 'react'
import StatusFilter from '../components/StatusFilter'
import TaskForm from '../components/TaskForm'
import TaskList from '../components/TaskList'
import * as taskService from '../services/taskService'

function countOf(task) {
  if (typeof task.commentCount === 'number') return task.commentCount
  if (typeof task.comment_count === 'number') return task.comment_count
  return 0
}

function withCount(task, count) {
  return { ...task, commentCount: count, comment_count: count }
}

// Container component: owns the task list state and all data fetching.
export default function BoardPage() {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [commentsByTask, setCommentsByTask] = useState({})
  const [commentError, setCommentError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTasks(await taskService.listTasks(filter))
    } catch {
      setError('Could not load tasks. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleCreate(task) {
    await taskService.createTask(task)
    await refresh()
  }

  async function handleAdvance(task, nextStatus) {
    await taskService.updateTask(task.id, { ...task, status: nextStatus })
    await refresh()
  }

  async function handleDelete(task) {
    await taskService.deleteTask(task.id)
    setCommentsByTask((prev) => {
      const next = { ...prev }
      delete next[task.id]
      return next
    })
    if (expandedTaskId === task.id) setExpandedTaskId(null)
    await refresh()
  }

  async function handleToggleComments(task) {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null)
      setCommentError(null)
      return
    }
    setCommentError(null)
    setExpandedTaskId(task.id)
    try {
      const comments = await taskService.listComments(task.id)
      setCommentsByTask((prev) => ({ ...prev, [task.id]: comments }))
    } catch {
      setCommentError('Could not load comments.')
      setCommentsByTask((prev) => ({ ...prev, [task.id]: [] }))
    }
  }

  async function handlePostComment(task, payload) {
    setCommentError(null)
    try {
      const created = await taskService.createComment(task.id, payload)
      setCommentsByTask((prev) => ({
        ...prev,
        [task.id]: [...(prev[task.id] ?? []), created],
      }))
      setTasks((prev) => prev.map((t) => (
        t.id === task.id ? withCount(t, countOf(t) + 1) : t
      )))
    } catch {
      setCommentError('Author and comment are required.')
    }
  }

  async function handleDeleteComment(task, comment) {
    setCommentError(null)
    try {
      await taskService.deleteComment(task.id, comment.id)
      setCommentsByTask((prev) => ({
        ...prev,
        [task.id]: (prev[task.id] ?? []).filter((c) => c.id !== comment.id),
      }))
      setTasks((prev) => prev.map((t) => (
        t.id === task.id ? withCount(t, Math.max(0, countOf(t) - 1)) : t
      )))
    } catch {
      setCommentError('That comment is no longer there.')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Engineering Task Board</h1>
        <span className="assignee">Module 01 — AI Champions Programme</span>
      </header>

      <TaskForm onCreate={handleCreate} />

      <div className="toolbar">
        <StatusFilter value={filter} onChange={setFilter} />
        <button onClick={refresh}>Refresh</button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? <p>Loading…</p> : (
        <TaskList
          tasks={tasks}
          filter={filter}
          onAdvance={handleAdvance}
          onDelete={handleDelete}
          commentsByTask={commentsByTask}
          expandedTaskId={expandedTaskId}
          onToggleComments={handleToggleComments}
          onPostComment={handlePostComment}
          onDeleteComment={handleDeleteComment}
          commentError={commentError}
        />
      )}
    </div>
  )
}
