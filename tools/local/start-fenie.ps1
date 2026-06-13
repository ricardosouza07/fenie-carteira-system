param(
  [switch]$NoTail,
  [switch]$NoBrowser,
  [switch]$ServerMode
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$RuntimeDir = Join-Path $ProjectRoot ".local-runtime"
$FrontendLog = Join-Path $RuntimeDir "frontend.log"
$FrontendPid = Join-Path $RuntimeDir "frontend.pid"
$FrontendStarter = Join-Path $RuntimeDir "start-frontend.cmd"
$EnvFile = Join-Path $ProjectRoot "frontend\.env.local"
$BrandName = "Central de Carteira Feni$([char]0x00E9)"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host $Message
}

function Resolve-Npm {
  $command = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $nodeNpm = "C:\Program Files\nodejs\npm.cmd"
  if (Test-Path -LiteralPath $nodeNpm) {
    return $nodeNpm
  }

  throw "npm.cmd nao foi encontrado. Instale o Node.js LTS e marque a opcao de adicionar ao PATH."
}

function Resolve-DockerCli {
  $command = Get-Command "docker" -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe",
    "$env:ProgramFiles\Docker\Docker\resources\com.docker.cli.exe"
  )

  return $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

function Test-SupabaseApi {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:54321/rest/v1/" -TimeoutSec 2
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Get-LanIPv4 {
  $routes = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
    Where-Object { $_.NextHop -ne "0.0.0.0" } |
    Sort-Object RouteMetric, InterfaceMetric

  foreach ($route in $routes) {
    $address = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue |
      Where-Object {
        $_.AddressState -eq "Preferred" -and
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*"
      } |
      Select-Object -First 1

    if ($address) {
      return $address.IPAddress
    }
  }

  return $null
}

function Test-DockerProcess {
  return [bool](Get-Process -Name "Docker Desktop", "com.docker.backend", "docker-agent" -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Test-DockerReady {
  $docker = Resolve-DockerCli

  if ($docker) {
    & $docker info *> $null
    if ($LASTEXITCODE -eq 0) {
      return $true
    }
  }

  if (Test-SupabaseApi) {
    return $true
  }

  return (Test-DockerProcess)
}

function Start-DockerDesktop {
  $candidates = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "$env:LocalAppData\Docker\Docker Desktop.exe"
  )

  $desktop = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if (-not $desktop) {
    throw "Docker Desktop nao foi encontrado. Abra o Docker manualmente ou reinstale o Docker Desktop."
  }

  Start-Process -FilePath $desktop | Out-Null
}

function Wait-Docker {
  Write-Step "Verificando Docker..."

  if (Test-DockerReady) {
    Write-Host "Docker ja esta pronto."
    return
  }

  Write-Host "Docker nao esta pronto. Tentando abrir Docker Desktop..."
  Start-DockerDesktop

  for ($attempt = 1; $attempt -le 90; $attempt++) {
    Start-Sleep -Seconds 2
    if (Test-DockerReady) {
      Write-Host "Docker pronto."
      return
    }
    Write-Host -NoNewline "."
  }

  throw "Docker nao ficou pronto dentro do tempo esperado. Abra o Docker Desktop e tente novamente."
}

function Invoke-LocalSupabase {
  param([ValidateSet("start", "stop", "reset", "status")][string]$Command)

  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "tools\local\supabase.ps1") $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao executar Supabase local: $Command."
  }
}

function Test-FrontendUrl {
  param([int]$Port)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/login" -TimeoutSec 2
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500 -and $response.Content -match "Central de Carteira|__next") {
      return "http://localhost:$Port/login"
    }
  } catch {
    return $null
  }

  return $null
}

function Find-FrontendUrl {
  param([int[]]$Ports = (3000..3020))

  if (Test-Path -LiteralPath $FrontendLog) {
    $log = Get-Content -LiteralPath $FrontendLog -Raw -ErrorAction SilentlyContinue
    if ($log -match "http://localhost:(\d+)") {
      $logPort = [int]$Matches[1]
      if ($Ports -contains $logPort) {
        $url = Test-FrontendUrl -Port $logPort
        if ($url) {
          return $url
        }
      }
    }
    if ($log -match "http://127\.0\.0\.1:(\d+)") {
      $logPort = [int]$Matches[1]
      if ($Ports -contains $logPort) {
        $url = Test-FrontendUrl -Port $logPort
        if ($url) {
          return $url
        }
      }
    }
  }

  foreach ($port in $Ports) {
    $url = Test-FrontendUrl -Port $port
    if ($url) {
      return $url
    }
  }

  return $null
}

