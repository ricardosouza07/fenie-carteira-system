$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$RuntimeDir = Join-Path $ProjectRoot ".local-runtime"
$FrontendPid = Join-Path $RuntimeDir "frontend.pid"
$BrandName = "Central de Carteira Feni$([char]0x00E9)"

function Stop-ProcessTree {
  param([int]$ProcessId)
  & taskkill.exe /PID $ProcessId /T /F *> $null
}

Set-Location $ProjectRoot

Write-Host "Parando $BrandName..."
Write-Host ""
Write-Host "Parando frontend local..."

$stoppedFrontend = $false

if (Test-Path -LiteralPath $FrontendPid) {
  $pidText = Get-Content -LiteralPath $FrontendPid -Raw
  $pidValue = 0
  if ([int]::TryParse($pidText.Trim(), [ref]$pidValue)) {
    if (Get-Process -Id $pidValue -ErrorAction SilentlyContinue) {
      Stop-ProcessTree -ProcessId $pidValue
      $stoppedFrontend = $true
    }
  }
  Remove-Item -LiteralPath $FrontendPid -Force -ErrorAction SilentlyContinue
}

$nextProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine -like "*fenie-carteira-system*" -and
    ($_.CommandLine -like "*next*" -or $_.CommandLine -like "*dev:local*")
  }

foreach ($process in $nextProcesses) {
  Stop-ProcessTree -ProcessId $process.ProcessId
  $stoppedFrontend = $true
}

$frontendPorts = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -ge 3000 -and $_.LocalPort -le 3020 } |
  Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $frontendPorts) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
  if ($process.CommandLine -and $process.CommandLine -like "*next*") {
    Stop-ProcessTree -ProcessId $processId
    $stoppedFrontend = $true
  }
}

if ($stoppedFrontend) {
  Write-Host "Frontend parado."
} else {
  Write-Host "Nenhum frontend local encontrado."
}

Write-Host ""
Write-Host "Parando Supabase local..."
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "tools\local\supabase.ps1") stop

Write-Host ""
Write-Host "Ambiente local encerrado."
exit 0
