# PowerShell script to create admin user
# Usage: .\scripts\create-admin-user.ps1

Write-Host "Creating admin user..." -ForegroundColor Cyan
Write-Host ""

# Read the SQL file
$sqlFile = Join-Path $PSScriptRoot "create-admin-user.sql"
$sqlContent = Get-Content $sqlFile -Raw

# Execute via Supabase CLI
Write-Host "Executing SQL via Supabase CLI..." -ForegroundColor Yellow
supabase db execute "$sqlContent"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Admin user created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Remember to change the default password after first login!" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Failed to create admin user. Check the error above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Copy the SQL from scripts/create-admin-user.sql" -ForegroundColor Yellow
    Write-Host "and run it in the Supabase SQL Editor (Dashboard → SQL Editor)" -ForegroundColor Yellow
}

