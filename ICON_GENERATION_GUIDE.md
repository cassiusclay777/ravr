# Icon Generation Guide for RAVR Audio Player

## Quick Start

### Option 1: Automated (Requires ImageMagick)

1. Install ImageMagick:
   ```powershell
   winget install ImageMagick.ImageMagick
   ```
   Or download from: https://imagemagick.org/script/download.php

2. Run the icon generation script:
   ```powershell
   .\scripts\generate-icons.ps1
   ```

### Option 2: Manual (Using Online Tools)

1. **Convert SVG to PNG**
   - Open `assets/icon-template.svg` in a web browser
   - Use online tool: https://svgtopng.com/
   - Export at 1024x1024 resolution
   - Save as `assets/icon-source.png`

2. **Convert PNG to ICO (Windows)**
   - Use online converter: https://www.icoconverter.com/
   - Upload the `icon-source.png` file
   - Select sizes: 16, 32, 48, 64, 128, 256
   - Download and save as:
     - `assets/icon.ico`
     - `electron/resources/icon.ico`

3. **Create PNG for Linux**
   - Simply copy `icon-source.png` to:
     - `assets/icon.png`
     - `electron/resources/icon.png`

4. **Create ICNS for macOS** (Optional)
   - Use online converter: https://cloudconvert.com/png-to-icns
   - Upload the `icon-source.png` file
   - Download and save as:
     - `assets/icon.icns`
     - `electron/resources/icon.icns`

## Required Icon Files

For the Windows installer to work properly, you need:

```
assets/
  ├── icon.ico          (Windows - multi-size)
  ├── icon.png          (Linux - 512x512 or larger)
  └── icon.icns         (macOS - optional)

electron/resources/
  ├── icon.ico          (Windows installer)
  ├── icon.png          (Linux installer)
  └── icon.icns         (macOS installer - optional)
```

## Icon Sizes for Windows ICO

The .ico file should contain these sizes:
- 16x16
- 32x32
- 48x48
- 64x64
- 128x128
- 256x256

## Design Tips

The template SVG (`assets/icon-template.svg`) includes:
- Modern gradient background (cyan → purple → pink)
- Audio speaker icon with sound waves
- Glassmorphism effect
- Professional typography

You can:
1. Edit the SVG in tools like Inkscape, Adobe Illustrator, or even a text editor
2. Change colors in the `<linearGradient>` definitions
3. Modify the speaker icon or add your own design
4. Adjust text, fonts, and positioning

## Troubleshooting

### ImageMagick Not Found
If you see "ImageMagick not found", install it using:
```powershell
winget install ImageMagick.ImageMagick
```
Then restart your terminal.

### Icon Not Showing in Installer
Make sure:
1. Icon files exist in both `assets/` and `electron/resources/` folders
2. File names match exactly (case-sensitive on some systems)
3. ICO files contain multiple sizes
4. Run `npm run build` after updating icons

### Build Fails Due to Missing Icons
If the build fails with icon-related errors:
1. Create at least placeholder PNG files
2. Use online tools to convert them to ICO format
3. Verify file paths in `electron-builder.config.js`

## Testing Your Icons

Before building the installer, test that icons are loading:

1. **In Development:**
   ```bash
   npm run dev:desktop
   ```
   Check the window icon in the taskbar

2. **After Build:**
   ```bash
   npm run pack:desktop:win
   ```
   Check `dist-electron/` folder for the installer
   Install the app and verify all icons appear correctly

## Alternative Tools

### Desktop Applications
- **GIMP** (Free): https://www.gimp.org/
- **Inkscape** (Free): https://inkscape.org/
- **Adobe Illustrator** (Paid)
- **Figma** (Free/Paid): https://www.figma.com/

### Online Converters
- **PNG to ICO**: https://www.icoconverter.com/
- **PNG to ICNS**: https://cloudconvert.com/png-to-icns
- **SVG to PNG**: https://svgtopng.com/
- **All-in-one**: https://iconverticons.com/online/

## Need Help?

If you encounter issues:
1. Check the `scripts/generate-icons.ps1` script for guidance
2. Verify all file paths in `electron-builder.config.js`
3. Ensure icon files are not corrupted (try opening them)
4. Check Electron Builder documentation: https://www.electron.build/configuration/win
