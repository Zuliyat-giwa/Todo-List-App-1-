/**
 * TaskItem.jsx - ONE row in the task list.
 *
 * This component has two "modes":
 *   - view mode  : checkbox, title, notes and the action buttons
 *   - edit mode  : a small form with the title and notes boxes
 *
 * A local piece of state called isEditing decides which one is shown.
 */
import { useState } from "react";

const MAX_TITLE_LENGTH = 200;
const MAX_NOTES_LENGTH = 2000;

export default function TaskItem({
  task,
  isBusy,
  canMoveUp,
  canMoveDown,
  onToggle,
  onEdit,
  onDelete,
  onMove,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftNotes, setDraftNotes] = useState(task.notes);
  const [editError, setEditError] = useState("");

  /** Open edit mode, copying the current values into the form. */
  function startEditing() {
    setDraftTitle(task.title);
    setDraftNotes(task.notes);
    setEditError("");
    setIsEditing(true);
  }

  async function handleSave(event) {
    event.preventDefault();

    const cleanTitle = draftTitle.trim();
    if (!cleanTitle) {
      setEditError("A task needs a title, so this change was not saved.");
      return;
    }

    setEditError("");
    const saved = await onEdit(task.id, {
      title: cleanTitle,
      notes: draftNotes.trim(),
    });

    // Stay in edit mode if saving failed, so nothing you typed is lost.
    if (saved) {
      setIsEditing(false);
    }
  }

  function handleDelete() {
    // A plain browser confirmation is enough here and stops accidents.
    const confirmed = window.confirm(`Delete "${task.title}"?`);
    if (confirmed) {
      onDelete(task.id);
    }
  }

  if (isEditing) {
    return (
      <li className="task-card task-card--editing">
        <form className="edit-form" onSubmit={handleSave} noValidate>
          <label className="field">
            <span className="field__label">Task</span>
            <input
              type="text"
              className="field__input"
              value={draftTitle}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(event) => setDraftTitle(event.target.value)}
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field__label">
              Notes <span className="field__hint">(optional)</span>
            </span>
            <textarea
              className="field__input field__input--textarea"
              rows={3}
              value={draftNotes}
              maxLength={MAX_NOTES_LENGTH}
              onChange={(event) => setDraftNotes(event.target.value)}
            />
          </label>

          {editError && <p className="form-error">{editError}</p>}

          <div className="edit-form__actions">
            <button
              type="submit"
              className="button button--primary"
              disabled={isBusy}
            >
              {isBusy ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setIsEditing(false)}
              disabled={isBusy}
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  const checkboxId = `task-checkbox-${task.id}`;

  return (
    <li
      className={[
        "task-card",
        task.completed ? "task-card--completed" : "",
        isBusy ? "task-card--busy" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="task-card__main">
        <input
          id={checkboxId}
          type="checkbox"
          className="task-card__checkbox"
          checked={task.completed}
          disabled={isBusy}
          onChange={() => onToggle(task.id)}
        />
        <div className="task-card__text">
          <label className="task-card__title" htmlFor={checkboxId}>
            {task.title}
          </label>
          {task.notes && <p className="task-card__notes">{task.notes}</p>}
        </div>
      </div>

      <div className="task-card__actions">
        <button
          type="button"
          className="button button--icon"
          onClick={() => onMove(task.id, "up")}
          disabled={isBusy || !canMoveUp}
          aria-label={`Move "${task.title}" up`}
          title="Move up"
        >
          &uarr;
        </button>
        <button
          type="button"
          className="button button--icon"
          onClick={() => onMove(task.id, "down")}
          disabled={isBusy || !canMoveDown}
          aria-label={`Move "${task.title}" down`}
          title="Move down"
        >
          &darr;
        </button>
        <button
          type="button"
          className="button"
          onClick={startEditing}
          disabled={isBusy}
        >
          Edit
        </button>
        <button
          type="button"
          className="button button--danger"
          onClick={handleDelete}
          disabled={isBusy}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
