$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Setting up STXIC Realm for local development..." -ForegroundColor Cyan

# 1. Check pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Error "pnpm is not installed. Please install pnpm (https://pnpm.io/installation) before running setup."
  exit 1
}

# 2. Setup apps/web/.env.local if missing
$envExample = Join-Path $root "apps\web\.env.example"
$envLocal = Join-Path $root "apps\web\.env.local"
if (-not (Test-Path $envLocal) -and (Test-Path $envExample)) {
  Copy-Item $envExample $envLocal
  Write-Host "Created apps/web/.env.local from .env.example. (Please edit with team keys if needed)." -ForegroundColor Yellow
} else {
  Write-Host "apps/web/.env.local already exists." -ForegroundColor Green
}

# 3. Install dependencies
Write-Host "Installing dependencies with pnpm..." -ForegroundColor Cyan
Set-Location $root
& pnpm install

# 4. Run typecheck & local tests
Write-Host "Running typecheck and test suites..." -ForegroundColor Cyan
& pnpm typecheck
& pnpm test
& pnpm test:database

Write-Host "`nSetup complete! You can now start the dev server with: pnpm dev" -ForegroundColor Green
