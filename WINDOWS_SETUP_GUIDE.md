# 🎵 RAVR Audio Player - Kompletní Průvodce pro Windows

## ✨ Co je nové

### Moderní UI s Glassmorphism Designem
- **Průhledné, rozmazané pozadí** s gradientovými animacemi
- **Plynulé animace** pomocí Framer Motion
- **Responsive design** - funguje na všech velikostech obrazovek
- **Tmavý režim** s elegantními barevnými přechody

### Vylepšené Audio Funkce
- **Moderní přehrávač** (`ModernPlayer.tsx`) s kompletními ovládacími prvky
- **Real-time vizualizace** - spektrum a waveform
- **Drag & Drop playlist** - snadná správa skladeb
- **Pokročilé DSP efekty** - EQ, kompresor, stereo width

### Windows Integrace
- **NSIS instalátor** - profesionální instalační program
- **File associations** - automatické otevření audio souborů
- **Start Menu & Desktop shortcuts** - snadný přístup
- **Portable verze** - bez nutnosti instalace

## 🚀 Rychlý Start

### Pro Uživatele (Instalace)

1. **Stáhněte instalátor**
   - Najděte soubor `RAVR Audio Player-1.0.0-x64.exe` v `dist-electron/` složce
   - Nebo stáhněte z releases na GitHubu

2. **Spusťte instalátor**
   - Dvakrát klikněte na `.exe` soubor
   - Vyberte instalační složku (výchozí: `C:\Users\<user>\AppData\Local\Programs\ravr-audio-player`)
   - Klikněte na "Install"

3. **Spusťte aplikaci**
   - Z Start Menu: "RAVR Audio Player"
   - Z Desktop: Dvojklik na ikonu
   - Nebo otevřete audio soubor - RAVR se automaticky spustí

### Pro Vývojáře (Build)

#### Jednoduchý způsob (Doporučeno)

```powershell
# Spusťte automatický build script
.\build-windows.ps1
```

#### Manuální build

```powershell
# 1. Instalace závislostí
npm install

# 2. Generování ikon (volitelné)
.\scripts\generate-icons.ps1

# 3. Build web aplikace
npm run build

# 4. Build Windows instalátoru
npm run pack:desktop:win
```

## 📁 Struktura Projektu

```
ravr-fixed/
├── src/
│   ├── components/
│   │   ├── ModernPlayer.tsx      # 🆕 Nový moderní přehrávač
│   │   ├── Player.tsx             # Původní přehrávač
│   │   ├── Playlist.tsx           # Playlist s drag & drop
│   │   ├── Visualizer.tsx         # Audio vizualizace
│   │   └── ...
│   ├── pages/
│   │   ├── ModernPlayerPage.tsx   # 🆕 Demo stránka moderního playeru
│   │   └── ...
│   ├── dsp/                       # DSP efekty
│   ├── hooks/                     # React hooks
│   └── styles/                    # CSS styly
│
├── electron.js                    # Electron main process (vylepšeno)
├── preload.js                     # Electron preload script
├── electron-builder.config.js     # Build konfigurace (aktualizováno)
│
├── assets/
│   ├── icon-template.svg          # 🆕 SVG šablona ikony
│   ├── icon.ico                   # Windows ikona
│   └── icon.png                   # Linux/Web ikona
│
├── scripts/
│   └── generate-icons.ps1         # 🆕 Generátor ikon
│
├── dist/                          # Build výstup (web)
├── dist-electron/                 # Build výstup (desktop)
│
├── build-windows.ps1              # 🆕 Automatický build script
├── BUILD_INSTRUCTIONS_WINDOWS.md  # 🆕 Detailní build instrukce
├── ICON_GENERATION_GUIDE.md       # 🆕 Průvodce vytvořením ikon
└── WINDOWS_SETUP_GUIDE.md         # Tento soubor
```

## 🎨 UI Komponenty

### ModernPlayer Component

Nový moderní přehrávač s glassmorphism designem.

