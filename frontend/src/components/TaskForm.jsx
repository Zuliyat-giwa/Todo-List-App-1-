/**
 * TaskForm.jsx - the "add a new task" box.
 *
 * It keeps two pieces of state: the title and the notes you are typing.
 * Because they are controlled inputs, React always knows what is inside
 * them, which makes validation and clearing easy.
 */
import { useState } from "react";

const MAX_TITLE_LENGTH = 200;
const MAX_NOTES_LENGTH = 2000;

export default function TaskForm({ onAdd }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page

    const cleanTitle = title.trim();
    const cleanNotes = notes.trim();

    // Basic validation so an empty task never reaches the backend.
    if (!cleanTitle) {
      setValidationError("Please type a task title before adding it.");
      return;
    }

    setValidationError("");
    setIsSaving(true);

    // onAdd returns true when the backend saved the task successfully.
    const saved = await onAdd(cleanTitle, cleanNotes);

    // Only clear the boxes if it really worked - otherwise you would lose
    // what you typed when the server is down.
    if (saved) {
      setTitle("");
      setNotes("");
    }
    setIsSaving(false);
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span className="field__label">Task</span>
        <input
          type="text"
          className="field__input"
          placeholder="e.g. Buy milk"
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="field">
        <span className="field__label">
          Notes <span className="field__hint">(optional)</span>
        </span>
        <textarea
          className="field__input field__input--textarea"
          placeholder="Any extra detail, e.g. 2 litres of semi-skimmed"
          rows={2}
          value={notes}
          maxLength={MAX_NOTES_LENGTH}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {validationError && <p className="form-error">{validationError}</p>}

      <button type="submit" className="button button--primary" disabled={isSaving}>
        {isSaving ? "Adding..." : "Add task"}
      </button>
    </form>
  );
}
