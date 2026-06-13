param(
  [switch]$Confirmed,
  [switch]$PreserveData,
  [switch]$ResetData
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$FrontendDir = Join-Path $ProjectRoot "frontend"
$EnvExample = Join-Path $FrontendDir ".env.example"
$EnvFile = Join-Path $FrontendDir ".env.local"
$SupabaseDir = Join-Path $ProjectRoot "backend\supabase"
$SupabaseConfig = Join-Path $SupabaseDir "config.toml"
$ExistingInstallation = Test-Path -LiteralPath $EnvFile

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "== $Message =="
}

function Write-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Resolve-Executable {
  param(
    [string]$Name,
    [string[]]$Candidates
  )

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  return $Candidates |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1
}

function Resolve-Npm {
  $npm = Resolve-Executable "npm.cmd" @("C:\Program Files\nodejs\npm.cmd")
  if (-not $npm) {
    throw "npm.cmd nao foi encontrado. Instale o Node.js LTS antes de continuar."
  }
  return $npm
}

function Resolve-DockerCli {
  return Resolve-Executable "docker" @(
    "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe",
    "$env:ProgramFiles\Docker\Docker\resources\com.docker.cli.exe"
  )
}

function Test-DockerReady {
  $docker = Resolve-DockerCli
  if (-not $docker) {
    return $false
  }

  & $docker info *> $null
  return ($LASTEXITCODE -eq 0)
}

function Start-DockerDesktop {
  $desktop = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "$env:LocalAppData\Docker\Docker Desktop.exe"
  ) |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1

  if (-not $desktop) {
    throw "Docker Desktop nao foi encontrado. Instale o Docker Desktop antes de continuar."
  }

  Start-Process -FilePath $desktop | Out-Null
}

function Wait-Docker {
  Write-Step "Validando Docker"

  if (Test-DockerReady) {
    Write-Host "Docker pronto."
    return
  }

  Write-Host "Abrindo Docker Desktop..."
  Start-DockerDesktop

  for ($attempt = 1; $attempt -le 120; $attempt++) {
    Start-Sleep -Seconds 2
    if (Test-DockerReady) {
      Write-Host "Docker pronto."
      return
    }
    Write-Host -NoNewline "."
  }

  throw "Docker nao ficou pronto dentro do tempo esperado."
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

  $fallback = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.AddressState -eq "Preferred" -and
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.InterfaceAlias -notmatch "WSL|Hyper-V|Loopback|Docker"
    } |
    Select-Object -First 1

  if ($fallback) {
    return $fallback.IPAddress
  }

  throw "Nao foi possivel identificar o IPv4 da rede local."
}

function Update-SupabaseNetworkConfig {
  param([string]$LanIp)

  if (-not (Test-Path -LiteralPath $SupabaseConfig)) {
    throw "Configuracao Supabase nao encontrada em $SupabaseConfig."
  }

  $content = Get-Content -LiteralPath $SupabaseConfig -Raw
  $siteUrl = "site_url = `"http://${LanIp}:3000`""
  $redirects = "additional_redirect_urls = [`"http://127.0.0.1:3000`", `"http://localhost:3000`", `"http://${LanIp}:3000`"]"

  if ($content -match "(?m)^site_url\s*=") {
    $content = $content -replace "(?m)^site_url\s*=.*$", $siteUrl
  } else {
    $content = $content -replace "(?m)^\[auth\]\s*$", "[auth]`r`n$siteUrl"
  }

  if ($content -match "(?m)^additional_redirect_urls\s*=") {
    $content = $content -replace "(?m)^additional_redirect_urls\s*=.*$", $redirects
  } else {
    $content = $content -replace [regex]::Escape($siteUrl), "$siteUrl`r`n$redirects"
  }

  Write-Utf8NoBom -Path $SupabaseConfig -Content $content
  Write-Host "Auth local configurado para http://${LanIp}:3000."
}

function Resolve-SupabaseCli {
  $localCli = Join-Path $ProjectRoot "tools\supabase-cli\supabase.exe"
  $localGoCli = Join-Path $ProjectRoot "tools\supabase-cli\supabase-go.exe"
  $nodeExe = Resolve-Executable "node" @("C:\Program Files\nodejs\node.exe")
  $globalCliJs = Join-Path $env:APPDATA "npm\node_modules\supabase\dist\supabase.js"

  if ((Test-Path -LiteralPath $localCli) -and (Test-Path -LiteralPath $localGoCli)) {
    return @{ File = $localCli; Args = @() }
  }

  if ($nodeExe -and (Test-Path -LiteralPath $globalCliJs)) {
    return @{ File = $nodeExe; Args = @($globalCliJs) }
  }

  $command = Get-Command "supabase" -ErrorAction SilentlyContinue
  if ($command) {
    return @{ File = $command.Source; Args = @() }
  }

  throw "Supabase CLI nao encontrado. Instale a CLI ou mantenha os binarios em tools\supabase-cli."
}

function Invoke-Supabase {
  param([ValidateSet("start", "stop", "reset")][string]$Command)

  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "tools\local\supabase.ps1") $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao executar Supabase local: $Command."
  }
}

