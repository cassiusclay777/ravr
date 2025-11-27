# 🚀 Android Features - Quick Start Guide

## ⚡ 5-Minute Setup

### Krok 1: Wrap your app (1 minuta)

Otevřete `src/main.tsx` a obalte aplikaci:

```tsx
import { EnhancedApp } from './components/EnhancedApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <EnhancedApp>
        <App />
      </EnhancedApp>
    </BrowserRouter>
  </React.StrictMode>
);
```

**Hotovo!** Všechny Android funkce jsou nyní aktivní! 🎉

---

### Krok 2: Build a Deploy (3 minuty)

```bash
# 1. Build web assets
npm run build:mobile

# 2. Sync s Android
npx cap sync android

# 3. Otevřít v Android Studio
npx cap open android

# 4. V Android Studio: Run (Shift+F10)
```

---

### Krok 3: Test Features (1 minuta)

Na telefonu/emulátoru testuj:

✅ **Gestures**: Swipe left/right pro skladby
✅ **Voice**: Tap mikrofon, řekni "přehrát"
✅ **Widget**: Dlouhý tap na home screen → Widgety → RAVR
✅ **Camera**: Tap settings → Skenovat CD/Vinyl

---

## 🎯 Co získáváš

### 1. 📱 Android UX
- Extra velká tlačítka (56x56px)
- Swipe gestures pro ovládání
- Haptic feedback
- Touch-optimized interface

### 2. 📲 Home Screen Widget
- Live track info
- Play/Pause/Next/Previous
- Auto-sync se stavem aplikace
- Material Design

### 3. 🎤 Voice Control
- České i anglické příkazy
- Real-time rozpoznání
- Visual feedback
- Hands-free ovládání

### 4. 📷 Camera Scanner
- Skenování CD/vinyl obalů
- OCR text recognition
- Auto-metadata extraction
- Cover art import

---

## 🔧 Customizace (optional)

### Vlastní integrace bez EnhancedApp:

```tsx
import { AndroidIntegration } from './components/AndroidIntegration';

function MyCustomApp() {
  return (
    <>
      <MyPlayer />
      
      <AndroidIntegration
        isPlaying={isPlaying}
        volume={volume}
        currentTime={currentTime}
        duration={duration}
        trackTitle="My Song"
        trackArtist="My Artist"
        onPlayPause={togglePlay}
        onStop={stopAudio}
        // ... další props
      />
    </>
  );
}
```

### Jednotlivé komponenty:

```tsx
// Jen gestures
import { useAndroidGestures } from './hooks/useAndroidGestures';

useAndroidGestures({
  onSwipeLeft: () => console.log('Next!'),
  onSwipeRight: () => console.log('Previous!'),
});

// Jen voice control
import { VoiceControl } from './components/VoiceControl';

<VoiceControl
  commands={myCommands}
  onCommandRecognized={(cmd) => console.log(cmd)}
/>

// Jen camera scanner
import { CameraScannerButton } from './components/CameraScanner';

<CameraScannerButton
  onMetadataDetected={(meta) => console.log(meta)}
/>
```

---

## 📱 Widget Setup (pro uživatele)

1. **Dlouhý tap** na domovskou obrazovku Android
2. Vybrat **"Widgety"** nebo **"Widgets"**
3. Najít **"RAVR Audio"**
4. **Přetáhnout** na požadované místo
5. Widget se **automaticky synchronizuje** s aplikací

---

## 🎤 Voice Commands

### Čeština:
- "Přehrát" / "Spustit" / "Pusť"
- "Pauza" / "Pozastav"
- "Stop" / "Zastavit"
- "Další" / "Další skladba"
- "Předchozí" / "Zpět"
- "Hlasitěji" / "Nahlas"
- "Tišeji" / "Potichu"
- "Ztlumit" / "Ticho"

### English:
- "Play" / "Start"
- "Pause" / "Stop"
- "Next" / "Skip"
- "Previous" / "Back"
- "Volume up" / "Louder"
- "Volume down" / "Quieter"
- "Mute" / "Silence"

---

## 👆 Gestures

| Gesto | Akce |
|-------|------|
| 👈 Swipe vlevo | Další skladba |
| 👉 Swipe vpravo | Předchozí skladba |
| 👆 Swipe nahoru | Zobrazit hlasitost |
| 👇 Swipe dolů | Skrýt hlasitost |
| 👆👆 Double tap | Play/Pause |
| 👆⏱️ Long press | Stop |
| 🤏 Pinch | Zoom (pro vizualizace) |

---

## 🐛 Troubleshooting

### Widget se nezobrazuje?
```bash
# Re-sync Android projekt
npx cap sync android
# Rebuild v Android Studio
```

### Voice control nefunguje?
- Zkontroluj oprávnění mikrofonu v nastavení
- Android 6.0+ vyžaduje runtime permissions
- Test v Chrome: chrome://flags enable Web Speech API

### Camera nefunguje?
- Zkontroluj oprávnění kamery
- Použij HTTPS nebo localhost
- Camera API vyžaduje secure context

### Gestures nereagují?
- Ujisti se, že komponenta je mounted
- Check touch-action CSS properties
- Test na fyzickém zařízení (ne emulator)

---

## 📊 Build Checklist

Před nasazením do produkce:

- [ ] Build mobile assets: `npm run build:mobile`
- [ ] Sync Android: `npx cap sync android`
- [ ] Test na fyzickém zařízení
- [ ] Test všechny gestures
- [ ] Test voice commands (čeština i angličtina)
- [ ] Test widget na home screen
- [ ] Test camera scanner
- [ ] Zkontroluj oprávnění v nastavení
- [ ] Test offline mode
- [ ] Performance test (FPS, memory)

---

## 🎉 Výsledek

Po dokončení těchto kroků máš plně funkční Android aplikaci s:

✅ **Professional UX** - Větší tlačítka a gestures
✅ **Home Screen Widget** - Live updates
✅ **Voice Control** - Hands-free ovládání
✅ **Camera Scanner** - CD/vinyl rozpoznávání

**Total setup time: ~5 minut** ⚡

**Všechno funguje out-of-the-box!** 📦

---

## 🚀 Next Steps

1. **Testuj na telefonu** - Fyzické zařízení je nejlepší
2. **Customizuj UI** - Přizpůsob barvy a styly
3. **Přidej OCR** - Integrace Tesseract.js pro lepší rozpoznávání
4. **Google Play** - Publikuj aplikaci

---

## 📞 Support

Máš-li problémy:
1. Zkontroluj `ANDROID_FEATURES.md` pro detailní dokumentaci
2. Zkontroluj Android Studio Logcat pro error messages
3. Test na různých zařízeních

**Happy Android Development! 🎵📱✨**
