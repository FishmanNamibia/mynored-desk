# Git Workflow Script for PMS Integration
# Run this script step by step to safely merge team changes

Write-Host "=== PMS Integration Git Workflow ===" -ForegroundColor Green

Write-Host "`n1. Checking current status..." -ForegroundColor Yellow
git status

Write-Host "`n2. Fetching latest changes from remote..." -ForegroundColor Yellow
git fetch origin

Write-Host "`n3. Showing commits from other developers..." -ForegroundColor Yellow
Write-Host "Commits by others (not yet merged):" -ForegroundColor Cyan
git log HEAD..origin/main --oneline --author-date-order

Write-Host "`nYour local commits:" -ForegroundColor Cyan  
git log origin/main..HEAD --oneline --author-date-order

Write-Host "`n4. Checking for potential file conflicts..." -ForegroundColor Yellow
Write-Host "Files that might have conflicts:" -ForegroundColor Red
git diff HEAD origin/main --name-only

Write-Host "`n5. Files you've modified locally:" -ForegroundColor Yellow
git diff --name-only HEAD

Write-Host "`n=== Next Steps ===" -ForegroundColor Green
Write-Host "If you see conflicts in critical files like:" -ForegroundColor Yellow
Write-Host "- apps/api/package.json (NestJS dependencies)" -ForegroundColor Red
Write-Host "- apps/api/src/app.module.ts (module imports)" -ForegroundColor Red  
Write-Host "- apps/api/src/modules/auth/* (authentication)" -ForegroundColor Red
Write-Host "- Any performance-related files" -ForegroundColor Red
Write-Host ""
Write-Host "Create a backup branch first:" -ForegroundColor Cyan
Write-Host "git checkout -b backup-pms-$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
Write-Host "git add ."
Write-Host "git commit -m 'Backup: PMS integration before merge'"
Write-Host "git checkout main"
Write-Host ""
Write-Host "Then merge carefully:" -ForegroundColor Cyan
Write-Host "git pull origin main --rebase"