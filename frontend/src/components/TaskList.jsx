import { STATUSES, STATUS_LABELS } from '../constants'
import TaskCard from './TaskCard'

// Renders the three Kanban columns. When a status filter is active, only the
// matching column is shown.
export default function TaskList({ tasks, filter, onAdvance, onDelete }) {
  const columns = filter === 'all' ? STATUSES : [filter]

  return (
    <div className="board">
      {columns.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status)
        return (
          <section className="column" key={status} aria-label={STATUS_LABELS[status]}>
            <h2>
              {STATUS_LABELS[status]} ({columnTasks.length})
            </h2>
            {columnTasks.length === 0 && <p className="assignee">No tasks</p>}
            {columnTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onAdvance={onAdvance}
                onDelete={onDelete}
              />
            ))}
          </section>
        )
      })}
    </div>
  )
}
