# 🚀 Rychlý Start - RAVR Audio Player pro Windows

## 📋 Co potřebujete

1. **Node.js 18+** - https://nodejs.org/
2. **Windows 7 SP1 nebo novější**
3. **5 GB volného místa** (pro build)

## ⚡ 3 Kroky k Instalaci

### Krok 1: Nainstalujte závislosti
```powershell
npm install
```

### Krok 2: Build aplikaci
```powershell
.\build-windows.ps1
```

### Krok 3: Nainstalujte
```powershell
# Najděte instalátor v dist-electron/
cd dist-electron
# Dvakrát klikněte na RAVR Audio Player-1.0.0-x64.exe
```

## 🎮 Vyzkoušejte bez instalace

### Development Mode (Web)
```powershell
npm run dev
# Otevře se http://localhost:5174
```

### Development Mode (Desktop)
```powershell
npm run dev:desktop
# Spustí Electron aplikaci
```

## 🎨 Co je nové?

### ✨ Moderní UI
- Glassmorphism design s průhledným pozadím
- Gradientové animace (cyan → purple → pink)
- Plynulé animace a transitions

### 🎵 Funkce
- Drag & drop playlist
- Real-time audio vizualizace
- 3-band equalizer
- Kompresor a DSP efekty
- Shuffle & repeat módy

### 🖥️ Windows
- Professional NSIS installer
- Start Menu & Desktop shortcuts
- File associations (MP3, WAV, FLAC...)
- Portable version

## 📖 Dokumentace

- **WINDOWS_SETUP_GUIDE.md** - Kompletní průvodce
- **BUILD_INSTRUCTIONS_WINDOWS.md** - Detailní build instrukce
- **ICON_GENERATION_GUIDE.md** - Ikony guide
- **UPGRADE_SUMMARY.md** - Co bylo přidáno

## 🆘 Pomoc

### Build selhává?
```powershell
# Vyčistěte a zkuste znovu
rm -r node_modules
npm install
.\build-windows.ps1 -Clean
```

### Chybějící ikony?
```powershell
.\scripts\generate-icons.ps1
```

### Potřebujete pomoc?
- Přečtěte si WINDOWS_SETUP_GUIDE.md
- Otevřete issue na GitHubu

## 🎉 To je vše!

Užijte si RAVR Audio Player! 🎵✨

---

**Rychlé odkazy:**
- [Kompletní Setup Guide](WINDOWS_SETUP_GUIDE.md)
- [Build Instructions](BUILD_INSTRUCTIONS_WINDOWS.md)
- [Upgrade Summary](UPGRADE_SUMMARY.md)
