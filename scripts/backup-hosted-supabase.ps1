param(
  [string]$OutputDirectory = "backups"
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($env:SUPABASE_DB_URL)) {
  throw 'SUPABASE_DB_URL is required. Set it only in this PowerShell session; never commit it.'
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw 'pg_dump is required. Install PostgreSQL client tools before running this backup.'
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = Join-Path $OutputDirectory "aniflix-hosted-$timestamp.dump"

& pg_dump --format=custom --no-owner --no-privileges --file=$backupPath $env:SUPABASE_DB_URL
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed; no migration should be attempted.' }

Write-Host "Backup created: $backupPath"
Write-Host 'Verify this backup by restoring it to an isolated Docker Supabase environment before changing the app configuration.'
