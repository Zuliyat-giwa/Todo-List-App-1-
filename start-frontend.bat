@echo off
REM ===================================================================
REM  start-frontend.bat - starts the React (Vite) dev server on port 5173
REM  Just double-click this file, or run it from a terminal.
REM  Keep this window open while you use the app.
REM ===================================================================

cd /d "%~dp0frontend"

REM Install the JavaScript packages the first time you run this.
if not exist "node_modules" (
    echo [1/2] Installing frontend packages ^(only needed once^)...
    call npm install
)

echo.
echo Starting the React app at http://localhost:5173
echo Press Ctrl+C to stop the server.
echo.

call npm run dev
