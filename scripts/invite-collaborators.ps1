param(
  [string]$Token = $env:GITHUB_TOKEN,
  [string]$Repo = "clascuna556171/stxic-realm",
  [string[]]$Collaborators = @(
    "leecodehub",
    "mdimco554902-a11y",
    "JKJapona",
    "AlbertCandilas"
  ),
  [ValidateSet('pull','triage','push','maintain','admin')][string]$Permission = "push"
)

$ErrorActionPreference = "Stop"

if (-not $Token) {
  Write-Error "GitHub Personal Access Token is required. Pass -Token '<your-token>' or set `$env:GITHUB_TOKEN."
  exit 1
}

$headers = @{
  "Authorization" = "Bearer $Token"
  "Accept" = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
  "User-Agent" = "STXIC-Realm-Team-Setup"
}

Write-Host "Verifying GitHub credentials..." -ForegroundColor Cyan
try {
  $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
  Write-Host "Authenticated as: $($user.login)" -ForegroundColor Green
} catch {
  Write-Error "Authentication failed. Please verify your token: $_"
  exit 1
}

Write-Host "`nInviting team collaborators to $Repo (Permission: $Permission)..." -ForegroundColor Cyan

foreach ($username in $Collaborators) {
  $uri = "https://api.github.com/repos/$Repo/collaborators/$username"
  $body = @{ permission = $Permission } | ConvertTo-Json
  try {
    $response = Invoke-WebRequest -Uri $uri -Headers $headers -Method Put -Body $body -ContentType "application/json" -UseBasicParsing
    if ($response.StatusCode -eq 201) {
      $data = $response.Content | ConvertFrom-Json
      Write-Host "  [INVITED] $username -> Invitation sent! Invite URL: $($data.html_url)" -ForegroundColor Green
    } elseif ($response.StatusCode -eq 204) {
      Write-Host "  [EXISTING] $username -> Already a collaborator." -ForegroundColor Yellow
    } else {
      Write-Host "  [STATUS $($response.StatusCode)] $username" -ForegroundColor Gray
    }
  } catch {
    Write-Host "  [FAILED] $username : $_" -ForegroundColor Red
  }
}

Write-Host "`nAll collaborator invitations processed!" -ForegroundColor Cyan
