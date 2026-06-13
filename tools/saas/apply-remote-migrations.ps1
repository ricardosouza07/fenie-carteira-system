param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [string]$DatabasePassword = $env:FENIE_REMOTE_DB_PASSWORD
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$SupabaseDirectory = Join-Path $ProjectRoot "backend\supabase"

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

if ($ProjectRef -notmatch '^[a-z0-9]{20}$') {
  Write-Warning "O project ref informado nao possui o formato usual de 20 caracteres."
}

$DatabasePassword = Read-SecretValue -CurrentValue $DatabasePassword -Prompt "Senha do banco Supabase remoto"
$supabase = Resolve-SupabaseCli

Push-Location $SupabaseDirectory
try {
  Write-Host "Vinculando projeto remoto..."
  & $supabase link --project-ref $ProjectRef --password $DatabasePassword
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao vincular o projeto Supabase remoto. Rode supabase login antes."
  }

  Write-Host "Aplicando migrations pendentes..."
  & $supabase db push --include-all
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao aplicar migrations remotas."
  }

  Write-Host "Conferindo historico de migrations..."
  & $supabase migration list
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao listar migrations."
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Migrations remotas aplicadas e listadas."
