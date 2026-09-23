import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { STATUSES, STATUS_LABELS } from '../constants'
import TaskCard from './TaskCard'

function isConsumable(intent, phase, requestId) {
  return phase !== 'loading'
    && intent.revealedByRequestId != null
    && requestId >= intent.revealedByRequestId
}

function animationWillRun(el) {
  return getComputedStyle(el).animationName !== 'none'
}

function ghostWillAnimate(el) {
  const style = getComputedStyle(el)
  return style.display !== 'none' && style.animationName !== 'none'
}

// Renders the three Kanban columns. When a status filter is active, only the
// matching column is shown.
export default function TaskList({
  tasks,
  filter,
  phase,
  requestId,
  pendingCreates = [],
  pendingMoves = [],
  onMotionSettled,
  onAdvance,
  onDelete,
  commentsByTask,
  expandedTaskId,
  onToggleComments,
  onPostComment,
  onDeleteComment,
  commentError,
}) {
  const columns = filter === 'all' ? STATUSES : [filter]
  const isLoading = phase === 'loading'
  const isFailedEmpty = phase === 'failed' && tasks.length === 0
  const isLoadingEmpty = phase === 'loading' && tasks.length === 0
  const showCounts = !isFailedEmpty && !isLoadingEmpty

  const processedKeys = useRef(new Set())
  const measuredHeights = useRef(new Map())
  const slotRefs = useRef(new Map())
  const ghostRefs = useRef(new Map())
  const animationParts = useRef(new Map())
  const enteringIntentByTask = useRef(new Map())
  const growingIntentByTask = useRef(new Map())
  const immediateSettleQueue = useRef([])

  const [enteringIds, setEnteringIds] = useState(() => new Set())
  const [growingIds, setGrowingIds] = useState(() => new Set())
  const [activeGhosts, setActiveGhosts] = useState([])
  const consumableCreates = useMemo(
    () => pendingCreates.filter((intent) => isConsumable(intent, phase, requestId)),
    [pendingCreates, phase, requestId],
  )

  const consumableMoves = useMemo(
    () => pendingMoves.filter((intent) => isConsumable(intent, phase, requestId)),
    [pendingMoves, phase, requestId],
  )

  useLayoutEffect(() => {
    pendingMoves.forEach((intent) => {
      if (measuredHeights.current.has(intent.key)) return
      const slotEl = slotRefs.current.get(intent.task.id)
      if (slotEl) {
        measuredHeights.current.set(intent.key, slotEl.offsetHeight)
      }
    })
  }, [pendingMoves])

  useLayoutEffect(() => {
    if (phase === 'loading') return

    const newEntering = []
    const newGrowing = []
    const newGhosts = []
    const immediate = []

    consumableCreates.forEach((intent) => {
      if (processedKeys.current.has(intent.key)) return
      processedKeys.current.add(intent.key)

      if (tasks.some((t) => t.id === intent.taskId)) {
        newEntering.push(intent.taskId)
        enteringIntentByTask.current.set(intent.taskId, intent.key)
        animationParts.current.set(intent.key, 1)
      } else {
        immediate.push(intent.key)
      }
    })

    consumableMoves.forEach((intent) => {
      if (processedKeys.current.has(intent.key)) return
      processedKeys.current.add(intent.key)

      let parts = 0
      const toVisible = columns.includes(intent.to)
      const fromVisible = columns.includes(intent.from)
      const cardInTo = tasks.some((t) => t.id === intent.task.id && t.status === intent.to)
      const cardInFrom = tasks.some((t) => t.id === intent.task.id && t.status === intent.from)

      if (toVisible && cardInTo) {
        newGrowing.push(intent.task.id)
        growingIntentByTask.current.set(intent.task.id, intent.key)
        parts += 1
      }

      if (fromVisible && !cardInFrom) {
        newGhosts.push({
          key: intent.key,
          from: intent.from,
          height: measuredHeights.current.get(intent.key) ?? 0,
        })
        parts += 1
      }

      if (parts === 0) {
        immediate.push(intent.key)
      } else {
        animationParts.current.set(intent.key, parts)
      }
    })

    if (newEntering.length > 0) {
      setEnteringIds((prev) => {
        const next = new Set(prev)
        newEntering.forEach((id) => next.add(id))
        return next
      })
    }
    if (newGrowing.length > 0) {
      setGrowingIds((prev) => {
        const next = new Set(prev)
        newGrowing.forEach((id) => next.add(id))
        return next
      })
    }
    if (newGhosts.length > 0) {
      setActiveGhosts((prev) => {
        const existing = new Set(prev.map((ghost) => ghost.key))
        const merged = [...prev]
        newGhosts.forEach((ghost) => {
          if (!existing.has(ghost.key)) merged.push(ghost)
        })
        return merged
      })
    }
    if (immediate.length > 0) {
      immediateSettleQueue.current.push(...immediate)
    }
  }, [phase, requestId, tasks, columns, consumableCreates, consumableMoves])

  useEffect(() => {
    if (immediateSettleQueue.current.length === 0) return
    const keys = [...immediateSettleQueue.current]
    immediateSettleQueue.current = []
    keys.forEach((key) => onMotionSettled?.(key))
  })

  const finishIntent = useCallback((key) => {
    if (key == null) return
    const remaining = animationParts.current.get(key)
    if (remaining == null) {
      onMotionSettled?.(key)
      return
    }
    if (remaining <= 1) {
      animationParts.current.delete(key)
      onMotionSettled?.(key)
      return
    }
    animationParts.current.set(key, remaining - 1)
  }, [onMotionSettled])

  const handleEnterEnd = useCallback((taskId) => {
    setEnteringIds((prev) => {
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
    const key = enteringIntentByTask.current.get(taskId)
    enteringIntentByTask.current.delete(taskId)
    finishIntent(key)
  }, [finishIntent])

  const handleGrowEnd = useCallback((taskId) => {
    setGrowingIds((prev) => {
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
    const key = growingIntentByTask.current.get(taskId)
    growingIntentByTask.current.delete(taskId)
    finishIntent(key)
  }, [finishIntent])

  const handleGhostEnd = useCallback((key) => {
    setActiveGhosts((prev) => prev.filter((ghost) => ghost.key !== key))
    finishIntent(key)
  }, [finishIntent])

  useLayoutEffect(() => {
    const cleanups = []

    enteringIds.forEach((taskId) => {
      const el = slotRefs.current.get(taskId)
      if (!el) return
      if (!animationWillRun(el)) {
        handleEnterEnd(taskId)
        return
      }
      const onEnd = (event) => {
        if (event.target !== el) return
        handleEnterEnd(taskId)
      }
      el.addEventListener('animationend', onEnd)
      cleanups.push(() => el.removeEventListener('animationend', onEnd))
    })

    growingIds.forEach((taskId) => {
      const el = slotRefs.current.get(taskId)
      if (!el) return
      if (!animationWillRun(el)) {
        handleGrowEnd(taskId)
        return
      }
      const onEnd = (event) => {
        if (event.target !== el) return
        handleGrowEnd(taskId)
      }
      el.addEventListener('animationend', onEnd)
      cleanups.push(() => el.removeEventListener('animationend', onEnd))
    })

    return () => cleanups.forEach((cleanup) => cleanup())
  }, [enteringIds, growingIds, handleEnterEnd, handleGrowEnd])

  useLayoutEffect(() => {
    activeGhosts.forEach((ghost) => {
      const el = ghostRefs.current.get(ghost.key)
      if (!el) return
      if (!ghostWillAnimate(el)) {
        handleGhostEnd(ghost.key)
      }
    })
  }, [activeGhosts, handleGhostEnd])

  function renderCard(task) {
    const slotClass = [
      'card-slot',
      enteringIds.has(task.id) ? 'card-slot--entering' : '',
      growingIds.has(task.id) ? 'card-slot--growing' : '',
    ].filter(Boolean).join(' ')

    return (
      <div
        key={task.id}
        className={slotClass}
        ref={(el) => {
          if (el) slotRefs.current.set(task.id, el)
          else slotRefs.current.delete(task.id)
        }}
      >
        <TaskCard
          task={task}
          onAdvance={onAdvance}
          onDelete={onDelete}
          comments={commentsByTask?.[task.id] ?? []}
          commentsOpen={expandedTaskId === task.id}
          onToggleComments={onToggleComments}
          onPostComment={onPostComment}
          onDeleteComment={onDeleteComment}
          commentError={expandedTaskId === task.id ? commentError : null}
        />
      </div>
    )
  }

  return (
    <div className="board" aria-busy={isLoading ? 'true' : undefined}>
      {isLoadingEmpty && (
        <span className="visually-hidden">Loading tasks…</span>
      )}
      {columns.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status)
        const columnGhosts = activeGhosts.filter((ghost) => ghost.from === status)
        const heading = showCounts
          ? `${STATUS_LABELS[status]} (${columnTasks.length})`
          : STATUS_LABELS[status]

        return (
          <section
            className="column"
            key={status}
            data-status={status}
            aria-label={STATUS_LABELS[status]}
          >
            <div className="column-header">
              <h2>{heading}</h2>
            </div>
            {isFailedEmpty && (
              <p className="column-state">Tasks unavailable</p>
            )}
            {isLoadingEmpty && (
              <div className="skeleton" aria-hidden="true" />
            )}
            {!isFailedEmpty && !isLoadingEmpty && (
              <>
                {columnTasks.map((task) => renderCard(task))}
                {columnGhosts.map((ghost) => (
                  <div
                    key={ghost.key}
                    className="card-ghost"
                    aria-hidden="true"
                    style={{ '--ghost-height': `${ghost.height}px` }}
                    ref={(el) => {
                      if (el) ghostRefs.current.set(ghost.key, el)
                      else ghostRefs.current.delete(ghost.key)
                    }}
                    onAnimationEnd={(event) => {
                      if (event.target !== event.currentTarget) return
                      handleGhostEnd(ghost.key)
                    }}
                  />
                ))}
                {phase === 'ready' && columnTasks.length === 0 && columnGhosts.length === 0 && (
                  <p className="column-state">No tasks yet</p>
                )}
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}
