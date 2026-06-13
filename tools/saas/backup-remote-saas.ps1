param(
  [string]$RemoteDbUrl = $env:FENIE_REMOTE_DB_URL,
  [string]$OutputDirectory = "backups\saas-remote"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDirectory = Join-Path (Join-Path $ProjectRoot $OutputDirectory) "remote-$Timestamp"

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

function Resolve-SupabaseCli {
  $localCli = Join-Path $ProjectRoot "tools\supabase-cli\supabase.exe"
  $localGoCli = Join-Path $ProjectRoot "tools\supabase-cli\supabase-go.exe"
  $globalCommand = Get-Command "supabase" -ErrorAction SilentlyContinue

  if ((Test-Path -LiteralPath $localCli) -and (Test-Path -LiteralPath $localGoCli)) {
    return $localCli
  }

  if ($globalCommand) {
    return $globalCommand.Source
  }

  throw "Supabase CLI nao encontrada."
}

$RemoteDbUrl = Read-SecretValue -CurrentValue $RemoteDbUrl -Prompt "Connection string do banco Supabase remoto"
if ($RemoteDbUrl -notmatch '^postgres(ql)?://') {
  throw "Connection string remota invalida."
}

$supabase = Resolve-SupabaseCli
New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null

Push-Location $BackupDirectory
try {
  Write-Host "Exportando roles..."
  & $supabase db dump --db-url $RemoteDbUrl -f roles.sql --role-only
  if ($LASTEXITCODE -ne 0) { throw "Falha ao exportar roles." }

  Write-Host "Exportando schema..."
  & $supabase db dump --db-url $RemoteDbUrl -f schema.sql
  if ($LASTEXITCODE -ne 0) { throw "Falha ao exportar schema." }

  Write-Host "Exportando dados..."
  & $supabase db dump `
    --db-url $RemoteDbUrl `
    -f data.sql `
    --use-copy `
    --data-only `
    -x "storage.buckets_vectors" `
    -x "storage.vector_indexes"
  if ($LASTEXITCODE -ne 0) { throw "Falha ao exportar dados." }
} finally {
  Pop-Location
}

$files = Get-ChildItem -LiteralPath $BackupDirectory -File
$manifest = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  files = @($files | ForEach-Object {
    [ordered]@{
      name = $_.Name
      bytes = $_.Length
      sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
    }
  })
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $BackupDirectory "manifest.json") -Encoding UTF8

Write-Host ""
Write-Host "Backup remoto criado em:"
Write-Host $BackupDirectory
Write-Host "Mantenha este diretorio fora do Git e em armazenamento seguro."
