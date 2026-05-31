param(
  [switch]$CleanPorts
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

function Stop-PortProcess {
  param([int]$Port)
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    try {
      Stop-Process -Id $connection.OwningProcess -Force -ErrorAction Stop
    } catch {
    }
  }
}

if ($CleanPorts) {
  Stop-PortProcess -Port 8000
  Stop-PortProcess -Port 5173
}

$backendCommand = "Set-Location '$backendDir'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
$frontendCommand = "Set-Location '$frontendDir'; npx vite --host 127.0.0.1 --port 5173"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand

Write-Host "Backend:  http://127.0.0.1:8000"
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "Use .\start-dev.ps1 -CleanPorts if the ports are already occupied."
