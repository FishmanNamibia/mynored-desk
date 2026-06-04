# Phase 2: Fix variable shadowing - rename 'const user = await prisma.user.findUnique' to 'const dbUser'
$basePath = "c:\SIT_Project_Share\SIT_Project_Share\my_nsa_desk\apps\web\app\(protected)\dashboard\performance\api"

$files = Get-ChildItem -Path $basePath -Recurse -Filter "route.ts" | Where-Object {
    $lines = Get-Content $_.FullName
    ($lines | Select-String -Pattern "getAuthenticatedUser").Count -gt 0 -and
    ($lines | Select-String -Pattern "const user = await prisma\.user\.find").Count -gt 0
}

Write-Host "Found $($files.Count) files with variable shadowing to fix"

foreach ($file in $files) {
    $lines = Get-Content $file.FullName
    $content = $lines -join "`n"

    # Rename shadowed prisma user lookups
    $content = $content -replace "const user = await prisma\.user\.find", "const dbUser = await prisma.user.find"
    
    # Fix references to the renamed variable (only the ones that referred to the prisma result)
    # We need to be careful here - only fix references that come AFTER the dbUser assignment
    # For now, replace common patterns where dbUser is checked
    $content = $content -replace "if \(!user\)\s*\{", "if (!dbUser) {"
    $content = $content -replace "const isHCExecutive = user\.role", "const isHCExecutive = dbUser.role"
    $content = $content -replace "user\.department\?\.name", "dbUser.department?.name"
    $content = $content -replace "const isSGorAdmin = user\.role", "const isSGorAdmin = dbUser.role"
    $content = $content -replace "user\.role === 'EXECUTIVE'", "dbUser.role === 'EXECUTIVE'"
    $content = $content -replace "user\.role === 'SG'", "dbUser.role === 'SG'"
    $content = $content -replace "user\.role === 'ADMIN'", "dbUser.role === 'ADMIN'"
    $content = $content -replace "user\.role === 'DEPUTY_SG'", "dbUser.role === 'DEPUTY_SG'"

    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "Fixed: $($file.FullName -replace [regex]::Escape($basePath), '')"
}

Write-Host "`nDone!"