function Start-Frontend {
  Write-Step "Iniciando sistema..."

  New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null

  $ports = if ($ServerMode) { @(3000) } else { @(3000..3020) }
  $existingUrl = Find-FrontendUrl -Ports $ports
  if ($existingUrl) {
    Write-Host "Frontend ja esta rodando em $existingUrl"
    return $existingUrl
  }

  if ($ServerMode) {
    $portOwner = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($portOwner) {
      throw "A porta 3000 esta ocupada por outro processo. Libere a porta antes de iniciar o servidor Fenie."
    }
  }

  if (Test-Path -LiteralPath $FrontendLog) {
    Remove-Item -LiteralPath $FrontendLog -Force
  }

  $npm = Resolve-Npm
  $startCommand = if ($ServerMode) {
    $buildId = Join-Path $ProjectRoot "frontend\.next\BUILD_ID"
    if (-not (Test-Path -LiteralPath $buildId)) {
      throw "Build de producao nao encontrado. Execute INSTALAR_SERVIDOR_LOCAL.bat ou npm run build."
    }
    "`"$npm`" run server:frontend"
  } else {
    "`"$npm`" run dev:local"
  }
  $starter = @"
@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "$ProjectRoot"
$startCommand >> "$FrontendLog" 2>&1
"@
  Set-Content -LiteralPath $FrontendStarter -Value $starter -Encoding ASCII

  $process = Start-Process -FilePath "cmd.exe" -ArgumentList @("/d", "/s", "/c", "`"$FrontendStarter`"") -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath $FrontendPid -Value $process.Id -Encoding ASCII

  for ($attempt = 1; $attempt -le 90; $attempt++) {
    Start-Sleep -Seconds 2
    $url = Find-FrontendUrl -Ports $ports
    if ($url) {
      return $url
    }

    if ($process.HasExited) {
      break
    }

    Write-Host -NoNewline "."
  }

  Write-Host ""
  if (Test-Path -LiteralPath $FrontendLog) {
    Write-Host "Ultimas linhas do log do frontend:"
    Get-Content -LiteralPath $FrontendLog -Tail 80
  }
  throw "Nao foi possivel detectar a porta do Next.js."
}

if (-not (Test-Path -LiteralPath $ProjectRoot)) {
  throw "Projeto nao encontrado em $ProjectRoot."
}

Set-Location $ProjectRoot

Write-Host "Iniciando $BrandName..."

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Arquivo frontend\.env.local nao encontrado. Rode CHECK_FENIE.bat e siga docs\LOCAL_INSTALL.md."
}

Wait-Docker

Write-Step "Iniciando banco local..."
Invoke-LocalSupabase start

$url = Start-Frontend
$uri = [uri]$url
$localUrl = "http://localhost:$($uri.Port)/login"
$lanIp = Get-LanIPv4
$networkUrl = if ($lanIp) { "http://${lanIp}:$($uri.Port)/login" } else { $null }

Write-Step "Abrindo navegador..."
if (-not $NoBrowser) {
  Start-Process $localUrl | Out-Null
}

Write-Step "Sistema pronto."
Write-Host "Neste computador: $localUrl"
if ($networkUrl) {
  Write-Host "Na rede local:    $networkUrl"

  if ($ServerMode) {
    $envContent = Get-Content -LiteralPath $EnvFile -Raw
    if ($envContent -notmatch [regex]::Escape("http://${lanIp}:54321")) {
      Write-Host ""
      Write-Host "AVISO: frontend\.env.local nao aponta para o IP atual $lanIp."
      Write-Host "Execute INSTALAR_SERVIDOR_LOCAL.bat e escolha preservar o banco existente."
    }
  }
} else {
  Write-Host "Nao foi possivel identificar o IP da rede local."
}
Write-Host ""

if ($NoTail) {
  exit 0
}

Write-Host "Logs do frontend abaixo. Para encerrar o ambiente, use STOP_FENIE.bat."
Write-Host "Se fechar esta janela, o sistema pode continuar rodando em segundo plano."
Write-Host ""

if (Test-Path -LiteralPath $FrontendLog) {
  Get-Content -LiteralPath $FrontendLog -Tail 80 -Wait
} else {
  Write-Host "Log ainda nao foi criado. O sistema ja esta acessivel em $url."
  while ($true) {
    Start-Sleep -Seconds 30
  }
}
