/**
 * FilterBar.jsx - the All / Pending / Completed buttons.
 *
 * These buttons do NOT talk to the database. They only change a piece of
 * state in App.jsx, and React redraws the list accordingly. Most filters in
 * real applications work this way.
 */
const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

export default function FilterBar({ filter, onChange, stats }) {
  const countFor = {
    all: stats.total,
    pending: stats.pending,
    completed: stats.completed,
  };

  return (
    <div className="filters" role="group" aria-label="Filter tasks">
      {FILTERS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={
            filter === option.value ? "filters__button is-active" : "filters__button"
          }
          aria-pressed={filter === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          <span className="filters__count">{countFor[option.value]}</span>
        </button>
      ))}
    </div>
  );
}
