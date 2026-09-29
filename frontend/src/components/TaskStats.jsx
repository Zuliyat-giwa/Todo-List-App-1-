/**
 * TaskStats.jsx - the small counter shown in the header.
 * It only receives numbers and displays them, which makes it the simplest
 * kind of component: a "presentational" one.
 */
export default function TaskStats({ total, completed, pending }) {
  return (
    <dl className="stats">
      <div className="stats__item">
        <dt className="stats__label">Total</dt>
        <dd className="stats__value">{total}</dd>
      </div>
      <div className="stats__item">
        <dt className="stats__label">Completed</dt>
        <dd className="stats__value stats__value--done">{completed}</dd>
      </div>
      <div className="stats__item">
        <dt className="stats__label">Pending</dt>
        <dd className="stats__value stats__value--pending">{pending}</dd>
      </div>
    </dl>
  );
}
