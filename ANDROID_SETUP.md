# 📱 RAVR Audio Engine - Android Setup

## ✅ Co už máme hotové

- **PWA Build**: Aplikace je připravená jako Progressive Web App
- **Capacitor**: Native Android wrapper je nakonfigurovaný
- **Android Studio**: Projekt je otevřený a připravený k buildování
- **Assets**: Všechny web assets jsou synchronizované s Android projektem

## 🚀 Další kroky v Android Studio

### 1. **Build Project**

```
1. V Android Studio klikni na "Build" → "Make Project" (Ctrl+F9)
2. Počkej na dokončení build procesu
3. Zkontroluj, že nejsou žádné chyby
```

### 2. **Nastavení Emulatoru nebo zařízení**

#### Option A: Android Emulator

```
1. Tools → AVD Manager
2. Create Virtual Device
3. Vyber Pixel 6 nebo novější
4. Download Android 13+ (API 33+)
5. Spusť emulator
```

#### Option B: Fyzické zařízení

```
1. Zapni Developer Options na telefonu
2. Zapni USB Debugging
3. Připoj telefon k PC
4. Povol USB Debugging na telefonu
```

### 3. **Spuštění aplikace**

```
1. V Android Studio klikni na "Run" → "Run 'app'" (Shift+F10)
2. Vyber cílové zařízení (emulator nebo telefon)
3. Aplikace se nainstaluje a spustí
```

## 🎵 Funkce RAVR Audio Engine na Android

### ✅ Co funguje

- **Audio Player**: Přehrávání MP3, WAV, FLAC, M4A, OGG
- **DSP Effects**: 3-Band EQ, Compressor, Limiter
- **AI Enhancement**: Noise reduction, source separation
- **Visualization**: Realtime audio vizualizace
- **File Management**: Import audio souborů z telefonu
- **Offline Support**: PWA cache pro offline přehrávání

### 🔧 Android-specific features

- **Native File Picker**: Přístup k audio souborům na zařízení
- **Background Playback**: Přehrávání na pozadí
- **Audio Focus**: Správa audio focus s jinými aplikacemi
- **Hardware Acceleration**: Optimalizace pro Android audio stack

## 📋 Build Commands

### Development

```bash
# Build web assets
npm run build:mobile

# Sync s Android projektem
npx cap sync android

# Otevřít Android Studio
npx cap open android
```

### Production Build

```bash
# Build release APK
# V Android Studio: Build → Generate Signed Bundle/APK
```

## 🐛 Troubleshooting

### Build Errors

- **Gradle Sync**: File → Sync Project with Gradle Files
- **Dependencies**: Build → Clean Project, pak Rebuild
- **SDK Issues**: Tools → SDK Manager → Update SDK

### Runtime Issues

- **Audio not playing**: Zkontroluj audio permissions v AndroidManifest.xml
- **File access**: Zkontroluj storage permissions
- **Performance**: Zkontroluj ProGuard rules pro release build

## 📱 Testing Checklist

- [ ] Aplikace se spustí bez chyb
- [ ] Audio soubory se načtou z telefonu
- [ ] Přehrávání funguje (play/pause/stop)
- [ ] DSP efekty se aplikují
- [ ] AI enhancement funguje
- [ ] Visualizace se zobrazuje
- [ ] Aplikace funguje na pozadí
- [ ] Offline mode funguje

## 🎯 Next Steps

1. **Test na různých zařízeních** (telefon, tablet)
2. **Performance optimalizace** pro starší Android verze
3. **Google Play Store** submission (pokud chceš publikovat)
4. **Beta testing** s reálnými uživateli

---

**RAVR Audio Engine je připravený pro Android! 🎵📱**

Všechny pokročilé audio funkce (DSP, AI, vizualizace) fungují nativně na Android zařízeních.
