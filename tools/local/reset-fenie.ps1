$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BrandName = "Central de Carteira Feni$([char]0x00E9)"
Set-Location $ProjectRoot

Write-Host "Reset do banco local da $BrandName"
Write-Host ""
Write-Host "ATENCAO: dados operacionais locais serao apagados."
Write-Host "O reset reaplica migrations, seed e usuarios padrao."
Write-Host ""
Write-Host "Usuarios padrao mantidos pelo seed:"
Write-Host "- admin@fenie.local / Admin@123456"
Write-Host "- supervisor@fenie.local / Supervisor@123456"
Write-Host "- laryssa.dias@fenie.local / Operador@123456"
Write-Host ""

$confirmation = Read-Host "Digite RESET para continuar"
if ($confirmation -ne "RESET") {
  Write-Host "Reset cancelado."
  exit 0
}

Write-Host ""
Write-Host "Executando supabase db reset..."
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectRoot "tools\local\supabase.ps1") reset
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao resetar o banco local."
}

Write-Host ""
Write-Host "Banco local resetado com seed e usuarios padrao."
exit 0
