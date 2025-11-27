# 🧼 Clean-up script for ravr-fixed project
Write-Host "`n🔧 Starting clean-up of ravr-fixed..." -ForegroundColor Cyan

# Remove Python cache folders
$foldersToRemove = @(
    "$PSScriptRoot\__pycache__",
    "$PSScriptRoot\.mypy_cache",
    "$PSScriptRoot\.venv311"
)

foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Remove-Item -Recurse -Force $folder
        Write-Host "✅ Removed folder: $folder" -ForegroundColor Yellow
    }
}

# Remove all .pyc files
$pycFiles = Get-ChildItem -Path $PSScriptRoot -Recurse -Include *.pyc
foreach ($file in $pycFiles) {
    Remove-Item -Force $file.FullName
    Write-Host "🗑️ Removed .pyc file: $($file.FullName)" -ForegroundColor DarkGray
}

# Remove .DS_Store if copied from macOS
$dsStore = Get-ChildItem -Path $PSScriptRoot -Recurse -Include .DS_Store
foreach ($file in $dsStore) {
    Remove-Item -Force $file.FullName
    Write-Host "🧽 Removed .DS_Store: $($file.FullName)" -ForegroundColor Magenta
}

Write-Host "`n✨ Clean-up complete!" -ForegroundColor Green