/**
 * TaskList.jsx - draws the whole list, or a friendly message when it is
 * empty.
 *
 * Notice the "key" prop: React needs a stable, unique value (our database
 * id) to know which row is which when the order changes.
 */
import TaskItem from "./TaskItem.jsx";

export default function TaskList({
  tasks,
  orderIndex,
  taskCount,
  busyTaskId,
  filter,
  onToggle,
  onEdit,
  onDelete,
  onMove,
}) {
  if (tasks.length === 0) {
    return <p className="empty-state">{emptyMessageFor(filter, taskCount)}</p>;
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => {
        const realPosition = orderIndex.get(task.id);
        return (
          <TaskItem
            key={task.id}
            task={task}
            isBusy={busyTaskId === task.id}
            canMoveUp={realPosition > 0}
            canMoveDown={realPosition < taskCount - 1}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
          />
        );
      })}
    </ul>
  );
}

/** A different sentence depending on why the list is empty. */
function emptyMessageFor(filter, taskCount) {
  if (taskCount === 0) {
    return "No tasks yet. Add your first one above to get started.";
  }
  if (filter === "pending") {
    return "Nothing left to do - every task is completed. Nice work!";
  }
  if (filter === "completed") {
    return "You have not completed any tasks yet.";
  }
  return "No tasks to show.";
}
