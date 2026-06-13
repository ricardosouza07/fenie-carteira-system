param(
  [Parameter(Mandatory = $true)]
  [string]$PackageDirectory,

  [Parameter(Mandatory = $true)]
  [string]$UserMapFile,

  [string]$RemoteDbUrl = $env:FENIE_REMOTE_DB_URL,
  [switch]$AllowNonEmptyTarget
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ResolvedPackage = (Resolve-Path -LiteralPath $PackageDirectory).Path
$ResolvedUserMap = (Resolve-Path -LiteralPath $UserMapFile).Path
$ManifestPath = Join-Path $ResolvedPackage "manifest.json"
$ProfilesPath = Join-Path $ResolvedPackage "local-profiles.json"
$DataPath = Join-Path $ResolvedPackage "public-data.sql"
$PreparedPath = Join-Path $ResolvedPackage "public-data-remapped.sql"
$PostImportPath = Join-Path $ResolvedPackage "post-import-profiles.sql"

function Read-SecretValue {
  param(
    [string]$CurrentValue,
    [string]$Prompt
  )

  if ($CurrentValue) {
    return $CurrentValue
  }

  $secureValue = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Invoke-RemotePsql {
  param(
    [string[]]$Arguments,
    [string]$MountDirectory
  )

  $docker = Get-Command "docker" -ErrorAction SilentlyContinue
  if (-not $docker) {
    throw "Docker nao foi encontrado. Ele e necessario para usar o psql 15 de forma previsivel."
  }

  $dockerArgs = @("run", "--rm")
  if ($MountDirectory) {
    $dockerArgs += @("-v", "${MountDirectory}:/migration:ro")
  }
  $dockerArgs += @("postgres:15", "psql", $RemoteDbUrl)
  $dockerArgs += $Arguments

  & $docker.Source @dockerArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao executar psql remoto via Docker."
  }
}

foreach ($requiredFile in @($ManifestPath, $ProfilesPath, $DataPath)) {
  if (-not (Test-Path -LiteralPath $requiredFile)) {
    throw "Arquivo obrigatorio ausente: $requiredFile"
  }
}

$RemoteDbUrl = Read-SecretValue -CurrentValue $RemoteDbUrl -Prompt "Connection string do banco Supabase remoto"
if ($RemoteDbUrl -notmatch '^postgres(ql)?://') {
  throw "Connection string remota invalida."
}

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$expectedHash = [string]$manifest.dataSha256
$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $DataPath).Hash
if ($expectedHash -ne $actualHash) {
  throw "SHA256 do dump divergente. Nao importe um pacote alterado."
}

$localProfiles = @(Get-Content -LiteralPath $ProfilesPath -Raw | ConvertFrom-Json)
$userMap = @(Get-Content -LiteralPath $ResolvedUserMap -Raw | ConvertFrom-Json)

foreach ($profile in $localProfiles) {
  $mapped = $userMap |
    Where-Object { $_.localProfileId -eq $profile.localProfileId } |
    Select-Object -First 1
  if (-not $mapped) {
    throw "Perfil local sem mapeamento: $($profile.email) / $($profile.localProfileId)"
  }
}

Write-Host "Validando se o Supabase remoto esta vazio..."
$preflightSql = @"
select (
  (select count(*) from public.salespeople) +
  (select count(*) from public.customers) +
  (select count(*) from public.portfolio_imports) +
  (select count(*) from public.customer_interactions) +
  (select count(*) from public.follow_ups) +
  (select count(*) from public.point_events)
)::text;
"@

$arguments = @("-At", "-v", "ON_ERROR_STOP=1", "-c", $preflightSql)
$targetCount = (& docker run --rm postgres:15 psql $RemoteDbUrl @arguments | Select-Object -Last 1)
if ($LASTEXITCODE -ne 0) {
  throw "Falha no preflight remoto via Docker."
}

if ([int64]$targetCount -gt 0 -and -not $AllowNonEmptyTarget) {
  throw "O banco remoto ja possui dados operacionais. Interrompido para evitar duplicacao. Use AllowNonEmptyTarget somente com backup e plano de rollback."
}

$sql = [System.IO.File]::ReadAllText($DataPath)
foreach ($map in $userMap) {
  if (-not $map.localProfileId -or -not $map.remoteProfileId) {
    throw "Mapa de usuarios incompleto."
  }
  $sql = [regex]::Replace(
    $sql,
    [regex]::Escape([string]$map.localProfileId),
    [string]$map.remoteProfileId,
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($PreparedPath, $sql, $utf8NoBom)

$postImportStatements = New-Object System.Collections.Generic.List[string]
$postImportStatements.Add("\set ON_ERROR_STOP on")
$postImportStatements.Add("begin;")
foreach ($map in $userMap) {
  if ($map.salespersonId) {
    $postImportStatements.Add(
      "update public.profiles set salesperson_id = '$($map.salespersonId)'::uuid, updated_at = now() where id = '$($map.remoteProfileId)'::uuid;"
    )
  }
}
$postImportStatements.Add("commit;")
[System.IO.File]::WriteAllLines($PostImportPath, $postImportStatements, $utf8NoBom)

Write-Host "Importando dados remapeados..."
Invoke-RemotePsql `
  -MountDirectory $ResolvedPackage `
  -Arguments @("--single-transaction", "-v", "ON_ERROR_STOP=1", "-f", "/migration/public-data-remapped.sql")

Write-Host "Atualizando vinculos dos profiles..."
Invoke-RemotePsql `
  -MountDirectory $ResolvedPackage `
  -Arguments @("-v", "ON_ERROR_STOP=1", "-f", "/migration/post-import-profiles.sql")

Write-Host ""
Write-Host "Importacao remota concluida."
Write-Host "Execute agora tools\saas\validate-saas.ps1."
