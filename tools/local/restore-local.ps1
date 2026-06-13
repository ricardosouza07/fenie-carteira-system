param(
  [Alias("file")]
  [string]$FilePath
)

$ErrorActionPreference = "Stop"

if (-not $FilePath) {
  throw "Informe o arquivo: npm run restore:local -- -FilePath backups\local\fenie-local-YYYYMMDD-HHMMSS.sql"
}

$resolvedFile = (Resolve-Path -LiteralPath $FilePath).Path

$container = (& docker ps --format "{{.Names}}" | Where-Object {
  $_ -eq "supabase_db_fenie-carteira-system" -or $_ -like "supabase_db_*"
} | Select-Object -First 1)

if (-not $container) {
  throw "Container do banco Supabase local nao encontrado. Rode npm run supabase:start antes de restaurar."
}

Write-Host "Restaurando backup em banco local. Esta acao pode substituir dados atuais."
Get-Content -LiteralPath $resolvedFile -Raw | & docker exec -i $container psql -U postgres -d postgres

if ($LASTEXITCODE -ne 0) {
  throw "Falha ao restaurar backup local."
}

Write-Host "Backup restaurado com sucesso: $resolvedFile"
