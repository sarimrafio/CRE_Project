# PowerShell script to launch both Frontend and Backend
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "  LAUNCHING BIOREACTOR DIGITAL TWIN (CSTR vs PFR FOR TEXTILE TREATMENT)" -ForegroundColor Cyan
Write-Host "=========================================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\backend'; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "Starting Vite React Frontend on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\frontend'; npm run dev -- --host 127.0.0.1 --port 3000"

Write-Host ""
Write-Host "Digital Twin services running!" -ForegroundColor White
Write-Host "Access Frontend at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Access Swagger API at: http://localhost:8000/docs" -ForegroundColor Cyan
