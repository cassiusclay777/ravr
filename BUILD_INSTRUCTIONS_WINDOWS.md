# RAVR Audio Player - Windows Build Instructions

## Rychlý Start 🚀

### Předpoklady

Ujistěte se, že máte nainstalováno:

1. **Node.js** (verze 18 nebo vyšší)
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
   Nebo stáhnout z: https://nodejs.org/

2. **Git** (pro klonování repozitáře)
   ```powershell
   winget install Git.Git
   ```

3. **Visual Studio Build Tools** (pro native moduly)
   ```powershell
   winget install Microsoft.VisualStudio.2022.BuildTools
   ```
   Nebo stáhnout z: https://visualstudio.microsoft.com/downloads/

## Krok za Krokem

### 1. Instalace Závislostí

```powershell
# Přejděte do složky projektu
cd C:\ravr-fixed

# Nainstalujte npm balíčky
npm install

# Nebo pokud používáte pnpm
pnpm install
```

### 2. Generování Ikon (Doporučeno)

**Možnost A: Automaticky (vyžaduje ImageMagick)**
```powershell
# Instalace ImageMagick
winget install ImageMagick.ImageMagick

# Spuštění generátoru ikon
.\scripts\generate-icons.ps1
```

**Možnost B: Manuálně**
Následujte instrukce v `ICON_GENERATION_GUIDE.md`

### 3. Vývoj a Testování

```powershell
# Webová verze (dev server)
npm run dev

# Desktop verze (Electron)
npm run dev:desktop

# Mobilní verze (s host přístupem)
npm run dev:mobile
```

### 4. Build Produkční Verze

**Webová aplikace:**
```powershell
npm run build
```

**Windows Desktop Aplikace (.exe instalátor):**
```powershell
# Build pouze web části
npm run build

# Build Electron aplikace pro Windows
npm run pack:desktop:win
```

Výsledné soubory najdete v:
- `dist-electron/` - Instalační soubory
- `dist-electron/RAVR Audio Player-1.0.0-x64.exe` - NSIS instalátor
- `dist-electron/RAVR Audio Player-1.0.0-x64.exe` - Portable verze

### 5. Instalace

1. Najděte instalátor v `dist-electron/`
2. Dvakrát klikněte na `.exe` soubor
3. Postupujte podle pokynů v instalátoru
4. Po instalaci spusťte "RAVR Audio Player" z Start menu nebo Desktop

## Struktura Projektu

```
ravr-fixed/
├── src/                    # Zdrojové soubory React aplikace
│   ├── components/         # React komponenty
│   │   ├── ModernPlayer.tsx    # Nový moderní přehrávač
│   │   ├── Player.tsx          # Původní přehrávač
│   │   ├── Playlist.tsx        # Playlist s drag & drop
│   │   └── Visualizer.tsx      # Audio vizualizace
│   ├── dsp/               # DSP efekty a audio processing
│   ├── hooks/             # React hooks
│   └── pages/             # Stránky aplikace
├── electron.js            # Electron main process
├── preload.js             # Electron preload script
├── assets/                # Ikony a obrázky
├── dist/                  # Build výstup (web)
├── dist-electron/         # Build výstup (desktop)
└── package.json          # NPM konfigurace
```

## Dostupné Skripty

```powershell
# Vývoj
npm run dev                 # Vite dev server (port 5174)
npm run dev:desktop         # Electron + Vite (port 5175)
npm run dev:mobile          # Dev server s host přístupem

# Build
npm run build               # Build web aplikace
npm run build:mobile        # Build pro mobile (Capacitor)
npm run pack:desktop:win    # Build Windows .exe
npm run pack:desktop:mac    # Build macOS .dmg
npm run pack:desktop:linux  # Build Linux AppImage/deb

# Testování
npm run preview             # Preview produkčního buildu
npm test                    # Spustit testy
```

## Funkce RAVR Audio Player

### ✨ Moderní UI
- **Glassmorphism design** - Průhledné, rozmazané pozadí
- **Gradient animace** - Plynulé barevné přechody
- **Framer Motion animace** - Hladké interakce
- **Responsive design** - Funguje na všech velikostech obrazovek

### 🎵 Audio Funkce
- **Podpora formátů**: MP3, WAV, FLAC, M4A, OGG, AAC, WMA, EUPH
- **Pokročilé ovládání**: Play, pause, seek, volume, repeat, shuffle
- **Playlist**: Drag & drop, reorder, remove tracks
- **Audio vizualizace**: Spektrum, waveform, 3D vizualizace

### 🎛️ DSP Efekty
- **Equalizer**: 3-band (Low, Mid, High) s rozsahem ±12 dB
- **Kompresor**: Threshold, ratio, attack, release, knee, makeup gain
- **Stereo Width**: Úprava stereo obrazu (0-2x)
- **Presety**: Uložení a načítání vlastních nastavení

### 🖥️ Windows Funkce
- **File associations**: Automatické otevření audio souborů
- **System integration**: Start menu, desktop zkratky
- **NSIS installer**: Profesionální instalační program
- **Auto-update**: Připraveno pro automatické aktualizace
- **Portable mode**: Verze bez instalace

## Řešení Problémů

### Build Selhává

**Problém**: `electron-builder` selhává
```powershell
# Vyčistěte cache a reinstalujte
rm -r node_modules
rm package-lock.json
npm install
```

**Problém**: Chybějící ikony
```powershell
# Vytvořte placeholder ikony
.\scripts\generate-icons.ps1
```

### Aplikace se Nespustí

**Problém**: Bílá obrazovka nebo chyba při načítání
- Zkontrolujte konzoli pro chyby (F12)
- Ujistěte se, že `dist/` složka existuje
- Spusťte `npm run build` před `pack:desktop:win`

**Problém**: Audio nefunguje
- Zkontrolujte, zda máte nastavené výchozí audio zařízení
- Ujistěte se, že soubor je v podporovaném formátu
- Zkuste restartovat aplikaci

### Performance Problémy

**Problém**: Pomalá aplikace nebo vysoké využití CPU
- Zakažte pokročilé vizualizace v nastavení
- Snižte kvalitu DSP efektů
- Zavřete ostatní aplikace

## Vylepšení a Customizace

### Změna Barvy Tématu

Upravte `src/index.css`:
```css
:root {
  --ravr-primary: #22d3ee;  /* Cyan */
  --ravr-secondary: #a855f7; /* Purple */
  --ravr-accent: #ec4899;    /* Pink */
}
```

### Přidání Vlastního DSP Efektu

1. Vytvořte nový soubor v `src/dsp/`
2. Implementujte Audio Worklet nebo Web Audio API nod
3. Přidejte UI ovládání v `ModernPlayer.tsx`
4. Registrujte efekt v audio pipeline

### Změna Ikon

1. Upravte `assets/icon-template.svg`
2. Spusťte `.\scripts\generate-icons.ps1`
3. Nebo nahraďte soubory manuálně podle `ICON_GENERATION_GUIDE.md`

## Podpora

### Dokumentace
- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron.build/)
- [React Documentation](https://react.dev/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### Community
- [GitHub Issues](https://github.com/your-username/ravr-fixed/issues)
- [Discussions](https://github.com/your-username/ravr-fixed/discussions)

## Licence

Tento projekt je licencován pod MIT licencí.

## Autoři

- **Cashi** - Původní autor
- **Přispěvatelé** - Seznam přispěvatelů najdete v [CONTRIBUTORS.md](CONTRIBUTORS.md)

---

**Užijte si RAVR Audio Player! 🎵✨**

Pokud máte otázky nebo problémy, neváhejte otevřít issue na GitHubu.
