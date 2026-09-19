import { STATUSES, STATUS_LABELS } from '../constants'

// Presentational card for one task. All mutations are delegated upward via
// callbacks so this component stays easy to test in isolation.
export default function TaskCard({ task, onAdvance, onDelete }) {
  const currentIndex = STATUSES.indexOf(task.status)
  const nextStatus = STATUSES[currentIndex + 1]

  return (
    <article className="card" data-testid={`task-${task.id}`}>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      <span className="assignee">
        {task.assignee ? `Assigned to ${task.assignee}` : 'Unassigned'}
      </span>
      <div className="card-actions">
        {nextStatus && (
          <button onClick={() => onAdvance(task, nextStatus)}>
            Move to {STATUS_LABELS[nextStatus]}
          </button>
        )}
        <button onClick={() => onDelete(task)}>Delete</button>
      </div>
    </article>
  )
}
