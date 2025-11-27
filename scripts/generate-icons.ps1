# PowerShell script to generate app icons for Windows
# Requires ImageMagick or similar tool

Write-Host "Generating RAVR Audio Player Icons..." -ForegroundColor Cyan

# Create directories if they don't exist
$assetsDir = "assets"
$electronResourcesDir = "electron/resources"

if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir | Out-Null
}

if (-not (Test-Path $electronResourcesDir)) {
    New-Item -ItemType Directory -Path $electronResourcesDir -Force | Out-Null
}

# Check if ImageMagick is installed
$magickInstalled = Get-Command "magick" -ErrorAction SilentlyContinue

if (-not $magickInstalled) {
    Write-Host "ImageMagick not found. Attempting to use built-in PowerShell..." -ForegroundColor Yellow

    # Create a simple placeholder icon using PowerShell
    # This is a basic placeholder - for production, use proper icon design tools

    Write-Host "Creating placeholder icon files..." -ForegroundColor Yellow

    # For now, create empty placeholder files
    # In production, you should:
    # 1. Design a proper icon using tools like Inkscape, GIMP, or Adobe Illustrator
    # 2. Export to PNG at various sizes (16x16, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512, 1024x1024)
    # 3. Use a tool like ImageMagick or online converters to create .ico files

    $iconSizes = @(16, 32, 48, 64, 128, 256, 512, 1024)

    Write-Host ""
    Write-Host "Manual Icon Creation Required:" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create the following icon files manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Design an app icon (1024x1024 PNG recommended)" -ForegroundColor White
    Write-Host "2. Convert to Windows .ico format with multiple sizes:" -ForegroundColor White
    Write-Host "   - assets/icon.ico (Windows icon)" -ForegroundColor Cyan
    Write-Host "   - assets/icon.png (Linux icon)" -ForegroundColor Cyan
    Write-Host "   - assets/icon.icns (macOS icon)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Copy icons to electron/resources/:" -ForegroundColor White
    Write-Host "   - electron/resources/icon.ico" -ForegroundColor Cyan
    Write-Host "   - electron/resources/icon.png" -ForegroundColor Cyan
    Write-Host "   - electron/resources/icon.icns" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Recommended Online Tools:" -ForegroundColor Green
    Write-Host "- https://www.icoconverter.com/" -ForegroundColor Cyan
    Write-Host "- https://cloudconvert.com/png-to-ico" -ForegroundColor Cyan
    Write-Host "- https://iconverticons.com/online/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or install ImageMagick for automated conversion:" -ForegroundColor Green
    Write-Host "  winget install ImageMagick.ImageMagick" -ForegroundColor Cyan
    Write-Host "  # or download from: https://imagemagick.org/script/download.php" -ForegroundColor Cyan
    Write-Host ""

    # Create a simple SVG as a starting template
    $svgTemplate = @"
<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgb(34,211,238);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(168,85,247);stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background circle -->
  <circle cx="512" cy="512" r="480" fill="url(#grad1)"/>

  <!-- Speaker icon -->
  <g transform="translate(312, 312)">
    <!-- Speaker cone -->
    <path d="M 50 100 L 50 300 L 200 350 L 200 50 Z" fill="white" opacity="0.9"/>

    <!-- Sound waves -->
    <path d="M 250 150 Q 300 150 300 200 Q 300 250 250 250"
          stroke="white" stroke-width="20" fill="none" opacity="0.8"/>
    <path d="M 280 120 Q 360 120 360 200 Q 360 280 280 280"
          stroke="white" stroke-width="20" fill="none" opacity="0.6"/>
    <path d="M 310 90 Q 420 90 420 200 Q 420 310 310 310"
          stroke="white" stroke-width="20" fill="none" opacity="0.4"/>
  </g>

  <!-- RAVR Text -->
  <text x="512" y="850" font-family="Arial, sans-serif" font-size="120"
        font-weight="bold" text-anchor="middle" fill="white">RAVR</text>
</svg>
"@

    $svgTemplate | Out-File -FilePath "$assetsDir/icon-template.svg" -Encoding UTF8
    Write-Host "Created SVG template: $assetsDir/icon-template.svg" -ForegroundColor Green
    Write-Host "You can edit this SVG and convert it to other formats." -ForegroundColor Yellow

} else {
    Write-Host "ImageMagick found! Checking for source icon..." -ForegroundColor Green

    # Check if source icon exists
    $sourceIcon = "$assetsDir/icon-source.png"

    if (Test-Path $sourceIcon) {
        Write-Host "Converting icon to multiple formats..." -ForegroundColor Cyan

        # Convert to Windows .ico with multiple sizes
        magick convert $sourceIcon -define icon:auto-resize=256,128,64,48,32,16 "$assetsDir/icon.ico"
        magick convert $sourceIcon -define icon:auto-resize=256,128,64,48,32,16 "$electronResourcesDir/icon.ico"

        # Copy PNG icon
        Copy-Item $sourceIcon "$assetsDir/icon.png"
        Copy-Item $sourceIcon "$electronResourcesDir/icon.png"

        Write-Host "Icons generated successfully!" -ForegroundColor Green
        Write-Host "  - $assetsDir/icon.ico" -ForegroundColor Cyan
        Write-Host "  - $assetsDir/icon.png" -ForegroundColor Cyan
        Write-Host "  - $electronResourcesDir/icon.ico" -ForegroundColor Cyan
        Write-Host "  - $electronResourcesDir/icon.png" -ForegroundColor Cyan

    } else {
        Write-Host "Source icon not found: $sourceIcon" -ForegroundColor Red
        Write-Host "Please create a 1024x1024 PNG icon named 'icon-source.png' in the assets folder." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Icon generation process completed!" -ForegroundColor Green
