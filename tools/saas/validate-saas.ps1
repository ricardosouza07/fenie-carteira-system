param(
  [Parameter(Mandatory = $true)]
  [string]$AppUrl,

  [Parameter(Mandatory = $true)]
  [string]$ManifestPath,

  [string]$LoginFile,
  [string]$SupabaseUrl = $env:FENIE_SUPABASE_URL,
  [string]$AnonKey = $env:FENIE_SUPABASE_ANON_KEY,
  [string]$RemoteDbUrl = $env:FENIE_REMOTE_DB_URL,
  [string]$OutputFile = "backups\saas-migration\qa-saas.json"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ResolvedManifest = (Resolve-Path -LiteralPath $ManifestPath).Path
$OutputPath = if ([System.IO.Path]::IsPathRooted($OutputFile)) {
  $OutputFile
} else {
  Join-Path $ProjectRoot $OutputFile
}

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

function Invoke-RemoteQuery {
  param([string]$Sql)

  $arguments = @("-At", "-v", "ON_ERROR_STOP=1", "-c", $Sql)
  $psql = Get-Command "psql" -ErrorAction SilentlyContinue
  if ($psql) {
    $result = & $psql.Source $RemoteDbUrl @arguments
  } else {
    $result = & docker run --rm postgres:15 psql $RemoteDbUrl @arguments
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao validar o banco remoto."
  }

  return ($result -join [Environment]::NewLine)
}

$AppUrl = $AppUrl.TrimEnd("/")
$SupabaseUrl = if ($SupabaseUrl) { $SupabaseUrl.TrimEnd("/") } else { Read-Host "URL do Supabase remoto" }
$AnonKey = Read-SecretValue -CurrentValue $AnonKey -Prompt "Anon key do Supabase remoto"
$RemoteDbUrl = Read-SecretValue -CurrentValue $RemoteDbUrl -Prompt "Connection string do banco Supabase remoto"
$manifest = Get-Content -LiteralPath $ResolvedManifest -Raw | ConvertFrom-Json

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
  ), 0),
  'open_follow_ups', (select count(*) from public.follow_ups where status = 'aberto'),
  'overdue_follow_ups', (select count(*) from public.follow_ups where status = 'aberto' and due_at < now())
)::text;
"@

$remoteCounts = (Invoke-RemoteQuery -Sql $countsSql) | ConvertFrom-Json
$countChecks = New-Object System.Collections.Generic.List[object]
foreach ($property in $manifest.counts.PSObject.Properties) {
  $name = $property.Name
  if ($remoteCounts.PSObject.Properties.Name -contains $name) {
    $expected = [int64]$property.Value
    $actual = [int64]$remoteCounts.$name
    $countChecks.Add([ordered]@{
      metric = $name
      expected = $expected
      actual = $actual
      ok = ($expected -eq $actual)
    })
  }
}

$httpChecks = New-Object System.Collections.Generic.List[object]
foreach ($path in @("/login", "/dashboard", "/carteira", "/agenda", "/relatorios")) {
  try {
    $response = Invoke-WebRequest -Uri "$AppUrl$path" -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 20
    $httpChecks.Add([ordered]@{
      path = $path
      status = [int]$response.StatusCode
      ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
    })
  } catch {
    $httpChecks.Add([ordered]@{
      path = $path
      status = $null
      ok = $false
      error = $_.Exception.Message
    })
  }
}

$loginChecks = New-Object System.Collections.Generic.List[object]
if ($LoginFile) {
  $resolvedLoginFile = (Resolve-Path -LiteralPath $LoginFile).Path
  $logins = @(Get-Content -LiteralPath $resolvedLoginFile -Raw | ConvertFrom-Json)

  foreach ($login in $logins) {
    try {
      $tokenHeaders = @{
        apikey = $AnonKey
      }
      $tokenPayload = @{
        email = [string]$login.email
        password = [string]$login.password
      } | ConvertTo-Json

      $token = Invoke-RestMethod `
        -Method Post `
        -Uri "$SupabaseUrl/auth/v1/token?grant_type=password" `
        -Headers $tokenHeaders `
        -ContentType "application/json" `
        -Body $tokenPayload

      $dataHeaders = @{
        apikey = $AnonKey
        Authorization = "Bearer $($token.access_token)"
        Prefer = "count=exact"
      }
      $profile = Invoke-RestMethod `
        -Method Get `
        -Uri "$SupabaseUrl/rest/v1/profiles?id=eq.$($token.user.id)&select=id,email,role,active" `
        -Headers $dataHeaders
      $customerResponse = Invoke-WebRequest `
        -Method Get `
        -Uri "$SupabaseUrl/rest/v1/customers?select=id&limit=1" `
        -Headers $dataHeaders `
        -UseBasicParsing

      $loginChecks.Add([ordered]@{
        email = [string]$login.email
        authenticated = [bool]$token.access_token
        profileLoaded = (@($profile).Count -eq 1)
        role = if (@($profile).Count -eq 1) { [string]$profile[0].role } else { $null }
        active = if (@($profile).Count -eq 1) { [bool]$profile[0].active } else { $false }
        customerScopeResponded = ($customerResponse.StatusCode -eq 200)
        ok = ([bool]$token.access_token -and @($profile).Count -eq 1 -and [bool]$profile[0].active)
      })
    } catch {
      $loginChecks.Add([ordered]@{
        email = [string]$login.email
        ok = $false
        error = $_.Exception.Message
      })
    }
  }
}

$latestImportSql = @"
select coalesce(json_build_object(
  'id', id,
  'fileName', file_name,
  'status', status,
  'totalRows', total_rows,
  'validRows', valid_rows,
  'publishedAt', published_at
)::text, '{}'::json::text)
from public.portfolio_imports
where status = 'publicada'
order by published_at desc nulls last, created_at desc
limit 1;
"@
$latestImport = (Invoke-RemoteQuery -Sql $latestImportSql) | ConvertFrom-Json

$report = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  appUrl = $AppUrl
  supabaseUrl = $SupabaseUrl
  counts = $countChecks
  allCountsMatch = -not ($countChecks.ok -contains $false)
  latestPublishedImport = $latestImport
  httpChecks = $httpChecks
  loginChecks = $loginChecks
  summary = [ordered]@{
    customers = [int64]$remoteCounts.customers
    currentPortfolioItems = [int64]$remoteCounts.current_portfolio_items
    interactions = [int64]$remoteCounts.customer_interactions
    openFollowUps = [int64]$remoteCounts.open_follow_ups
    overdueFollowUps = [int64]$remoteCounts.overdue_follow_ups
    points = [int64]$remoteCounts.point_events
  }
}

New-Item -ItemType Directory -Path (Split-Path $OutputPath -Parent) -Force | Out-Null
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $OutputPath -Encoding UTF8

Write-Host ""
Write-Host "QA SaaS concluido."
Write-Host "Clientes remotos: $($remoteCounts.customers)"
Write-Host "Itens atuais da carteira: $($remoteCounts.current_portfolio_items)"
Write-Host "Contagens conferem: $($report.allCountsMatch)"
Write-Host "Relatorio: $OutputPath"

if (-not $report.allCountsMatch -or $httpChecks.ok -contains $false -or $loginChecks.ok -contains $false) {
  exit 1
}
