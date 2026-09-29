"""
models.py
=========
This file describes the SHAPE of the JSON data that travels between the
browser and the backend.

What is "Pydantic"?
    Pydantic is the small library FastAPI uses to check incoming data
    automatically. When the browser sends JSON, FastAPI compares it with
    the class below. If something is wrong (for example the title is
    empty, or "completed" is the text "yes" instead of true/false),
    FastAPI replies with a clear 422 error BEFORE our code runs. That is
    one less thing for us to worry about.

Naming tip:
    - TaskCreate = "what we accept when creating a task"
    - TaskUpdate = "what we accept when editing a task" (all fields optional)
    - TaskOut    = "what we send back to the frontend"
"""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

# The longest values we allow. They keep the database tidy and stop huge
# accidental pastes from filling the screen.
MAX_TITLE_LENGTH = 200
MAX_NOTES_LENGTH = 2000


class TaskCreate(BaseModel):
    """Body of POST /api/tasks"""

    title: str = Field(..., min_length=1, max_length=MAX_TITLE_LENGTH)
    notes: str = Field(default="", max_length=MAX_NOTES_LENGTH)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        """Reject titles that are only spaces, and trim extra spaces.

        "  Buy milk  " becomes "Buy milk".
        """
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Task title cannot be empty.")
        return cleaned

    @field_validator("notes")
    @classmethod
    def clean_notes(cls, value: str) -> str:
        return value.strip()


class TaskUpdate(BaseModel):
    """Body of PUT /api/tasks/{task_id}

    Every field is optional, so the frontend can send only what changed,
    for example just {"completed": true}.
    """

    title: str | None = Field(default=None, max_length=MAX_TITLE_LENGTH)
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)
    completed: bool | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Task title cannot be empty.")
        return cleaned

    @field_validator("notes")
    @classmethod
    def clean_notes(cls, value: str | None) -> str | None:
        return None if value is None else value.strip()


class MoveRequest(BaseModel):
    """Body of POST /api/tasks/{task_id}/move  ->  {"direction": "up"}"""

    # Literal means: the only allowed values are the text "up" or "down".
    # Anything else is rejected automatically with a 422 error.
    direction: Literal["up", "down"]


class TaskOut(BaseModel):
    """A single task, exactly as the frontend receives it."""

    id: int
    title: str
    notes: str
    completed: bool
    position: int
    created_at: str