function Get-SupabaseStatusEnv {
  $supabase = Resolve-SupabaseCli

  Push-Location $SupabaseDir
  try {
    $baseArgs = @($supabase.Args)
    $lines = & $supabase.File @baseArgs status -o env
    if ($LASTEXITCODE -ne 0) {
      throw "Nao foi possivel ler as chaves do Supabase local."
    }
  } finally {
    Pop-Location
  }

  $values = @{}
  foreach ($line in $lines) {
    if ($line -match '^([A-Z0-9_]+)="(.*)"$') {
      $values[$Matches[1]] = $Matches[2]
    }
  }

  return $values
}

function Write-FrontendEnv {
  param(
    [string]$LanIp,
    [hashtable]$SupabaseValues
  )

  $anonKey = $SupabaseValues["ANON_KEY"]
  if (-not $anonKey) {
    $anonKey = $SupabaseValues["PUBLISHABLE_KEY"]
  }

  $serviceRoleKey = $SupabaseValues["SERVICE_ROLE_KEY"]
  if (-not $serviceRoleKey) {
    $serviceRoleKey = $SupabaseValues["SECRET_KEY"]
  }

  if (-not $anonKey -or -not $serviceRoleKey) {
    throw "As chaves anon e service_role nao foram encontradas no status do Supabase."
  }

  $envContent = @(
    'NEXT_PUBLIC_APP_NAME="Central de Carteira Fenie PRO"'
    "NEXT_PUBLIC_SUPABASE_URL=`"http://${LanIp}:54321`""
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=`"$anonKey`""
    "SUPABASE_SERVICE_ROLE_KEY=`"$serviceRoleKey`""
  )

  Write-Utf8NoBom -Path $EnvFile -Content (($envContent -join [Environment]::NewLine) + [Environment]::NewLine)
  Write-Host "frontend\.env.local configurado para a rede local."
}

if ($PreserveData -and $ResetData) {
  throw "Use apenas PreserveData ou ResetData, nunca os dois juntos."
}

if ($ProjectRoot -match "OneDrive|Google Drive|Meu Drive") {
  throw "Nao execute o servidor em pasta sincronizada. Copie o projeto para C:\Projetos\fenie-carteira-system."
}

Write-Host "Instalacao do PC servidor da Central de Carteira Fenie"
Write-Host "Projeto: $ProjectRoot"
Write-Host ""
Write-Host "ATENCAO: esta rotina aplica migrations e seed com supabase db reset."
Write-Host "Use-a na instalacao inicial. Dados locais existentes serao apagados."
Write-Host ""

if (-not $Confirmed) {
  $confirmation = Read-Host "Digite INSTALAR para continuar"
  if ($confirmation -ne "INSTALAR") {
    Write-Host "Instalacao cancelada."
    exit 0
  }
}

Write-Step "Validando Node.js e npm"
$node = Resolve-Executable "node" @("C:\Program Files\nodejs\node.exe")
if (-not $node) {
  throw "Node.js nao foi encontrado. Instale a versao LTS."
}
$npm = Resolve-Npm
Write-Host "Node: $(& $node --version)"
Write-Host "npm: $(& $npm --version)"

Wait-Docker

Write-Step "Parando processos locais antigos"
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "tools\local\stop-fenie.ps1")

Write-Step "Instalando dependencias"
& $npm --prefix $FrontendDir install
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao instalar dependencias do frontend."
}

$lanIp = Get-LanIPv4
Write-Step "Configurando rede local"
Write-Host "IPv4 detectado: $lanIp"
Update-SupabaseNetworkConfig -LanIp $lanIp

Write-Step "Iniciando Supabase local"
Invoke-Supabase start

if ($ExistingInstallation) {
  Write-Step "Instalacao existente detectada"
  Write-Host "O arquivo frontend\.env.local ja existe."
  $shouldReset = $ResetData

  if (-not $PreserveData -and -not $ResetData) {
    Write-Host "Para preservar o banco atual, pressione ENTER."
    Write-Host "Para apagar os dados e reaplicar migrations e seed, digite RESETAR."
    $resetConfirmation = Read-Host "Opcao"
    $shouldReset = ($resetConfirmation -eq "RESETAR")
  }

  if ($shouldReset) {
    Write-Step "Aplicando migrations e seed"
    Invoke-Supabase reset
  } else {
    Write-Host "Banco existente preservado."
  }
} else {
  Write-Step "Aplicando migrations e seed"
  Invoke-Supabase reset
}

Write-Step "Configurando ambiente do frontend"
$supabaseValues = Get-SupabaseStatusEnv
Write-FrontendEnv -LanIp $lanIp -SupabaseValues $supabaseValues

Write-Step "Gerando build de producao"
& $npm --prefix $FrontendDir run build
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao gerar o build de producao do frontend."
}

Write-Step "Criando atalho"
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "tools\local\create-desktop-shortcut.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao criar o atalho na area de trabalho."
}

Write-Step "Instalacao concluida"
Write-Host "URL neste computador: http://localhost:3000/login"
Write-Host "URL para a equipe:   http://${lanIp}:3000/login"
Write-Host ""
Write-Host "Antes do primeiro acesso de outro computador, libere no Firewall Windows:"
Write-Host "- TCP 3000 para o frontend"
Write-Host "- TCP 54321 para Auth e API Supabase usados pelo navegador"
Write-Host ""
Write-Host "Para iniciar o servidor, use INICIAR_SERVIDOR_FENIE.bat."
exit 0
