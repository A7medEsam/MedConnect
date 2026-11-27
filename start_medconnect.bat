@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "BACKEND_PYTHON=%BACKEND_DIR%\venv\Scripts\python.exe"

echo ==================================================
echo   MedConnect Local Demo Startup
echo ==================================================

REM 1. Verify backend virtual environment exists
if not exist "%BACKEND_PYTHON%" (
    echo [ERROR] Backend virtual environment not found at:
    echo         "%BACKEND_PYTHON%"
    echo.
    echo Please create it first:
    echo   cd backend
    echo   py -3.13 -m venv venv
    echo   .\venv\Scripts\python.exe -m pip install -r requirements.txt
    pause
    exit /b 1
)

REM 2. Verify frontend dependencies exist
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [ERROR] Frontend dependencies not found at:
    echo         "%FRONTEND_DIR%\node_modules"
    echo.
    echo Please run:
    echo   cd frontend
    echo   npm install
    pause
    exit /b 1
)

if not exist "%BACKEND_DIR%\.env" (
    echo [WARN] backend\.env was not found. AI features require GEMINI_API_KEY in backend\.env.
)

REM 3. Start FastAPI backend on port 8000 (without exposing or modifying secrets)
echo [1/4] Starting FastAPI backend on http://127.0.0.1:8000 ...
start "MedConnect Backend (Port 8000)" /D "%BACKEND_DIR%" "%BACKEND_PYTHON%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
if errorlevel 1 (
    echo [ERROR] Failed to launch backend process.
    pause
    exit /b 1
)

REM 4. Wait for backend /api/health to become ready (max 25s)
echo [2/4] Waiting for backend /api/health ...
powershell -NoProfile -Command ^
  "$ok = $false; for ($i = 0; $i -lt 25; $i++) { try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 2; if ($r.status -eq 'ok') { $ok = $true; break } } catch {}; Start-Sleep -Seconds 1 }; if (-not $ok) { exit 1 }"
if errorlevel 1 (
    echo [ERROR] Backend failed to respond on http://127.0.0.1:8000/api/health within 25 seconds.
    echo         Check the "MedConnect Backend (Port 8000)" window for errors.
    pause
    exit /b 1
)
echo [OK] Backend /api/health is ready.

REM 5. Start Vite frontend on port 5173
echo [3/4] Starting Vite frontend on http://localhost:5173 ...
start "MedConnect Frontend (Port 5173)" /D "%FRONTEND_DIR%" cmd /c "npm run dev -- --port 5173"
if errorlevel 1 (
    echo [ERROR] Failed to launch frontend process.
    pause
    exit /b 1
)

REM 6. Wait for frontend port 5173 to listen (max 25s)
echo [4/4] Waiting for frontend http://localhost:5173 ...
powershell -NoProfile -Command ^
  "$ok = $false; for ($i = 0; $i -lt 25; $i++) { try { $resp = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2; if ($resp.StatusCode -eq 200) { $ok = $true; break } } catch {}; Start-Sleep -Seconds 1 }; if (-not $ok) { exit 1 }"
if errorlevel 1 (
    echo [ERROR] Frontend failed to respond on http://localhost:5173 within 25 seconds.
    echo         Check the "MedConnect Frontend (Port 5173)" window for errors.
    pause
    exit /b 1
)

echo [OK] Both MedConnect services are ready!
echo      Frontend: http://localhost:5173
echo      Backend:  http://127.0.0.1:8000/docs
start "" "http://localhost:5173"

endlocal
exit /b 0
