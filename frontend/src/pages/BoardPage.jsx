import { useCallback, useEffect, useRef, useState } from 'react'
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

function createIntentKey(taskId) {
  return `create:${taskId}`
}

function moveIntentKey(taskId, from) {
  return `move:${taskId}:${from}`
}

function initialBoard() {
  return {
    requestId: 0,
    filter: 'all',
    phase: 'loading',
    tasks: [],
    error: null,
  }
}

// Container component: owns the task list state and all data fetching.
export default function BoardPage() {
  const [board, setBoard] = useState(initialBoard)
  const boardRef = useRef(board)
  const nextRequestIdRef = useRef(1)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [commentsByTask, setCommentsByTask] = useState({})
  const [commentError, setCommentError] = useState(null)
  const [pendingCreates, setPendingCreates] = useState([])
  const [pendingMoves, setPendingMoves] = useState([])

  const commit = useCallback((next) => {
    boardRef.current = next
    setBoard(next)
  }, [])

  const runLoad = useCallback(async (requestId, filter) => {
    try {
      const fetched = await taskService.listTasks(filter)
      if (boardRef.current.requestId !== requestId) return
      commit({
        ...boardRef.current,
        phase: 'ready',
        tasks: fetched,
        error: null,
      })
    } catch {
      if (boardRef.current.requestId !== requestId) return
      commit({
        ...boardRef.current,
        phase: 'failed',
        error: 'Could not load tasks. Is the backend running?',
      })
    }
  }, [commit])

  const beginLoad = useCallback((nextFilter) => {
    const prev = boardRef.current
    const filter = nextFilter !== undefined ? nextFilter : prev.filter
    const requestId = nextRequestIdRef.current
    nextRequestIdRef.current += 1
    commit({
      requestId,
      filter,
      phase: 'loading',
      tasks: prev.filter === filter ? prev.tasks : [],
      error: null,
    })
    return requestId
  }, [commit])

  const startLoad = useCallback((nextFilter) => {
    const filter = nextFilter !== undefined ? nextFilter : boardRef.current.filter
    const requestId = beginLoad(nextFilter)
    runLoad(requestId, filter)
  }, [beginLoad, runLoad])

  useEffect(() => {
    startLoad()
  }, [startLoad])

  const handleMotionSettled = useCallback((key) => {
    setPendingCreates((prev) => prev.filter((intent) => intent.key !== key))
    setPendingMoves((prev) => prev.filter((intent) => intent.key !== key))
  }, [])

  async function handleCreate(task) {
    const created = await taskService.createTask(task)
    const key = createIntentKey(created.id)
    setPendingCreates((prev) => [
      ...prev,
      { key, taskId: created.id, revealedByRequestId: null },
    ])
    const requestId = beginLoad()
    setPendingCreates((prev) => prev.map((intent) => (
      intent.key === key ? { ...intent, revealedByRequestId: requestId } : intent
    )))
    await runLoad(requestId, boardRef.current.filter)
  }

  async function handleAdvance(task, nextStatus) {
    const from = task.status
    const to = nextStatus
    const key = moveIntentKey(task.id, from)
    setPendingMoves((prev) => [
      ...prev,
      { key, task, from, to, revealedByRequestId: null },
    ])
    try {
      await taskService.updateTask(task.id, { ...task, status: nextStatus })
      const requestId = beginLoad()
      setPendingMoves((prev) => prev.map((intent) => (
        intent.key === key ? { ...intent, revealedByRequestId: requestId } : intent
      )))
      await runLoad(requestId, boardRef.current.filter)
    } catch (err) {
      setPendingMoves((prev) => prev.filter((intent) => intent.key !== key))
      throw err
    }
  }

  async function handleDelete(task) {
    await taskService.deleteTask(task.id)
    setCommentsByTask((prev) => {
      const next = { ...prev }
      delete next[task.id]
      return next
    })
    if (expandedTaskId === task.id) setExpandedTaskId(null)
    const requestId = beginLoad()
    await runLoad(requestId, boardRef.current.filter)
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
      const live = boardRef.current
      commit({
        ...live,
        tasks: live.tasks.map((t) => (
          t.id === task.id ? withCount(t, countOf(t) + 1) : t
        )),
      })
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
      const live = boardRef.current
      commit({
        ...live,
        tasks: live.tasks.map((t) => (
          t.id === task.id ? withCount(t, Math.max(0, countOf(t) - 1)) : t
        )),
      })
    } catch {
      setCommentError('That comment is no longer there.')
    }
  }

  function handleFilterChange(nextFilter) {
    startLoad(nextFilter)
  }

  function handleRefresh() {
    startLoad()
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-title">
          <h1>Engineering Task Board</h1>
          <span className="app-context">Module 01 — AI Champions Programme</span>
        </div>
        <div className="toolbar">
          <StatusFilter value={board.filter} onChange={handleFilterChange} />
          {board.phase === 'loading' && board.tasks.length > 0 && (
            <span className="refreshing-label">Refreshing…</span>
          )}
          <button type="button" onClick={handleRefresh}>Refresh</button>
        </div>
      </header>

      <TaskForm onCreate={handleCreate} />

      {board.error && <p className="error">{board.error}</p>}
      <TaskList
        tasks={board.tasks}
        filter={board.filter}
        phase={board.phase}
        requestId={board.requestId}
        pendingCreates={pendingCreates}
        pendingMoves={pendingMoves}
        onMotionSettled={handleMotionSettled}
        onAdvance={handleAdvance}
        onDelete={handleDelete}
        commentsByTask={commentsByTask}
        expandedTaskId={expandedTaskId}
        onToggleComments={handleToggleComments}
        onPostComment={handlePostComment}
        onDeleteComment={handleDeleteComment}
        commentError={commentError}
      />
    </div>
  )
}
