param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("start", "stop", "reset", "status")]
  [string]$Command
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$supabaseDir = Join-Path $root "backend\supabase"
$localCli = Join-Path $root "tools\supabase-cli\supabase.exe"
$localGoCli = Join-Path $root "tools\supabase-cli\supabase-go.exe"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$globalCliJs = Join-Path $env:APPDATA "npm\node_modules\supabase\dist\supabase.js"

function Resolve-SupabaseCli {
  if ((Test-Path -LiteralPath $localCli) -and (Test-Path -LiteralPath $localGoCli)) {
    return @{
      File = $localCli
      Args = @()
    }
  }

  if ((Test-Path -LiteralPath $nodeExe) -and (Test-Path -LiteralPath $globalCliJs)) {
    return @{
      File = $nodeExe
      Args = @($globalCliJs)
    }
  }

  $cmd = Get-Command "supabase" -ErrorAction SilentlyContinue
  if ($cmd) {
    return @{
      File = $cmd.Source
      Args = @()
    }
  }

  throw "Supabase CLI nao encontrado ou binario local incompleto. Instale a CLI global ou mantenha supabase.exe e supabase-go.exe juntos em tools\supabase-cli."
}

$supabase = Resolve-SupabaseCli

Push-Location $supabaseDir
try {
  $baseArgs = @($supabase.Args)
  switch ($Command) {
    "start" { & $supabase.File @baseArgs start }
    "stop" { & $supabase.File @baseArgs stop }
    "reset" { & $supabase.File @baseArgs db reset }
    "status" { & $supabase.File @baseArgs status }
  }
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
