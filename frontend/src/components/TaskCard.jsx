import { STATUSES, STATUS_LABELS } from '../constants'

function commentCountOf(task) {
  if (typeof task.commentCount === 'number') return task.commentCount
  if (typeof task.comment_count === 'number') return task.comment_count
  return 0
}

function createdAtOf(comment) {
  return comment.createdAt || comment.created_at
}

export function formatApproximateTime(iso, now = new Date()) {
  if (!iso) return ''
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  const deltaMs = now.getTime() - then.getTime()
  const deltaSec = Math.max(0, Math.round(deltaMs / 1000))
  if (deltaSec < 60) return 'just now'
  const deltaMin = Math.round(deltaSec / 60)
  if (deltaMin < 60) return deltaMin === 1 ? '1 minute ago' : `${deltaMin} minutes ago`
  const deltaHours = Math.round(deltaMin / 60)
  if (deltaHours < 24) return deltaHours === 1 ? '1 hour ago' : `${deltaHours} hours ago`
  return then.toLocaleDateString()
}

// Presentational card for one task. All mutations are delegated upward via
// callbacks so this component stays easy to test in isolation.
export default function TaskCard({
  task,
  onAdvance,
  onDelete,
  comments = [],
  commentsOpen = false,
  onToggleComments,
  onPostComment,
  onDeleteComment,
  commentError,
}) {
  const currentIndex = STATUSES.indexOf(task.status)
  const nextStatus = STATUSES[currentIndex + 1]
  const count = commentCountOf(task)

  function handlePost(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const author = String(data.get('author') ?? '').trim()
    const body = String(data.get('body') ?? '').trim()
    if (!author || !body) return
    onPostComment?.(task, { author, body })
    form.reset()
  }

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
        <button
          className="comment-toggle"
          aria-expanded={commentsOpen}
          onClick={() => onToggleComments?.(task)}
        >
          💬{count > 0 ? ` ${count}` : ''}
        </button>
      </div>

      {commentsOpen && (
        <div className="comment-thread">
          {comments.length === 0 && (
            <p className="assignee">No comments yet</p>
          )}
          <ol className="comment-list">
            {comments.map((comment) => (
              <li key={comment.id} className="comment-item">
                <div className="comment-meta">
                  <strong>{comment.author}</strong>
                  <time dateTime={createdAtOf(comment)}>
                    {formatApproximateTime(createdAtOf(comment))}
                  </time>
                </div>
                <p>{comment.body}</p>
                <button
                  className="comment-delete"
                  onClick={() => onDeleteComment?.(task, comment)}
                >
                  Delete comment
                </button>
              </li>
            ))}
          </ol>
          <form className="comment-form" onSubmit={handlePost}>
            <label>
              Author
              <input name="author" maxLength={100} required />
            </label>
            <label>
              Comment
              <textarea name="body" maxLength={500} rows={2} required />
            </label>
            {commentError && <p className="error">{commentError}</p>}
            <button type="submit" className="primary">Post</button>
          </form>
        </div>
      )}
    </article>
  )
}
