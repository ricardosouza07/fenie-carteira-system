param(
  [Parameter(Mandatory = $true)]
  [string]$UsersFile,

  [string]$SupabaseUrl = $env:FENIE_SUPABASE_URL,
  [string]$ServiceRoleKey = $env:FENIE_SUPABASE_SERVICE_ROLE_KEY,
  [string]$OutputMap = "backups\saas-migration\remote-user-map.json"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ResolvedUsersFile = (Resolve-Path -LiteralPath $UsersFile).Path
$OutputMapPath = if ([System.IO.Path]::IsPathRooted($OutputMap)) {
  $OutputMap
} else {
  Join-Path $ProjectRoot $OutputMap
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

$SupabaseUrl = if ($SupabaseUrl) { $SupabaseUrl.TrimEnd("/") } else { Read-Host "URL do Supabase remoto" }
$ServiceRoleKey = Read-SecretValue -CurrentValue $ServiceRoleKey -Prompt "Service role key do Supabase remoto"

if ($SupabaseUrl -notmatch '^https://') {
  throw "Use a URL HTTPS do Supabase remoto."
}

$users = @(Get-Content -LiteralPath $ResolvedUsersFile -Raw | ConvertFrom-Json)
if ($users.Count -eq 0) {
  throw "Nenhum usuario foi informado."
}

$validRoles = @("admin", "supervisor", "operador_interno")
$adminHeaders = @{
  apikey = $ServiceRoleKey
  Authorization = "Bearer $ServiceRoleKey"
}

Write-Host "Consultando usuarios existentes no Supabase remoto..."
$existingResponse = Invoke-RestMethod `
  -Method Get `
  -Uri "$SupabaseUrl/auth/v1/admin/users?page=1&per_page=1000" `
  -Headers $adminHeaders
$existingUsers = @($existingResponse.users)
$mapping = New-Object System.Collections.Generic.List[object]

foreach ($user in $users) {
  if (-not $user.localProfileId -or -not $user.email -or -not $user.fullName -or -not $user.role) {
    throw "Todos os usuarios precisam de localProfileId, email, fullName e role."
  }

  if ($validRoles -notcontains [string]$user.role) {
    throw "Role invalida para $($user.email): $($user.role)."
  }

  $remoteUser = $existingUsers |
    Where-Object { $_.email -and $_.email.ToLowerInvariant() -eq $user.email.ToLowerInvariant() } |
    Select-Object -First 1

  if (-not $remoteUser) {
    if (-not $user.password -or $user.password -like "ALTERE-*") {
      throw "Defina uma senha real e forte para $($user.email) no arquivo local de usuarios."
    }

    if ([string]$user.password -notmatch '^.{12,}$') {
      throw "A senha de $($user.email) deve ter pelo menos 12 caracteres."
    }

    Write-Host "Criando usuario: $($user.email)"
    $payload = @{
      email = [string]$user.email
      password = [string]$user.password
      email_confirm = $true
      user_metadata = @{
        full_name = [string]$user.fullName
      }
    } | ConvertTo-Json -Depth 5

    $remoteUser = Invoke-RestMethod `
      -Method Post `
      -Uri "$SupabaseUrl/auth/v1/admin/users" `
      -Headers $adminHeaders `
      -ContentType "application/json" `
      -Body $payload
  } else {
    Write-Host "Usuario ja existe, reutilizando: $($user.email)"
  }

  $profilePayload = @{
    id = [string]$remoteUser.id
    salesperson_id = $null
    full_name = [string]$user.fullName
    email = [string]$user.email
    role = [string]$user.role
    active = if ($null -eq $user.active) { $true } else { [bool]$user.active }
  } | ConvertTo-Json -Depth 5

  $profileHeaders = @{
    apikey = $ServiceRoleKey
    Authorization = "Bearer $ServiceRoleKey"
    Prefer = "resolution=merge-duplicates,return=minimal"
  }

  Invoke-RestMethod `
    -Method Post `
    -Uri "$SupabaseUrl/rest/v1/profiles?on_conflict=id" `
    -Headers $profileHeaders `
    -ContentType "application/json" `
    -Body $profilePayload | Out-Null

  $mapping.Add([ordered]@{
    localProfileId = [string]$user.localProfileId
    remoteProfileId = [string]$remoteUser.id
    email = [string]$user.email
    fullName = [string]$user.fullName
    role = [string]$user.role
    salespersonId = if ($user.salespersonId) { [string]$user.salespersonId } else { $null }
  })
}

$outputDirectory = Split-Path $OutputMapPath -Parent
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$mapping | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputMapPath -Encoding UTF8

Write-Host ""
Write-Host "Usuarios e profiles preparados."
Write-Host "Mapa sem senhas salvo em:"
Write-Host $OutputMapPath
Write-Host ""
Write-Host "Nao versione o arquivo original com senhas."
