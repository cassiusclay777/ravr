# 📱 Android Connection Guide - RAVR Audio Engine

## ✅ ADB je nainstalovaný a funguje

**Status**: ADB 36.0.1 je připravený  
**Příkaz**: `adb devices` funguje

## 🔧 Nastavení Android zařízení

### 1. **Developer Options** (POVINNÉ)

```
1. Jdi do Settings → About Phone
2. Najdi "Build Number" (někdy "Build Version" nebo "Software Version")
3. Klepni na "Build Number" 7x rychle za sebou
4. Uvidíš zprávu "You are now a developer!"
5. Jdi zpět do Settings → Developer Options
```

### 2. **USB Debugging** (POVINNÉ)

```
1. V Developer Options zapni "USB Debugging"
2. Zapni "USB Debugging (Security Settings)" (pokud existuje)
3. Zapni "Install via USB" (pokud existuje)
4. Zapni "USB Debugging (Security Settings)" (pokud existuje)
```

### 3. **Připojení k PC**

```
1. Připoj Android zařízení k PC přes USB kabel
2. Na telefonu se objeví dialog "Allow USB Debugging?"
3. Zaškrtni "Always allow from this computer"
4. Klepni "OK"
```

## 🚀 Testování připojení

### Zkontroluj připojení

```bash
adb devices
```

**Očekávaný výstup:**

```
List of devices attached
ABC123456789    device
```

### Pokud nevidíš zařízení

```bash
# Restart ADB server
adb kill-server
adb start-server

# Zkontroluj znovu
adb devices
```

## 🎮 Spuštění scrcpy

### Základní spuštění

```bash
scrcpy --window-title "RAVR Audio Engine"
```

### S pokročilými nastaveními

```bash
scrcpy --window-title "RAVR Audio Engine" --bit-rate 2M --max-size 800
```

## 🎵 Testování RAVR Audio Engine

### 1. **Spuštění aplikace**

```bash
# V Android Studio: Run → Run 'app'
# Nebo nainstaluj APK přímo
adb install path/to/ravr-app.apk
```

### 2. **Testování audio funkcí**

- **Import souborů**: Otevři file manager, vyber audio soubory
- **Přehrávání**: Testuj play/pause/stop
- **DSP efekty**: Zkus EQ, compressor, limiter
- **AI enhancement**: Testuj noise reduction
- **Vizualizace**: Zkontroluj realtime audio vizualizaci

## 🐛 Troubleshooting

### "No devices found"

1. **Zkontroluj USB kabel** - musí být data kabel, ne jen nabíjecí
2. **Zkontroluj USB debugging** - musí být zapnutý
3. **Zkontroluj USB driver** - Windows může potřebovat driver
4. **Restart ADB**: `adb kill-server && adb start-server`

### "Device unauthorized"

1. **Na telefonu povol** "Always allow from this computer"
2. **Restart ADB**: `adb kill-server && adb start-server`
3. **Zkontroluj Developer Options** - musí být zapnuté

### "Connection failed"

1. **Zkontroluj USB kabel** - zkus jiný kabel
2. **Zkontroluj USB port** - zkus jiný port
3. **Restart telefon** a PC
4. **Zkontroluj antivirus** - může blokovat ADB

## 📱 RAVR Audio Engine Testing

### Testovací checklist

- [ ] Android zařízení je připojené (`adb devices` ukazuje zařízení)
- [ ] scrcpy se spustí bez chyb
- [ ] Vidíš obrazovku telefonu na PC
- [ ] Myš a klávesnice fungují
- [ ] RAVR aplikace se spustí
- [ ] Audio soubory se načtou
- [ ] Přehrávání funguje
- [ ] DSP efekty fungují
- [ ] AI enhancement funguje
- [ ] Performance je dobrá

---

**Připoj Android zařízení a spusť scrcpy! 🎮📱**

Jakmile uvidíš zařízení v `adb devices`, můžeš spustit scrcpy a testovat RAVR Audio Engine!