**Umístění:** `src/components/ModernPlayer.tsx`

**Funkce:**
- ✨ Glassmorphism design s animacemi
- 🎵 Kompletní ovládací prvky (play, pause, seek, volume)
- 📊 Real-time audio vizualizace
- 📝 Playlist panel s drag & drop
- 🎛️ DSP ovládání (EQ, stereo width)
- 🔄 Shuffle a repeat módy
- 🔊 Volume ovládání s mute

**Použití:**
```tsx
import { ModernPlayer } from '@/components/ModernPlayer';

function App() {
  return <ModernPlayer />;
}
```

### Playlist Component

Playlist s drag & drop funkcionalitou.

**Umístění:** `src/components/Playlist.tsx`

**Funkce:**
- 📁 Drag & drop pro přidání souborů
- 🔄 Reorder skladeb drag & dropem
- 🗑️ Odstranění skladeb
- ▶️ Play/pause přímo z playlistu
- ⏱️ Zobrazení délky skladeb

## 🎛️ DSP Efekty

### Equalizer
- **3-pásmový EQ**: Low (Nízké), Mid (Střední), High (Vysoké)
- **Rozsah**: -12 dB až +12 dB
- **Krok**: 0.5 dB

### Kompresor
- **Threshold**: -60 dB až 0 dB
- **Ratio**: 1:1 až 20:1
- **Attack**: 0.001s až 1s
- **Release**: 0.01s až 1s
- **Knee**: 0 až 40
- **Makeup Gain**: 0 dB až 24 dB

### Stereo Width
- **Rozsah**: 0x (mono) až 2x (wide stereo)
- **Výchozí**: 1.0x (normální stereo)

## 🖥️ Windows Funkce

### File Associations

RAVR automaticky asociuje tyto audio formáty:
- `.mp3`, `.wav`, `.flac`, `.m4a`
- `.ogg`, `.aac`, `.wma`
- `.euph` (vlastní formát)

### System Integration

- **Start Menu**: RAVR Audio Player v programech
- **Desktop Shortcut**: Ikona na ploše
- **Context Menu**: "Otevřít s RAVR" v pravém tlačítku myši
- **Default Player**: Možnost nastavit jako výchozí přehrávač

### Instalátor

**NSIS Installer Features:**
- Výběr instalační složky
- Volba vytvoření desktop zkratky
- Volba vytvoření Start Menu zkratky
- Možnost spustit aplikaci po instalaci
- Čistá odinstalace

## 🔧 Konfigurace

### Electron Konfigurace

**Soubor:** `electron.js`

**Vylepšení:**
- ✅ Optimalizováno pro Windows
- ✅ Správné ikony pro všechny platformy
- ✅ Background color matching
- ✅ Frame zobrazení
- ✅ Menu bar konfigurace

### Build Konfigurace

**Soubor:** `electron-builder.config.js`

**Vylepšení:**
- ✅ NSIS installer nastavení
- ✅ Portable verze podpora
- ✅ File associations
- ✅ Code signing připraven
- ✅ Auto-update konfigurace

## 🎯 Build Skripty

### build-windows.ps1

Automatizovaný build script pro Windows.

**Parametry:**
```powershell
# Vyčistit před buildem
.\build-windows.ps1 -Clean

# Přeskočit web build
.\build-windows.ps1 -SkipBuild

# Přeskočit generování ikon
.\build-windows.ps1 -SkipIcons

# Build portable verze
.\build-windows.ps1 -Portable
```

**Co script dělá:**
1. ✓ Kontrola Node.js a npm
2. ✓ Instalace závislostí (pokud chybí)
3. ✓ Generování ikon (pokud chybí)
4. ✓ Build web aplikace
5. ✓ Build Electron aplikace
6. ✓ Vypsání výstupních souborů
7. ✓ Instrukce pro instalaci a distribuci

## 📦 Výstupní Soubory

Po úspěšném buildu najdete v `dist-electron/`:

