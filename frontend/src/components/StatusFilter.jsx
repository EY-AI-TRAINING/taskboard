import { STATUSES, STATUS_LABELS } from '../constants'

// Dropdown that narrows the board to a single status (or "all").
export default function StatusFilter({ value, onChange }) {
  return (
    <label>
      Filter by status
      <select
        aria-label="Filter by status"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="all">All</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  )
}
