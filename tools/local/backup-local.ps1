param(
  [string]$OutputDirectory = "backups\local"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$backupDir = Join-Path $root $OutputDirectory
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$container = (& docker ps --format "{{.Names}}" | Where-Object {
  $_ -eq "supabase_db_fenie-carteira-system" -or $_ -like "supabase_db_*"
} | Select-Object -First 1)

if (-not $container) {
  throw "Container do banco Supabase local nao encontrado. Rode npm run supabase:start antes do backup."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $backupDir "fenie-local-$timestamp.sql"

& docker exec $container pg_dump -U postgres -d postgres --clean --if-exists | Out-File -FilePath $outputFile -Encoding utf8

if ($LASTEXITCODE -ne 0) {
  throw "Falha ao gerar backup local."
}

Write-Host "Backup local criado em: $outputFile"
