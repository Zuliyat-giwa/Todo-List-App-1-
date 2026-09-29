"""
main.py - the backend of the Todo app
=====================================
This file creates the FastAPI application and lists its "endpoints".

What is an endpoint?
    An endpoint is one web address that the frontend can call.
    For example GET /api/tasks returns the list of tasks. Each endpoint is
    just a normal Python function - FastAPI calls it for us when the right
    address is requested.

How to run it (from inside the backend folder):
    python -m uvicorn main:app --reload --port 8000

Then open:
    http://127.0.0.1:8000/docs      -> an interactive page listing every
                                       endpoint (free documentation!)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

import database
from models import MoveRequest, TaskCreate, TaskOut, TaskUpdate


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Code that runs once when the server starts, and once when it stops.

    We use it to create the SQLite file and the "tasks" table the first
    time the app runs, so you never have to set up the database by hand.
    """
    database.init_db()
    yield  # everything after "yield" would run on shutdown


app = FastAPI(
    title="Todo List API",
    description="A small API for a beginner-friendly Todo app with notes.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS = the browser rule that blocks a page on one port (5173) from
# calling a server on another port (8000). Normally the Vite proxy already
# avoids this problem, but allowing it here too means you can call the API
# from other tools or pages without confusion.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Friendly "hello" endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["info"])
def read_root():
    """Shown when you open http://127.0.0.1:8000 in your browser."""
    return {
        "message": "Todo List API is running.",
        "interactive_docs": "/docs",
        "all_tasks": "/api/tasks",
    }


@app.get("/api/health", tags=["info"])
def health_check():
    """A simple "is the server alive?" check used when troubleshooting."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Endpoints for tasks
#
# response_model=TaskOut tells FastAPI: "send back only the fields defined
# in TaskOut". It also powers the documentation at /docs.
# ---------------------------------------------------------------------------

@app.get("/api/tasks", response_model=list[TaskOut], tags=["tasks"])
def get_tasks():
    """Return every task, already sorted in the user's chosen order."""
    return database.list_tasks()


@app.post(
    "/api/tasks",
    response_model=TaskOut,
    status_code=status.HTTP_201_CREATED,
    tags=["tasks"],
)
def add_task(task: TaskCreate):
    """Create a task. The browser sends {"title": "...", "notes": "..."}."""
    return database.create_task(title=task.title, notes=task.notes)


@app.get("/api/tasks/{task_id}", response_model=TaskOut, tags=["tasks"])
def get_single_task(task_id: int):
    """Return one task by its id."""
    task = database.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} was not found.")
    return task


@app.put("/api/tasks/{task_id}", response_model=TaskOut, tags=["tasks"])
def edit_task(task_id: int, changes: TaskUpdate):
    """Edit a task's title, notes and/or completed flag.

    Only the fields you send are changed (partial update).
    """
    task = database.update_task(
        task_id,
        title=changes.title,
        notes=changes.notes,
        completed=changes.completed,
    )
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} was not found.")
    return task


@app.patch("/api/tasks/{task_id}/toggle", response_model=TaskOut, tags=["tasks"])
def toggle_task(task_id: int):
    """Mark a task as completed, or back to pending."""
    task = database.toggle_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} was not found.")
    return task


@app.delete("/api/tasks/{task_id}", tags=["tasks"])
def remove_task(task_id: int):
    """Delete a task for good."""
    deleted = database.delete_task(task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Task {task_id} was not found.")
    return {"deleted": task_id}


@app.post("/api/tasks/{task_id}/move", response_model=TaskOut, tags=["tasks"])
def move_task(task_id: int, request: MoveRequest):
    """Move a task one place up or down.

    The browser sends {"direction": "up"} or {"direction": "down"}.
    """
    task = database.move_task(task_id, request.direction)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} was not found.")
    return task
