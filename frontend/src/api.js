/**
 * api.js - every conversation with the backend lives in this file.
 *
 * Why put it in one file?
 *   Your components then only contain interface code, and if an address
 *   changes you only have to fix it in one place.
 *
 * The important idea: the browser's built-in fetch() sends an HTTP request
 * and gives back a "Response" object. We convert it to JSON (a normal
 * JavaScript object) and hand it to the components.
 */

// We use an empty string, which means "the same address the page came from".
// In development that is localhost:5173, and vite.config.js forwards every
// /api request to the FastAPI server on port 8000.
const BASE_URL = "";

/**
 * Turn an error response into a readable sentence.
 *
 * FastAPI sends errors as JSON like {"detail": "Task 5 was not found."}
 * and validation errors as {"detail": [{msg: "...", loc: [...]}]}.
 */
async function readErrorMessage(response) {
  try {
    const body = await response.json();
    const detail = body?.detail;

    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((item) => item.msg).join(" ");
    }
  } catch {
    // The response was not JSON (for example the server is down).
  }
  return `The server replied with status ${response.status}.`;
}

/**
 * The one function that performs every request.
 * - adds the JSON header the backend expects
 * - turns network errors into friendly messages
 * - turns error status codes into thrown Errors the UI can show
 */
async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    // fetch() only fails like this when the request never reached a server.
    throw new Error(
      "Could not reach the server. Is the backend running on port 8000?"
    );
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) {
    return null; // "No Content" - there is no JSON to read
  }
  return response.json();
}

/** Small set of named functions so the components read like English. */
export const api = {
  /** GET /api/tasks -> [{...}, {...}] */
  listTasks: () => request("/api/tasks"),

  /** POST /api/tasks -> the new task */
  createTask: (title, notes) =>
    request("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title, notes }),
    }),

  /** PUT /api/tasks/5 -> the updated task (only send what changed) */
  updateTask: (taskId, changes) =>
    request(`/api/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(changes),
    }),

  /** PATCH /api/tasks/5/toggle -> switches completed on/off */
  toggleTask: (taskId) =>
    request(`/api/tasks/${taskId}/toggle`, { method: "PATCH" }),

  /** POST /api/tasks/5/move -> direction is "up" or "down" */
  moveTask: (taskId, direction) =>
    request(`/api/tasks/${taskId}/move`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    }),

  /** DELETE /api/tasks/5 */
  deleteTask: (taskId) =>
    request(`/api/tasks/${taskId}`, { method: "DELETE" }),
};
