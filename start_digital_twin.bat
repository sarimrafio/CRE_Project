@echo off
echo =========================================================================
echo   LAUNCHING BIOREACTOR DIGITAL TWIN (CSTR vs PFR FOR TEXTILE TREATMENT)
echo =========================================================================
echo.
echo Starting FastAPI Python Backend (Render runtime replica)...
start "Digital Twin Backend (FastAPI)" cmd /k "cd /d %~dp0backend && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Vite React Three.js Frontend (Vercel runtime replica)...
start "Digital Twin Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 127.0.0.1 --port 3000"

echo.
echo Digital Twin launched!
echo - Frontend: http://localhost:3000
echo - Backend API & Swagger: http://localhost:8000/docs
echo.
pause
