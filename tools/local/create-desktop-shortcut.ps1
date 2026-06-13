$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Target = Join-Path $ProjectRoot "START_FENIE.bat"
$ShortcutName = "Central de Carteira Feni$([char]0x00E9)"

if (-not (Test-Path -LiteralPath $Target)) {
  throw "START_FENIE.bat nao encontrado em $Target."
}

$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "$ShortcutName.lnk"
$BrokenShortcutPath = Join-Path $Desktop ("Central de Carteira Feni" + [char]0x00C3 + [char]0x00A9 + ".lnk")

if (Test-Path -LiteralPath $BrokenShortcutPath) {
  Remove-Item -LiteralPath $BrokenShortcutPath -Force
}

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $Target
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = "Abrir $ShortcutName local"
$Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,44"
$Shortcut.Save()

Write-Host "Atalho criado com sucesso: $ShortcutPath"
exit 0
