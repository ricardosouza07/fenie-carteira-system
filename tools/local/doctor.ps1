$ErrorActionPreference = "SilentlyContinue"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$frontendEnv = Join-Path $root "frontend\.env.local"
$localCli = Join-Path $root "tools\supabase-cli\supabase.exe"
$localGoCli = Join-Path $root "tools\supabase-cli\supabase-go.exe"
$globalCliJs = Join-Path $env:APPDATA "npm\node_modules\supabase\dist\supabase.js"
$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Name,
    [bool]$Ok,
    [string]$Detail
  )

  $checks.Add([pscustomobject]@{
    Name = $Name
    Ok = $Ok
    Detail = $Detail
  })
}

function Test-Port {
  param([int]$Port)
  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return [bool]$connection
}

function Resolve-CommandPath {
  param(
    [string]$Name,
    [string[]]$Fallbacks
  )

  $fallback = $Fallbacks | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($fallback) {
    return $fallback
  }

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  return $null
}

$nodePath = Resolve-CommandPath "node" @("C:\Program Files\nodejs\node.exe")
$npmPath = Resolve-CommandPath "npm.cmd" @("C:\Program Files\nodejs\npm.cmd")
$dockerPath = Resolve-CommandPath "docker" @(
  "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe",
  "$env:ProgramFiles\Docker\Docker\resources\com.docker.cli.exe"
)

function Test-DockerProcess {
  return [bool](Get-Process -Name "Docker Desktop", "com.docker.backend", "docker-agent" -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Test-SupabaseApi {
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:54321/rest/v1/" -UseBasicParsing -TimeoutSec 3
    return @{
      Ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
      Detail = "API respondeu HTTP $($response.StatusCode)."
    }
  } catch {
    return @{
      Ok = $false
      Detail = "API local nao respondeu em http://127.0.0.1:54321."
    }
  }
}

if ($nodePath) {
  $nodeVersion = (& $nodePath --version)
  Add-Check "Node.js" $true $nodeVersion
} else {
  Add-Check "Node.js" $false "Nao encontrado no PATH nem em C:\Program Files\nodejs."
}

if ($npmPath) {
  $npmVersion = (& $npmPath --version)
  Add-Check "npm" $true $npmVersion
} else {
  Add-Check "npm" $false "npm.cmd nao encontrado no PATH nem em C:\Program Files\nodejs."
}

if ($dockerPath) {
  & $dockerPath info *> $null
  Add-Check "Docker rodando" ($LASTEXITCODE -eq 0) "Docker CLI encontrado."
} elseif (Test-DockerProcess) {
  Add-Check "Docker rodando" $true "Docker Desktop esta em execucao; docker.exe nao esta no PATH."
} else {
  Add-Check "Docker rodando" $false "Docker CLI e processo Docker Desktop nao encontrados."
}

if ((Test-Path -LiteralPath $localCli) -and (Test-Path -LiteralPath $localGoCli)) {
  $supabaseVersion = (& $localCli --version)
  Add-Check "Supabase CLI" $true "Local: $supabaseVersion"
} elseif ((Test-Path -LiteralPath $nodePath) -and (Test-Path -LiteralPath $globalCliJs)) {
  $supabaseVersion = (& $nodePath $globalCliJs --version)
  Add-Check "Supabase CLI" $true "Global npm: $supabaseVersion"
} else {
  $supabase = Get-Command "supabase" -ErrorAction SilentlyContinue
  if ($supabase) {
    $supabaseVersion = (& supabase --version)
    Add-Check "Supabase CLI" $true "Global: $supabaseVersion"
  } else {
    Add-Check "Supabase CLI" $false "Nao encontrado."
  }
}

Add-Check ".env.local frontend" (Test-Path -LiteralPath $frontendEnv) $frontendEnv

if (Test-Path -LiteralPath $frontendEnv) {
  $envContent = Get-Content -LiteralPath $frontendEnv -Raw
  $supabaseUrlMatch = [regex]::Match(
    $envContent,
    '(?m)^NEXT_PUBLIC_SUPABASE_URL="?([^"\r\n]+)"?'
  )
  $supabaseUrl = if ($supabaseUrlMatch.Success) {
    $supabaseUrlMatch.Groups[1].Value.TrimEnd("/")
  } else {
    $null
  }
  $localAddresses = @(
    "127.0.0.1",
    "localhost"
  ) + @(
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object {
        $_.AddressState -eq "Preferred" -and
        $_.IPAddress -notlike "169.254.*"
      } |
      Select-Object -ExpandProperty IPAddress
  )
  $supabaseUri = if ($supabaseUrl) {
    try { [uri]$supabaseUrl } catch { $null }
  } else {
    $null
  }
  $supabaseHost = if ($supabaseUri) { $supabaseUri.Host } else { $null }
  $isLocalSupabaseUrl = (
    $supabaseUri -and
    $supabaseUri.Port -eq 54321 -and
    $localAddresses -contains $supabaseHost
  )
  $urlDetail = if ($supabaseUrl) {
    "$supabaseUrl deve apontar para este computador na porta 54321."
  } else {
    "NEXT_PUBLIC_SUPABASE_URL nao encontrada."
  }
  Add-Check -Name "URL Supabase local" -Ok ([bool]$isLocalSupabaseUrl) -Detail $urlDetail
  Add-Check "Anon key preenchida" ($envContent -notmatch "copie-o-anon-key" -and $envContent -match "NEXT_PUBLIC_SUPABASE_ANON_KEY=") "Nao deve ficar com placeholder."
  Add-Check "Service role preenchida" ($envContent -notmatch "copie-o-service-role-key" -and $envContent -match "SUPABASE_SERVICE_ROLE_KEY=") "Nao deve ficar com placeholder."
}

$frontendBusy = Test-Port 3000
if ($frontendBusy) {
  Add-Check "Porta frontend 3000" $true "Ocupada. O frontend pode ja estar rodando; use outra porta se precisar iniciar uma segunda instancia."
} else {
  Add-Check "Porta frontend 3000" $true "Livre para iniciar o frontend."
}
Add-Check "Porta Supabase API 54321" (Test-Port 54321) "Ocupada quando Supabase local esta rodando."
Add-Check "Porta Supabase DB 54322" (Test-Port 54322) "Ocupada quando Supabase local esta rodando."
if (Test-Port 54323) {
  Add-Check "Porta Supabase Studio 54323" $true "Ocupada quando Supabase Studio esta rodando."
} else {
  Add-Check "Porta Supabase Studio 54323" $true "Livre ou Studio ainda nao iniciado. Nao impede o sistema."
}

$supabaseApi = Test-SupabaseApi
Add-Check "Conexao Supabase local" $supabaseApi.Ok $supabaseApi.Detail

Write-Host ""
Write-Host "Fenie Carteira - Doctor local"
Write-Host "================================"

$failed = 0
foreach ($check in $checks) {
  if ($check.Ok) {
    Write-Host "[OK]   $($check.Name) - $($check.Detail)"
  } else {
    $failed += 1
    Write-Host "[ERRO] $($check.Name) - $($check.Detail)"
  }
}

Write-Host ""
if ($failed -gt 0) {
  Write-Host "$failed verificacao(oes) precisam de atencao."
  exit 1
}

Write-Host "Ambiente local pronto."
