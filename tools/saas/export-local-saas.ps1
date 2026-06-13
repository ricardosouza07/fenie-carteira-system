param(
  [string]$OutputDirectory = "backups\saas-migration"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$OutputRoot = Join-Path $ProjectRoot $OutputDirectory
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$PackageDirectory = Join-Path $OutputRoot "fenie-saas-$Timestamp"
$ContainerFile = "/tmp/fenie-saas-$Timestamp.sql"
$DataFile = Join-Path $PackageDirectory "public-data.sql"
$ManifestFile = Join-Path $PackageDirectory "manifest.json"
$ProfilesFile = Join-Path $PackageDirectory "local-profiles.json"

function Get-LocalDbContainer {
  $container = & docker ps --format "{{.Names}}" |
    Where-Object { $_ -eq "supabase_db_fenie-carteira-system" -or $_ -like "supabase_db_*" } |
    Select-Object -First 1

  if (-not $container) {
    throw "Container do banco local nao encontrado. Rode npm run supabase:start."
  }

  return $container
}

function Invoke-LocalQuery {
  param(
    [string]$Container,
    [string]$Sql
  )

  $result = & docker exec $Container psql -U postgres -d postgres -At -v ON_ERROR_STOP=1 -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao consultar o banco local."
  }

  return ($result -join [Environment]::NewLine)
}

New-Item -ItemType Directory -Path $PackageDirectory -Force | Out-Null
$container = Get-LocalDbContainer

Write-Host "Exportando dados publicos do banco local..."
& docker exec $container pg_dump `
  -U postgres `
  -d postgres `
  --schema=public `
  --data-only `
  --inserts `
  --column-inserts `
  --no-owner `
  --no-privileges `
  --exclude-table=public.profiles `
  --file=$ContainerFile

if ($LASTEXITCODE -ne 0) {
  throw "Falha ao gerar o dump local."
}

& docker cp "${container}:${ContainerFile}" $DataFile
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao copiar o dump para $DataFile."
}

& docker exec $container rm -f $ContainerFile | Out-Null

$countsSql = @"
select json_build_object(
  'salespeople', (select count(*) from public.salespeople),
  'salesperson_aliases', (select count(*) from public.salesperson_aliases),
  'customers', (select count(*) from public.customers),
  'customer_contacts', (select count(*) from public.customer_contacts),
  'portfolio_imports', (select count(*) from public.portfolio_imports),
  'portfolio_import_rows', (select count(*) from public.portfolio_import_rows),
  'portfolio_items', (select count(*) from public.portfolio_items),
  'current_portfolio_items', (select count(*) from public.portfolio_items where is_current),
  'customer_interactions', (select count(*) from public.customer_interactions),
  'follow_ups', (select count(*) from public.follow_ups),
  'goals', (select count(*) from public.goals),
  'point_events', (select count(*) from public.point_events),
  'performance_campaigns', (select count(*) from public.performance_campaigns),
  'performance_campaign_levels', (select count(*) from public.performance_campaign_levels),
  'published_imports', (select count(*) from public.portfolio_imports where status = 'publicada'),
  'latest_published_rows', coalesce((
    select valid_rows
    from public.portfolio_imports
    where status = 'publicada'
    order by published_at desc nulls last, created_at desc
    limit 1
  ), 0)
)::text;
"@

$profilesSql = @"
select coalesce(json_agg(json_build_object(
  'localProfileId', id,
  'email', email,
  'fullName', full_name,
  'role', role,
  'salespersonId', salesperson_id,
  'active', active
) order by email), '[]'::json)::text
from public.profiles;
"@

$counts = (Invoke-LocalQuery -Container $container -Sql $countsSql) | ConvertFrom-Json
$profilesJson = Invoke-LocalQuery -Container $container -Sql $profilesSql
$profiles = $profilesJson | ConvertFrom-Json

$profiles | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ProfilesFile -Encoding UTF8

$dataHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $DataFile).Hash
$manifest = [ordered]@{
  formatVersion = 1
  exportedAt = (Get-Date).ToUniversalTime().ToString("o")
  source = "supabase-local"
  database = "postgres"
  dataFile = "public-data.sql"
  dataSha256 = $dataHash
  profilesFile = "local-profiles.json"
  profileCount = @($profiles).Count
  counts = $counts
  notes = @(
    "O dump contem apenas dados do schema public.",
    "public.profiles foi excluida e deve ser recriada com usuarios reais.",
    "auth.users e senhas locais nao fazem parte deste pacote."
  )
}

$manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $ManifestFile -Encoding UTF8

Write-Host ""
Write-Host "Pacote de migracao criado:"
Write-Host $PackageDirectory
Write-Host ""
Write-Host "Clientes: $($counts.customers)"
Write-Host "Itens atuais da carteira: $($counts.current_portfolio_items)"
Write-Host "Importacoes publicadas: $($counts.published_imports)"
Write-Host "SHA256: $dataHash"
Write-Host ""
Write-Host "Guarde este pacote em local seguro. Ele contem dados reais da Fenie."
