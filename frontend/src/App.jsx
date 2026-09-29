/**
 * App.jsx - the "brain" of the frontend.
 *
 * Terms used in this file:
 *   - A COMPONENT is just a function that returns HTML-like code (JSX).
 *   - PROPS are the values you pass into a component, like settings.
 *   - STATE (useState) is data that belongs to the component. When state
 *     changes, React redraws that part of the page automatically.
 *   - useEffect runs code after the page is first drawn (perfect for
 *     loading data from the server).
 *
 * The pattern used everywhere below is:
 *   call the API  ->  reload the list from the server  ->  React redraws.
 * This keeps the backend as the single source of truth, which is the
 * easiest thing to reason about while you are learning.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "./api.js";
import FilterBar from "./components/FilterBar.jsx";
import TaskForm from "./components/TaskForm.jsx";
import TaskList from "./components/TaskList.jsx";
import TaskStats from "./components/TaskStats.jsx";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "pending" | "completed"

  /** Ask the backend for every task and store the answer in state. */
  const loadTasks = useCallback(async () => {
    try {
      setErrorMessage("");
      const data = await api.listTasks();
      setTasks(data);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Runs once when the page opens, and again any time loadTasks changes.
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /**
   * Runs one backend change and refreshes the list afterwards.
   * Returns true when everything worked, so forms know whether they may
   * clear themselves (we do not want to wipe your typing on an error).
   */
  const runAction = useCallback(
    async (action, taskId = null) => {
      setBusyTaskId(taskId);
      try {
        setErrorMessage("");
        await action();
        await loadTasks();
        return true;
      } catch (error) {
        setErrorMessage(error.message);
        return false;
      } finally {
        setBusyTaskId(null);
      }
    },
    [loadTasks]
  );

  // One small function per feature. Each simply calls the API through
  // runAction, which handles the busy state and error messages.
  const addTask = useCallback(
    (title, notes) => runAction(() => api.createTask(title, notes)),
    [runAction]
  );
  const editTask = useCallback(
    (taskId, changes) => runAction(() => api.updateTask(taskId, changes), taskId),
    [runAction]
  );
  const toggleTask = useCallback(
    (taskId) => runAction(() => api.toggleTask(taskId), taskId),
    [runAction]
  );
  const moveTask = useCallback(
    (taskId, direction) => runAction(() => api.moveTask(taskId, direction), taskId),
    [runAction]
  );
  const deleteTask = useCallback(
    (taskId) => runAction(() => api.deleteTask(taskId), taskId),
    [runAction]
  );

  // The counter in the header. useMemo means "only recalculate when
  // 'tasks' changes", so we do not repeat the work on every redraw.
  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    return {
      total: tasks.length,
      completed,
      pending: tasks.length - completed,
    };
  }, [tasks]);

  // Which tasks the user asked to see.
  const visibleTasks = useMemo(() => {
    if (filter === "pending") return tasks.filter((task) => !task.completed);
    if (filter === "completed") return tasks.filter((task) => task.completed);
    return tasks;
  }, [tasks, filter]);

  // The real position of each task in the FULL list. The move buttons use
  // this, so they stay correct even while a filter is active.
  const orderIndex = useMemo(() => {
    const map = new Map();
    tasks.forEach((task, index) => map.set(task.id, index));
    return map;
  }, [tasks]);

  return (
    <div className="page">
      <header className="app-header">
        <h1 className="app-header__title">My Todo List</h1>
        <p className="app-header__subtitle">
          Add tasks, write notes, tick things off and put them in the order you
          want.
        </p>
        <TaskStats
          total={stats.total}
          completed={stats.completed}
          pending={stats.pending}
        />
      </header>

      {errorMessage && (
        <div className="alert" role="alert">
          <span className="alert__text">{errorMessage}</span>
          <button
            type="button"
            className="alert__close"
            onClick={() => setErrorMessage("")}
            aria-label="Dismiss error message"
          >
            &times;
          </button>
        </div>
      )}

      <main className="app-main">
        <section className="panel">
          <h2 className="panel__title">Add a new task</h2>
          <TaskForm onAdd={addTask} />
        </section>

        <section className="panel">
          <div className="panel__header">
            <h2 className="panel__title">Your tasks</h2>
            <FilterBar filter={filter} onChange={setFilter} stats={stats} />
          </div>

          {isLoading ? (
            <p className="empty-state">Loading your tasks...</p>
          ) : (
            <TaskList
              tasks={visibleTasks}
              orderIndex={orderIndex}
              taskCount={tasks.length}
              busyTaskId={busyTaskId}
              filter={filter}
              onToggle={toggleTask}
              onEdit={editTask}
              onDelete={deleteTask}
              onMove={moveTask}
            />
          )}
        </section>
      </main>

      <footer className="app-footer">
        <p>
          React frontend on port 5173 &middot; FastAPI backend on port 8000
          &middot; data stored in <code>backend/todos.db</code>
        </p>
      </footer>
    </div>
  );
}
