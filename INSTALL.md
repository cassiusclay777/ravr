# 🚀 RAVR Audio Engine v2.0 - Instalační Průvodce

## ⚡ Rychlá Instalace

```bash
# 1. Nainstaluj dependencies
npm install

# 2. Spusť optimalizaci  
powershell -ExecutionPolicy Bypass -File optimize.ps1

# 3. Spusť aplikaci
npm run dev

# 4. Pro desktop verzi
npm run dev:desktop
```

## 🎹 Klávesové Zkratky

- **Space** - Play/Pause
- **←/→** - Předchozí/Další skladba  
- **↑/↓** - Hlasitost
- **M** - Ztlumit
- **E** - EQ panel
- **A** - AI Enhancement
- **Tab** - Advanced Mode
- **F** - Fullscreen

## 🎛️ Dostupné Funkce

### ✅ Audio Engine
- Multi-format support (MP3, WAV, FLAC, M4A)
- Gapless playback
- ReplayGain normalization
- High-quality resampling

### ✅ DSP Effects  
- 3-pásmový parametrický EQ
- Multiband compressor
- True peak limiter
- Convolution reverb
- Stereo enhancer
- Crossfeed pro sluchátka
- **Relativistic Effects** 🚀
- **3D Spatial Audio** 🚀

### 🤖 AI Enhancement
- AudioSR (super-resolution)
- Demucs (stem separation)
- Genre detection
- Style transfer
- Smart mastering

### 📁 EUPH Format
- Lossless compression
- Metadata preservation  
- Digital signatures
- Chunk-based architecture

## 🛠️ Pro Vývojáře

```bash
# Build pro production
npm run build

# Testy
npm run test

# Desktop installer
npm run pack:desktop:win

# Vyčistění cache
npm run clean
```

## 🎯 Performance Tips

- Použij **WASM moduly** pro nejlepší výkon
- Aktivuj **WebGL** pro AI processing  
- Nastav **buffer size** podle CPU
- Používej **AudioWorklet** pro low-latency

---

**🎉 Užij si profesionální audio zpracování!**