```
dist-electron/
├── RAVR Audio Player-1.0.0-x64.exe      # NSIS instalátor (~150 MB)
├── RAVR Audio Player-1.0.0-x64.exe      # Portable verze (volitelné)
├── latest.yml                            # Auto-update metadata
└── ...
```

## 🐛 Řešení Problémů

### Build Problémy

#### "electron-builder failed"
```powershell
# Vyčistěte a reinstalujte
rm -r node_modules
rm package-lock.json
npm install
```

#### "Missing icons"
```powershell
# Vygenerujte ikony
.\scripts\generate-icons.ps1
```

#### "Cannot find module"
```powershell
# Reinstalujte závislosti
npm install

# Nebo vyčistěte cache
npm cache clean --force
npm install
```

### Runtime Problémy

#### "White screen" nebo "Failed to load"
1. Zkontrolujte, že `dist/` folder existuje
2. Spusťte `npm run build` před `pack:desktop:win`
3. Zkontrolujte konzoli pro chyby (F12 in dev mode)

#### "Audio nefunguje"
1. Zkontrolujte audio zařízení (Windows Sound Settings)
2. Ujistěte se, že soubor je podporovaný formát
3. Zkuste restartovat aplikaci
4. Zkontrolujte volume v aplikaci i v systému

#### "Playlist nepřijímá soubory"
1. Ujistěte se, že soubory jsou audio formáty
2. Zkuste přidat soubory tlačítkem "Browse files"
3. Zkontrolujte soubor není uzamčený jiným programem

## 🚀 Performance Tipy

### Pro Vývojáře

- Použijte `npm run dev:desktop` pro development
- Aktivujte React DevTools pro debugging
- Použijte Chrome DevTools (F12) pro profiling

### Pro Uživatele

- Zavřete nepotřebné aplikace pro lepší audio performance
- Snižte vizualizaci pokud máte starší hardware
- Použijte SSD pro rychlejší načítání velkých souborů

## 📚 Další Dokumentace

- **BUILD_INSTRUCTIONS_WINDOWS.md** - Detailní build instrukce
- **ICON_GENERATION_GUIDE.md** - Průvodce vytvořením ikon
- **README.md** - Obecná dokumentace projektu
- **CHANGELOG.md** - Seznam změn

## 🎓 Tutoriály

### Přidání Vlastního DSP Efektu

1. Vytvořte nový soubor v `src/dsp/MyEffect.ts`
2. Implementujte Audio Worklet nebo Web Audio API node
3. Přidejte UI controls v `ModernPlayer.tsx`
4. Registrujte efekt v audio pipeline

### Customizace Tématu

Upravte barvy v `src/index.css`:
```css
:root {
  --ravr-primary: #22d3ee;
  --ravr-secondary: #a855f7;
  --ravr-accent: #ec4899;
}
```

### Přidání Nové Vizualizace

1. Vytvořte komponentu v `src/components/visualizers/`
2. Použijte `analyzerNode` pro získání audio dat
3. Použijte Canvas nebo WebGL pro rendering
4. Přidejte do `ModernPlayer` nebo `VisualizationPanel`

## 🤝 Přispívání

Chcete přispět? Skvělé!

1. Forkněte repozitář
2. Vytvořte feature branch (`git checkout -b feature/AmazingFeature`)
3. Commitněte změny (`git commit -m 'Add some AmazingFeature'`)
4. Pushněte do branch (`git push origin feature/AmazingFeature`)
5. Otevřete Pull Request

## 📄 Licence

Tento projekt je licencován pod MIT licencí.

## 👥 Autoři

- **Cashi** - Původní autor
- **Community Contributors** - Děkujeme všem přispěvatelům!

## 🙏 Poděkování

- Electron.js team
- React team
- Web Audio API contributors
- Open source community

---

**Enjoy RAVR Audio Player! 🎵✨**

Pokud máte dotazy nebo problémy, otevřete issue na GitHubu.

Made with ❤️ by the RAVR Team
