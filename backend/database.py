"""
database.py
===========
This is the ONLY file in the backend that talks to SQLite.

Why keep it in one file?
    If you ever wonder "how are tasks stored?", you only need to open this
    single file. Everything else in the backend just calls these functions.

What is SQLite?
    SQLite is a tiny database that lives inside ONE ordinary file
    (todos.db). There is no database server to install or start - Python
    already knows how to talk to SQLite through its built-in "sqlite3"
    module. That makes it perfect for a first full-stack project.
"""

from datetime import datetime, timezone
from pathlib import Path
import sqlite3

# The database file is created next to this file the first time the app runs.
# (Path(__file__).parent = the folder this file lives in.)
DB_PATH = Path(__file__).parent / "todos.db"


def get_connection() -> sqlite3.Connection:
    """Open a connection to the SQLite database file.

    row_factory = sqlite3.Row lets us read columns BY NAME
    (row["title"]) instead of by number (row[1]). Much easier to read.
    """
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    """Create the "tasks" table if it does not exist yet.

    This runs once, every time the API starts. Because of
    "IF NOT EXISTS" it does nothing after the first run, so your saved
    tasks are never deleted.

    Table columns explained:
        id         -> unique number for each task (filled in automatically)
        title      -> the task text, e.g. "Buy milk"          (required)
        notes      -> an optional longer description          (can be empty)
        completed  -> 1 = done, 0 = not done (SQLite has no true/false type)
        position   -> the order of the task in the list (0, 1, 2, ...)
        created_at -> when the task was created, stored as text (ISO format)
    """
    connection = get_connection()
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                title      TEXT    NOT NULL,
                notes      TEXT    NOT NULL DEFAULT '',
                completed  INTEGER NOT NULL DEFAULT 0,
                position   INTEGER NOT NULL,
                created_at TEXT    NOT NULL
            )
            """
        )
        connection.commit()
    finally:
        connection.close()


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def row_to_task(row: sqlite3.Row) -> dict:
    """Turn one database row into a normal Python dictionary.

    We do this so the API always sends the frontend plain JSON, e.g.
        {"id": 1, "title": "Buy milk", "completed": false, ...}
    Notice how 1/0 from the database becomes true/false for JavaScript.
    """
    return {
        "id": row["id"],
        "title": row["title"],
        "notes": row["notes"],
        "completed": bool(row["completed"]),
        "position": row["position"],
        "created_at": row["created_at"],
    }


def _renumber(connection: sqlite3.Connection, ordered_ids: list[int]) -> None:
    """Rewrite the position column so it matches the given order.

    Example: ordered_ids = [7, 3, 9]  ->  task 7 gets position 0,
    task 3 gets position 1, task 9 gets position 2.

    We call this after every change to the order (move or delete) so the
    positions are always tidy: 0, 1, 2, 3 ... with no gaps or duplicates.
    """
    for position, task_id in enumerate(ordered_ids):
        connection.execute(
            "UPDATE tasks SET position = ? WHERE id = ?",
            (position, task_id),
        )


def _ordered_ids(connection: sqlite3.Connection) -> list[int]:
    """Return every task id, already sorted the way the user sees them."""
    rows = connection.execute(
        "SELECT id FROM tasks ORDER BY position, id"
    ).fetchall()
    return [row["id"] for row in rows]


# ---------------------------------------------------------------------------
# Create / Read / Update / Delete  (the "CRUD" functions)
# ---------------------------------------------------------------------------

def list_tasks() -> list[dict]:
    """Return all tasks in the order the user arranged them."""
    connection = get_connection()
    try:
        rows = connection.execute(
            "SELECT * FROM tasks ORDER BY position, id"
        ).fetchall()
        return [row_to_task(row) for row in rows]
    finally:
        connection.close()


def get_task(task_id: int) -> dict | None:
    """Return ONE task by id, or None if it does not exist."""
    connection = get_connection()
    try:
        row = connection.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        return row_to_task(row) if row is not None else None
    finally:
        connection.close()


def create_task(title: str, notes: str) -> dict:
    """Add a new task at the bottom of the list and return it."""
    connection = get_connection()
    try:
        # The new task goes after the last one, so its position is
        # "highest position + 1". COALESCE turns an empty result (when the
        # table has no rows yet) into -1, so the first task gets position 0.
        next_position = connection.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM tasks"
        ).fetchone()[0]

        created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

        cursor = connection.execute(
            """
            INSERT INTO tasks (title, notes, completed, position, created_at)
            VALUES (?, ?, 0, ?, ?)
            """,
            (title, notes, next_position, created_at),
        )
        connection.commit()
        new_id = cursor.lastrowid
    finally:
        connection.close()

    # Read the row back from the database so the frontend receives exactly
    # what is stored (including the id and created_at we just generated).
    return get_task(new_id)


def update_task(
    task_id: int,
    title: str | None = None,
    notes: str | None = None,
    completed: bool | None = None,
) -> dict | None:
    """Change some or all fields of a task. Returns None if it is missing.

    Any argument left as None keeps its current value, so the frontend can
    send only the field it changed (a "partial update").
    """
    task = get_task(task_id)
    if task is None:
        return None

    new_title = task["title"] if title is None else title
    new_notes = task["notes"] if notes is None else notes
    new_completed = task["completed"] if completed is None else completed

    connection = get_connection()
    try:
        connection.execute(
            """
            UPDATE tasks
               SET title = ?, notes = ?, completed = ?
             WHERE id = ?
            """,
            (new_title, new_notes, 1 if new_completed else 0, task_id),
        )
        connection.commit()
    finally:
        connection.close()

    return get_task(task_id)


def toggle_task(task_id: int) -> dict | None:
    """Flip a task between completed and not completed."""
    task = get_task(task_id)
    if task is None:
        return None
    return update_task(task_id, completed=not task["completed"])


def delete_task(task_id: int) -> bool:
    """Delete a task. Returns True if something was deleted."""
    connection = get_connection()
    try:
        ids = _ordered_ids(connection)
        if task_id not in ids:
            return False

        connection.execute("DELETE FROM tasks WHERE id = ?", (task_id,))

        # Close the gap in the positions so the remaining tasks stay
        # numbered 0, 1, 2, 3 ... in the same visual order.
        _renumber(connection, [i for i in ids if i != task_id])
        connection.commit()
        return True
    finally:
        connection.close()


def move_task(task_id: int, direction: str) -> dict | None:
    """Move a task one step "up" or "down" in the list.

    How it works: we load the ids in display order, swap the task with its
    neighbour in that Python list, then save the new order back to SQLite.
    If the task is already at the top/bottom we change nothing and simply
    return the task unchanged.
    """
    connection = get_connection()
    try:
        ids = _ordered_ids(connection)
        if task_id not in ids:
            return None

        index = ids.index(task_id)
        neighbour_index = index - 1 if direction == "up" else index + 1

        if 0 <= neighbour_index < len(ids):
            ids[index], ids[neighbour_index] = ids[neighbour_index], ids[index]
            _renumber(connection, ids)
            connection.commit()
    finally:
        connection.close()

    return get_task(task_id)
