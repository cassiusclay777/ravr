# RAVR Audio Player - Windows Build Script
# Automated build process for Windows .exe installer

param(
    [switch]$Clean,
    [switch]$SkipBuild,
    [switch]$SkipIcons,
    [switch]$Portable
)

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  RAVR Audio Player Builder" -ForegroundColor Cyan
Write-Host "  Windows Edition" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if command exists
function Test-Command($command) {
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'stop'
    try {
        if (Get-Command $command) { return $true }
    } catch {
        return $false
    } finally {
        $ErrorActionPreference = $oldPreference
    }
}

# Check Node.js
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

$nodeVersion = node --version
Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green

# Check npm
if (-not (Test-Command "npm")) {
    Write-Host "❌ npm is not installed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ npm found" -ForegroundColor Green

# Clean if requested
if ($Clean) {
    Write-Host ""
    Write-Host "Cleaning build directories..." -ForegroundColor Yellow

    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
        Write-Host "  ✓ Removed dist/" -ForegroundColor Green
    }

    if (Test-Path "dist-electron") {
        Remove-Item -Recurse -Force "dist-electron"
        Write-Host "  ✓ Removed dist-electron/" -ForegroundColor Green
    }

    if (Test-Path "node_modules") {
        Write-Host "  Removing node_modules/ (this may take a while)..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force "node_modules"
        Write-Host "  ✓ Removed node_modules/" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
}

# Check for dependencies
Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed!" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ Dependencies OK" -ForegroundColor Green

# Generate icons if not skipped
if (-not $SkipIcons) {
    Write-Host ""
    Write-Host "Checking icons..." -ForegroundColor Yellow

    $iconExists = (Test-Path "assets/icon.ico") -and (Test-Path "assets/icon.png")

    if (-not $iconExists) {
        Write-Host "  Icons not found, attempting to generate..." -ForegroundColor Yellow

        if (Test-Path "scripts/generate-icons.ps1") {
            & ".\scripts\generate-icons.ps1"
        } else {
            Write-Host "  ⚠️  Icon generator script not found" -ForegroundColor Yellow
            Write-Host "  Please create icons manually. See ICON_GENERATION_GUIDE.md" -ForegroundColor Yellow
            Write-Host ""
            $continue = Read-Host "Continue without icons? (y/n)"
            if ($continue -ne "y") {
                exit 0
            }
        }
    } else {
        Write-Host "✓ Icons found" -ForegroundColor Green
    }
}

# Build web application
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "Building web application..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Web build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Web build completed" -ForegroundColor Green
}

# Build Electron application
Write-Host ""
Write-Host "Building Electron application for Windows..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray

if ($Portable) {
    Write-Host "Building portable version..." -ForegroundColor Cyan
}

npm run pack:desktop:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Electron build failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  1. Missing icons - run: .\scripts\generate-icons.ps1" -ForegroundColor White
    Write-Host "  2. Missing dist folder - run: npm run build" -ForegroundColor White
    Write-Host "  3. Node modules corrupted - run: rm -r node_modules && npm install" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✓ Electron build completed" -ForegroundColor Green

# List output files
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Build Completed Successfully!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Output files:" -ForegroundColor Yellow
Write-Host ""

if (Test-Path "dist-electron") {
    $files = Get-ChildItem "dist-electron" -Filter "*.exe"
    foreach ($file in $files) {
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        Write-Host "  📦 $($file.Name)" -ForegroundColor Green
        Write-Host "     Size: $sizeMB MB" -ForegroundColor Gray
        Write-Host "     Path: $($file.FullName)" -ForegroundColor Gray
        Write-Host ""
    }

    # Check for other installer formats
    $otherFiles = Get-ChildItem "dist-electron" -Include "*.msi", "*.zip", "*.7z", "*.nupkg" -Recurse
    if ($otherFiles.Count -gt 0) {
        Write-Host "  Other formats:" -ForegroundColor Yellow
        foreach ($file in $otherFiles) {
            Write-Host "  📁 $($file.Name)" -ForegroundColor Cyan
            Write-Host ""
        }
    }
} else {
    Write-Host "❌ dist-electron directory not found!" -ForegroundColor Red
}

# Installation instructions
Write-Host "Installation:" -ForegroundColor Yellow
Write-Host "  1. Navigate to the dist-electron folder" -ForegroundColor White
Write-Host "  2. Double-click the .exe installer" -ForegroundColor White
Write-Host "  3. Follow the installation wizard" -ForegroundColor White
Write-Host "  4. Launch RAVR Audio Player from Start Menu" -ForegroundColor White
Write-Host ""

# Distribution instructions
Write-Host "Distribution:" -ForegroundColor Yellow
Write-Host "  • Share the .exe file with users" -ForegroundColor White
Write-Host "  • Minimum Windows version: Windows 7 SP1 or later" -ForegroundColor White
Write-Host "  • Installer size: ~100-200 MB (includes Chromium)" -ForegroundColor White
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  • Test the installer on a clean Windows machine" -ForegroundColor White
Write-Host "  • Consider code signing for production release" -ForegroundColor White
Write-Host "  • Set up auto-update server (optional)" -ForegroundColor White
Write-Host ""

Write-Host "Enjoy RAVR Audio Player! 🎵✨" -ForegroundColor Magenta
Write-Host ""
