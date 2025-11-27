# RAVR Android Deployment Script
# PowerShell script pro automatické build a deploy

Write-Host "🚀 RAVR Android Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed!" -ForegroundColor Red
        exit 1
    }
}

# Build web assets
Write-Host "🔨 Building web assets..." -ForegroundColor Yellow
npm run build:mobile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Sync with Android
Write-Host "🔄 Syncing with Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Sync successful!" -ForegroundColor Green

# Ask if user wants to open Android Studio
Write-Host ""
$openStudio = Read-Host "📱 Open Android Studio? (Y/n)"
if ($openStudio -ne "n" -and $openStudio -ne "N") {
    Write-Host "🚀 Opening Android Studio..." -ForegroundColor Yellow
    npx cap open android
}

Write-Host ""
Write-Host "✨ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. In Android Studio, click Run (Shift+F10)" -ForegroundColor White
Write-Host "2. Select your device (emulator or phone)" -ForegroundColor White
Write-Host "3. Test all Android features:" -ForegroundColor White
Write-Host "   - Gestures (swipe, double tap, long press)" -ForegroundColor Gray
Write-Host "   - Voice control (tap mic, say command)" -ForegroundColor Gray
Write-Host "   - Widget (long press home screen)" -ForegroundColor Gray
Write-Host "   - Camera scanner (scan CD cover)" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentation: ANDROID_QUICKSTART.md" -ForegroundColor Cyan
Write-Host ""
