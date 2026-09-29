@echo off
REM ===================================================================
REM  start-backend.bat - starts the FastAPI backend on port 8000
REM  Just double-click this file, or run it from a terminal.
REM ===================================================================

cd /d "%~dp0backend"

REM Create the Python "virtual environment" (a private folder of packages)
REM and install the requirements the first time you run this.
if not exist ".venv\Scripts\python.exe" (
    echo [1/2] Creating the Python environment ^(only needed once^)...
    python -m venv .venv
    echo [2/2] Installing backend packages...
    ".venv\Scripts\python.exe" -m pip install --upgrade pip
    ".venv\Scripts\python.exe" -m pip install -r requirements.txt
)

echo.
echo Starting the API at http://127.0.0.1:8000  (docs at /docs)
echo Press Ctrl+C to stop the server.
echo.

REM --reload restarts the server automatically whenever you save a .py file.
".venv\Scripts\python.exe" -m uvicorn main:app --reload --port 8000
