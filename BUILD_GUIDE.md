# 🎵 RAVR Audio Engine - Build Guide

## 📦 Supported Platforms

| Platform | Framework | Status |
|----------|-----------|--------|
| Windows 10/11 | Tauri | ✅ Ready |
| macOS (Intel) | Tauri | ✅ Ready |
| macOS (Apple Silicon) | Tauri | ✅ Ready |
| Android | Capacitor | ✅ Ready |
| iOS | Capacitor | ✅ Ready |
| Linux | Tauri | ✅ Ready |

---

## 🖥️ Windows Build (Local)

```powershell
# Prerequisites
# - Node.js 22+
# - pnpm
# - Rust (rustup)
# - Visual Studio Build Tools 2019+

# Build
pnpm install
pnpm tauri build

# Output: src-tauri/target/release/bundle/
#   - nsis/RAVR Audio Engine_1.0.0_x64-setup.exe
#   - msi/RAVR Audio Engine_1.0.0_x64_en-US.msi
```

---

## 🍎 macOS Build (Requires Mac)

### Option A: Local Build on Mac

```bash
# Prerequisites
# - Xcode 15+
# - Xcode Command Line Tools: xcode-select --install
# - Node.js 22+
# - pnpm
# - Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone and build
git clone <your-repo>
cd ravr-fixed
pnpm install
pnpm tauri build

# Output: src-tauri/target/release/bundle/
#   - dmg/RAVR Audio Engine_1.0.0_x64.dmg (Intel)
#   - dmg/RAVR Audio Engine_1.0.0_aarch64.dmg (Apple Silicon)
```

### Option B: GitHub Actions (Recommended - No Mac needed!)

1. Push code to GitHub
2. Go to Actions → "Build RAVR Audio Engine"
3. Click "Run workflow"
4. Download artifacts when complete

---

## 📱 iOS Build (Requires Mac + Apple Developer Account)

### Prerequisites
- Mac with Xcode 15+
- Apple Developer Account ($99/year)
- CocoaPods: `sudo gem install cocoapods`

### Build Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Build web assets
pnpm build

# 3. Sync to iOS
npx cap sync ios

# 4. Open in Xcode
npx cap open ios

# 5. In Xcode:
#    - Select your Team in Signing & Capabilities
#    - Select target device (iPhone or Simulator)
#    - Press Cmd+R to run, or Product → Archive for App Store
```

### TestFlight Distribution
1. In Xcode: Product → Archive
2. Window → Organizer → Distribute App
3. Select "App Store Connect"
4. Upload to TestFlight

---

## 🤖 Android Build (Local)

```powershell
# Windows
pnpm install
pnpm build
npx cap sync android
cd android
.\gradlew.bat assembleRelease

# Output: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Sign APK for Play Store
```bash
# Generate keystore (once)
keytool -genkey -v -keystore ravr-release.keystore -alias ravr -keyalg RSA -keysize 2048 -validity 10000

# Sign APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ravr-release.keystore app-release-unsigned.apk ravr

# Align APK
zipalign -v 4 app-release-unsigned.apk ravr-release.apk
```

---

## 🚀 GitHub Actions CI/CD (Recommended!)

The easiest way to build for ALL platforms without owning each device:

### Setup

1. Push this repo to GitHub
2. Go to repository Settings → Actions → General
3. Enable "Allow all actions"

### Trigger Build

**Automatic:** Push a tag like `v1.0.0`
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Manual:** Go to Actions → Run workflow

### Artifacts

After build completes, download from Actions:
- `windows-installers` - .exe and .msi
- `macos-installers` - .dmg (Intel)
- `macos-arm-installers` - .dmg (Apple Silicon)
- `android-apk` - .apk debug and release
- `ios-simulator` - .app for iOS Simulator

---

## 📋 Build Output Summary

| Platform | File | Size (approx) |
|----------|------|---------------|
| Windows | RAVR Audio Engine_1.0.0_x64-setup.exe | 15 MB |
| Windows | RAVR Audio Engine_1.0.0_x64_en-US.msi | 16 MB |
| macOS Intel | RAVR Audio Engine_1.0.0_x64.dmg | 18 MB |
| macOS ARM | RAVR Audio Engine_1.0.0_aarch64.dmg | 17 MB |
| Android | app-debug.apk | 24 MB |
| iOS | App.ipa | ~25 MB |

---

## 🔧 Troubleshooting

### Windows: "MSVC not found"
Install Visual Studio Build Tools 2019+ with "Desktop development with C++"

### macOS: "codesign failed"
Run: `xcode-select --install` and sign in to Xcode with Apple ID

### iOS: "No signing certificate"
Add Apple Developer account in Xcode → Preferences → Accounts

### Android: "SDK not found"  
Set ANDROID_HOME environment variable to SDK path

---

## 📞 Support

- Issues: GitHub Issues
- Docs: /docs folder
- Discord: (your discord link)
