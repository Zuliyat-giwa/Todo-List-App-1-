# My Todo List — a beginner full-stack project

A small Todo list application where every task can also have **notes**.
Tasks can be added, edited, completed, re-ordered and deleted, and everything
is saved in a SQLite database file so it is still there when you come back.

```
React (browser)  --HTTP/JSON-->  FastAPI (Python)  --SQL-->  SQLite file
   port 5173                        port 8000                backend/todos.db
```

---

## 1. What each technology does (in one line each)

| Technology | What it is | Its job in this project |
|---|---|---|
| **React** | A JavaScript library for building user interfaces | Draws the page and updates it without a full reload |
| **Vite** | A development server + build tool for React | Runs the React app on port 5173 and forwards `/api` calls to the backend |
| **JavaScript** | The language of the browser | Adds the behaviour (clicking, typing, calling the API) |
| **CSS** | Styling language | Makes the app look clean and work on phones |
| **Python** | The backend language | Runs the logic and the database queries |
| **FastAPI** | A Python web framework | Turns Python functions into API endpoints the browser can call |
| **Uvicorn** | A Python web server | Actually runs the FastAPI application on port 8000 |
| **SQLite** | A database inside a single file | Stores the tasks (`backend/todos.db`) |

---

## 2. Project folder structure

```
HNG i15 Project/
├── backend/                  <- the Python API
│   ├── main.py               <- the endpoints (the "menu" the frontend can order from)
│   ├── database.py           <- all SQLite code lives here (create, read, update, delete)
│   ├── models.py             <- describes the shape of the JSON data + validation
│   ├── requirements.txt      <- the Python packages to install
│   ├── todos.db              <- YOUR DATA (created automatically on first run)
│   └── .venv/                <- private Python environment (created on first run)
│
├── frontend/                 <- the React app
│   ├── index.html            <- the single HTML page the browser loads
│   ├── package.json          <- the JavaScript packages + the "npm run dev" script
│   ├── vite.config.js        <- dev-server settings, including the /api proxy
│   └── src/
│       ├── main.jsx          <- starting point: puts <App /> on the page
│       ├── App.jsx           <- the "brain": state, API calls, layout
│       ├── api.js            <- every fetch() call to the backend
│       ├── styles.css        <- all the styling
│       └── components/
│           ├── TaskForm.jsx  <- the "add a new task" box
│           ├── TaskList.jsx  <- the list (or the friendly "nothing here" message)
│           ├── TaskItem.jsx  <- ONE task row, including its edit form
│           ├── TaskStats.jsx <- total / completed / pending counters
│           └── FilterBar.jsx <- All / Pending / Completed buttons
│
├── start-backend.bat         <- double-click to start the API
├── start-frontend.bat        <- double-click to start the React app
├── .gitignore
└── README.md
```

---

## 3. How to start the app

You need **two windows open at the same time**: one for the backend and one
for the frontend. This is completely normal — the frontend is a website, the
backend is a separate service providing the data.

### Window 1 — the backend (do this first)

Double-click **`start-backend.bat`**, or open a terminal and run:

```bat
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Leave it running. You should see `Uvicorn running on http://127.0.0.1:8000`.

### Window 2 — the frontend

Double-click **`start-frontend.bat`**, or:

```bat
cd frontend
npm install
npm run dev
```

### Then open your browser

**http://localhost:5173**  <- this is the application.

Useful extra URLs:

* `http://127.0.0.1:8000/docs` — interactive documentation of the API. You can
  click any endpoint and try it right there.
* `http://127.0.0.1:8000/api/tasks` — the raw JSON list of tasks.

To stop everything, press `Ctrl+C` in each window (or just close them).

---

## 4. The API endpoints

| Method | Address | What it does | Body you send |
|---|---|---|---|
| GET | `/api/tasks` | List every task | – |
| POST | `/api/tasks` | Add a task | `{"title": "Buy milk", "notes": "2 litres"}` |
| PUT | `/api/tasks/{id}` | Edit a task (only send what changed) | `{"title": "Buy oat milk", "notes": "1 litre"}` |
| PATCH | `/api/tasks/{id}/toggle` | Completed ⇄ pending | – |
| POST | `/api/tasks/{id}/move` | Move one place | `{"direction": "up"}` or `{"direction": "down"}` |
| DELETE | `/api/tasks/{id}` | Delete a task | – |
| GET | `/api/health` | "Is the server alive?" | – |

Quick test from a terminal (optional):

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/tasks
```

---

## 5. How the pieces work together

1. You type a task and press **Add task** in `TaskForm.jsx`.
2. `App.jsx` calls `api.createTask(...)`, which runs
   `fetch("/api/tasks", { method: "POST", body: ... })`.
3. Vite sees the `/api` prefix and forwards the request to
   `http://127.0.0.1:8000/api/tasks` (see `frontend/vite.config.js`).
4. FastAPI checks the JSON against `TaskCreate` in `backend/models.py`.
   If the title is empty it replies `422` with a readable message and nothing
   is saved.
5. `backend/database.py` runs an `INSERT` statement. SQLite writes the row —
   including a `position` value that decides the order — into `todos.db`.
6. FastAPI replies with the saved task as JSON.
7. `App.jsx` asks for the full list again (`loadTasks`) and React redraws the
   page. That is why the new task appears instantly.

Ordering works with a `position` column: `0` is the top of the list. Moving a
task swaps its position with its neighbour, and deleting a task renumbers the
rest so the numbers stay tidy (`0, 1, 2, ...`).

---

## 6. Common problems

| Symptom | Cause and fix |
|---|---|
| Red banner: "Could not reach the server." | The backend is not running. Start `start-backend.bat` first. |
| Page will not load at all | The frontend is not running. Start `start-frontend.bat`. |
| "Port already in use" (8000 or 5173) | An old window is still running. Close it, or start the backend with `--port 8001` (then update the `target` in `frontend/vite.config.js`). |
| `python` is not recognised | Reinstall Python from python.org and tick **"Add Python to PATH"**. |
| `npm` is not recognised | Install Node.js from nodejs.org, then open a NEW terminal. |
| I want a fresh, empty list | Stop the backend, delete `backend/todos.db`, start the backend again. |

---

## 7. Ideas for your next steps (easy -> harder)

1. **Search box** — filter the list as you type (frontend only, using `.filter()`).
2. **Due dates** — add a `due_date` column, a date input, and show overdue tasks in red.
3. **Undo delete** — keep the deleted task in React state for a few seconds and offer an "Undo" button.
4. **Drag and drop** — replace the up/down buttons with HTML5 drag events.
5. **Priorities** — a "high / normal" flag with sorting.
6. **Multiple lists** — a second table `lists` plus a foreign key on tasks (this is where you would learn about database relationships).
7. **Replace the raw SQL with an ORM** (SQLAlchemy) once the SQL feels boring — not before.
8. **Serve the built frontend from FastAPI** — run `npm run build` and let FastAPI hand out the `dist` folder, so there is only one server to run.
9. **Automated tests** — `pytest` with FastAPI's `TestClient` for the API.


