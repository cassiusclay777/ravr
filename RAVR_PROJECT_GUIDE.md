# 🎵 RAVR Audio Engine - Kompletní Projektová Dokumentace

> **Pro Claude Desktop**: Tento dokument poskytuje kompletní přehled projektu RAVR Audio Engine, jeho architektury, technologického stacku a klíčových komponent.

---

## 📋 Obsah

1. [Základní Informace](#základní-informace)
2. [Technologický Stack](#technologický-stack)
3. [Architektura Projektu](#architektura-projektu)
4. [Klíčové Komponenty](#klíčové-komponenty)
5. [Audio Engine](#audio-engine)
6. [State Management](#state-management)
7. [DSP Processing](#dsp-processing)
8. [AI Enhancement](#ai-enhancement)
9. [Build & Deploy](#build--deploy)
10. [Časté Problémy a Řešení](#časté-problémy-a-řešení)

---

## 🎯 Základní Informace

### Identifikace Projektu
- **Název**: RAVR Audio Engine v2.0
- **Popis**: Pokročilý webový audio přehrávač s AI vylepšením a DSP efekty
- **Autor**: Cashi
- **Typ**: Desktop/Web/Mobile Audio Application
- **Platforma**: Cross-platform (Web, Electron, Tauri, Capacitor Android)

### Co dělá RAVR?

RAVR je **next-generation audio engine** který kombinuje:

1. **🎧 Professional Audio Playback**
   - Vysokoqualitní audio dekódování (MP3, FLAC, WAV, M4A, OGG)
   - Gapless playback a crossfade
   - ReplayGain support
   - Podpora multi-window přehrávání

2. **🎛️ Advanced DSP Processing**
   - 3-band parametrický EQ
   - Multiband compressor
   - Convolution reverb
   - True peak limiter
   - Stereo enhancer
   - Crossfeed pro sluchátka
   - Transient shaper

3. **🤖 AI-Powered Enhancement**
   - AudioSR (super-resolution upsampling)
   - Demucs (stem separation)
   - DDSP (neural harmonic synthesis)
   - Auto-mastering AI
   - Smart genre detection

4. **🚀 Revolutionary Features**
   - EUPH format (vlastní AI audio format)
   - WASM DSP modules pro výkon
   - GPU acceleration (WebGPU)
   - VST plugin support
   - MIDI controller integration
   - 3D spatial audio s HRTF
   - Relativistic audio effects (Doppler, time dilation)

---

## 💻 Technologický Stack

### Frontend Framework
```json
{
  "framework": "React 18.2",
  "language": "TypeScript 4.8.4",
  "build": "Vite 7.1.4",
  "styling": "Tailwind CSS 3.3.5",
  "routing": "React Router DOM 6.20.1",
  "state": "Zustand 4.4.7"
}
```

### Audio & DSP
```json
{
  "audio-api": "Web Audio API",
  "audio-context": "standardized-audio-context 25.3.77",
  "wasm": "WASM Feature Detect 1.6.1",
  "gpu": "WebGPU API",
  "metadata": "music-metadata 11.9.0",
  "codecs": "flac.js, lamejs"
}
```

### AI & ML
```json
{
  "runtime": "onnxruntime-web 1.23.0",
  "ffmpeg": "@ffmpeg/ffmpeg 0.12.15",
  "models": "AudioSR, Demucs, DDSP"
}
```

### Desktop Platforms
```json
{
  "electron": "38.1.2",
  "tauri": "2.9.2",
  "capacitor": "7.4.3 (Android)"
}
```

### UI/UX Libraries
```json
{
  "animations": "framer-motion 10.16.4",
  "3d": "three 0.180.0",
  "icons": "lucide-react, react-icons, @heroicons/react",
  "components": "@radix-ui (Dialog, Slider, Switch, Tabs)",
  "gestures": "@use-gesture/react",
  "dnd": "react-beautiful-dnd"
}
```

---

## 🏗️ Architektura Projektu

### Struktura Složek

```
c:\ravr-fixed\
│
├── src/                          # Hlavní source code
│   ├── audio/                    # ⭐ Audio Engine Core
│   │   ├── player.ts            # AutoPlayer třída (singleton)
│   │   ├── audioStore.ts        # Device management store
│   │   ├── Track.ts             # Track model
│   │   ├── Mixer.ts             # Audio mixer
│   │   ├── AudioContextManager.ts
│   │   ├── HighQualityDecoder.ts
│   │   ├── StemSeparator.ts
│   │   └── WasmDspManager.ts
│   │
│   ├── components/               # ⭐ React Components
│   │   ├── WelcomeAudioDemo.tsx  # Main demo player
│   │   ├── AdvancedPlayerPage.tsx # Advanced player UI
│   │   ├── MinimalDeck.tsx       # Compact 3-button player
│   │   ├── NowPlaying.tsx        # Now playing UI
│   │   ├── CompactPlayer.tsx     # Compact player
│   │   ├── PlayerControls.tsx    # Playback controls
│   │   ├── LibraryPanel.tsx      # Library manager
│   │   ├── Navigation.tsx        # Navigation menu
│   │   ├── Layout.tsx            # Page layout
│   │   ├── HiddenDev.tsx         # Dev panel (Shift+D)
│   │   ├── ProfessionalDSP.tsx   # DSP controls UI
│   │   └── VisualizerFull.tsx    # Fullscreen visualizer
│   │
│   ├── dsp/                      # ⭐ DSP Processing Modules
│   │   ├── types.ts              # DSP type definitions
│   │   ├── EQNode.ts             # Parametric EQ
│   │   ├── CompressorNode.ts     # Dynamics compressor
│   │   ├── ConvolutionReverb.ts  # Reverb engine
│   │   ├── MultibandCompressor.ts
│   │   ├── TruePeakLimiter.ts
│   │   ├── StereoEnhancer.ts
│   │   ├── Crossfeed.ts
│   │   ├── TransientShaper.ts
│   │   ├── ParametricEQ.ts
│   │   ├── EQPresets.ts          # EQ presets
│   │   └── modules/              # Modular DSP
│   │       ├── EQModule.ts
│   │       ├── CompressorModule.ts
│   │       └── TDRNovaModule.ts
│   │
│   ├── ai/                       # ⭐ AI/ML Enhancement
│   │   ├── SmartAudioEnhancer.ts # Main AI enhancer
│   │   ├── ONNXModelManager.ts   # ONNX model loader
│   │   ├── AudioSRModel.ts       # Super-resolution
│   │   ├── DemucsModel.ts        # Stem separation
│   │   ├── DDSPModel.ts          # Neural synthesis
│   │   ├── AIMastering.ts        # Auto-mastering
│   │   ├── AIGenreDetection.ts   # Genre classifier
│   │   └── ProcessingQueue.ts    # AI processing queue
│   │
│   ├── store/                    # ⭐ State Management (Zustand)
│   │   ├── audioStore.ts         # Main audio state (CORRECT ONE!)
│   │   │                         # Contains: isPlaying, currentTime,
│   │   │                         # duration, volume, currentTrack
│   │   └── useDspChainStore.ts   # DSP chain state
│   │
│   ├── hooks/                    # ⭐ Custom React Hooks
│   │   ├── useAutoPlayer.ts      # Global AutoPlayer hook (SINGLETON!)
│   │   ├── useAudioPlayer.ts     # Audio player hook
│   │   ├── useMultitrack.ts      # Multitrack hook
│   │   ├── useVisualizer.ts      # Visualizer hook
│   │   ├── useLibrary.ts         # Library management
│   │   └── useKeyboardShortcuts.ts
│   │
│   ├── utils/                    # Utility Functions
│   │   ├── deviceDetect.ts       # Auto device detection
│   │   ├── profiles.ts           # Device profiles
│   │   ├── qualityPlanner.ts     # Quality planning
│   │   ├── autoChain.ts          # Auto DSP chain
│   │   └── lufs.ts               # LUFS measurement
│   │
│   ├── formats/                  # Custom Audio Formats
│   │   ├── EuphFormat.ts         # EUPH format definition
│   │   ├── EUPHEncoder.ts        # EUPH encoder
│   │   ├── EUPHDecoder.ts        # EUPH decoder
│   │   └── EUPHCodec.ts          # EUPH codec
│   │
│   ├── wasm/                     # WebAssembly Modules
│   │   └── ravr_wasm.d.ts        # WASM type definitions
│   │
│   ├── gpu/                      # GPU Acceleration
│   │   └── WebGPUAccelerator.ts
│   │
│   ├── vst/                      # VST Plugin Support
│   │   └── VSTManager.ts
│   │
│   ├── midi/                     # MIDI Integration
│   │   └── MIDIManager.ts
│   │
│   ├── pages/                    # Page Components
│   │   ├── AboutPage.tsx
│   │   ├── TestPage.tsx
│   │   ├── TrackDetectionPage.tsx
│   │   ├── ModelTestPage.tsx
│   │   └── EuphTestPage.tsx
│   │
│   ├── App.tsx                   # Main App component
│   ├── main.tsx                  # Entry point
│   └── vite-env.d.ts            # Vite types
│
├── public/                       # Static assets
├── docs/                         # Documentation
│   └── README.md                 # User guide
│
├── electron.js                   # Electron main process
├── preload.js                    # Electron preload
├── src-tauri/                    # Tauri backend
├── android/                      # Capacitor Android
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite config
├── tailwind.config.js            # Tailwind config
└── .vscode/                      # VS Code settings
    └── settings.json
```

---

## 🎮 Klíčové Komponenty

### 1. **AutoPlayer** (`src/audio/player.ts`)
**Hlavní audio engine třída - singleton pattern**

```typescript
export class AutoPlayer {
  // Audio context a nodes
  private ctx: AudioContext;
  private sourceEl: HTMLAudioElement;
  private sinkEl: HTMLAudioElement;
  private sourceNode: MediaElementAudioSourceNode;

  // DSP chain
  private chain: AutoChain;
  private replayGainNode: GainNode;
  private analyzer: AnalyserNode;

  // Multi-instance coordination
  private broadcastChannel: BroadcastChannel;
  private instanceId: string;

  // Gapless & crossfade
  private crossfadeGain: GainNode;
  private nextCrossfadeGain: GainNode;

  // Methods
  async load(file: File | string): Promise<boolean>
  async play(): Promise<void>
  pause(): void
  stop(): void
  seek(time: number): void
  setVolume(volume: number): void
  updateProfile(profile: DeviceProfile): void
  applyDspPreferences(prefs: DspPreferences): void
  async setSinkId(deviceId: string): Promise<boolean>
}
```

**Důležité vlastnosti**:
- ✅ Singleton instance (pouze JEDNA instance v celé aplikaci!)
- ✅ BroadcastChannel API pro koordinaci mezi multiple windows
- ✅ Automatický resume AudioContext při play
- ✅ DSP chain s auto-sweetening
- ✅ ReplayGain support
- ✅ Gapless playback a crossfade

### 2. **useAutoPlayer Hook** (`src/hooks/useAutoPlayer.ts`)
**Global singleton hook pro AutoPlayer**

```typescript
// Global singleton instance
let globalPlayerInstance: AutoPlayer | null = null;
let instanceRefCount = 0;

export function useAutoPlayer() {
  // Synchronní vytvoření před renderem
  if (!globalPlayerInstance) {
    globalPlayerInstance = new AutoPlayer();
  }

  const playerRef = useRef<AutoPlayer>(globalPlayerInstance);

  // Setup event listeners a state sync
  useLayoutEffect(() => {
    instanceRefCount++;
    // ... setup listeners

    return () => {
      instanceRefCount--;
      if (instanceRefCount === 0) {
        globalPlayerInstance?.dispose();
        globalPlayerInstance = null;
      }
    };
  }, []);

  return playerRef.current;
}
```

**Použití**:
```typescript
// V React komponentě
const player = useAutoPlayer();

// Load a play soubor
const handleFileUpload = async (file: File) => {
  const loaded = await player.load(file);
  if (loaded) {
    await player.play();
  }
};
```

### 3. **Audio Store** (`src/store/audioStore.ts`)
**⚠️ SPRÁVNÝ STORE PRO PLAYBACK STATE!**

```typescript
export interface AudioStoreState {
  // ✅ Playback state (TOTO JE SPRÁVNÝ STORE!)
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTrack: Track | null;

  // Device management
  outputs: DeviceInfoLite[];
  selectedOutputId: string | null;
  status: 'optimal' | 'fallback';
  profile: DeviceProfile | null;

  // Actions
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setCurrentTrack: (track: Track | null) => void;
}

export const useAudioStore = create<AudioStoreState>((set) => ({ ... }));
```

**Importovat z**:
```typescript
// ✅ SPRÁVNĚ - playback state
import { useAudioStore } from '../store/audioStore';

// ❌ ŠPATNĚ - jen device management, NEMÁ playback state!
import { useAudioStore } from '@/audio/audioStore';
```

### 4. **WelcomeAudioDemo** (`src/components/WelcomeAudioDemo.tsx`)
**Hlavní demo přehrávač na homepage**

```typescript
export const WelcomeAudioDemo: React.FC = () => {
  const player = useAutoPlayer(); // ✅ Používá global singleton
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isPlaying,
    currentTime,
    duration,
    currentTrack,
    setCurrentTrack
  } = useAudioStore(); // ✅ Správný store

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !player) return;

    // Vytvořit Track objekt
    const track: Track = {
      id: Date.now().toString(),
      name: file.name,
      artist: 'Local File',
      album: 'Uploaded',
      duration: 0,
      url: URL.createObjectURL(file)
    };

    setCurrentTrack(track);
    const loaded = await player.load(file);
    if (loaded) await player.play();
  };

  return (
    // ... UI s "Hudba je láska" sekcí
  );
};
```

### 5. **MinimalDeck** (`src/components/MinimalDeck.tsx`)
**Compact 3-button player (Load, Play, Stop)**

```typescript
export const MinimalDeck: React.FC = () => {
  const player = useAutoPlayer(); // ✅ Používá global singleton
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    outputs,
    selectedOutputId,
    status,
    isPlaying,          // ✅ Z playback store
    currentTime,        // ✅ Z playback store
    duration,           // ✅ Z playback store
    currentTrack,       // ✅ Z playback store
    setCurrentTrack,
    setSelectedOutput,
    setStatus,
    setProfile,
  } = useAudioStore();  // ✅ Správný store!

  // Auto device detection
  useEffect(() => {
    const stopMonitor = initAutoDeviceDetection();
    return () => stopMonitor?.();
  }, []);

  // Device profile matching
  useEffect(() => {
    if (!player) return;
    const selected = outputs.find(o => o.id === selectedOutputId);
    const profile = matchProfileByLabel(selected?.label ?? '');
    setProfile(profile);
    player.updateProfile(profile);

    if (selectedOutputId) {
      void player.setSinkId(selectedOutputId).then(ok => {
        setStatus(ok ? 'optimal' : 'fallback');
      });
    }
  }, [outputs, selectedOutputId, player]);

  return (
    // ... 3-button UI
  );
};
```

---

## 🎵 Audio Engine

### Audio Flow Diagram

```
[File Upload]
     ↓
[player.load(file)]
     ↓
[HTMLAudioElement] → [MediaElementAudioSourceNode]
     ↓
[ReplayGain Node] → [Crossfade Gain]
     ↓
[Auto DSP Chain]
     ├── EQ (3-band parametric)
     ├── Compressor (multiband)
     ├── Stereo Enhancer
     ├── Crossfeed (for headphones)
     ├── Reverb (convolution)
     └── Limiter (true peak)
     ↓
[Analyser Node] ← [Visualizers]
     ↓
[MediaStreamAudioDestinationNode]
     ↓
[Sink Audio Element] → [Output Device]
     ↓
[🔊 Audio Output]
```

### Device Auto-Detection

```typescript
// utils/deviceDetect.ts
export function initAutoDeviceDetection() {
  const handleChange = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices
      .filter(d => d.kind === 'audiooutput')
      .map(d => ({
        id: d.deviceId,
        label: d.label || `Output ${d.deviceId.slice(0, 8)}`,
        kind: d.kind,
        groupId: d.groupId,
        canSetSinkId: 'setSinkId' in HTMLAudioElement.prototype
      }));

    useAudioStore.getState().setOutputs(outputs);
  };

  navigator.mediaDevices.addEventListener('devicechange', handleChange);
  handleChange();

  return () => {
    navigator.mediaDevices.removeEventListener('devicechange', handleChange);
  };
}
```

### Device Profiles

```typescript
// utils/profiles.ts
export interface DeviceProfile {
  id: string;
  name: string;
  matchKeywords: string[];
  dsp: DspPreferences;
}

export const profiles: DeviceProfile[] = [
  {
    id: 'airpods-pro',
    name: 'AirPods Pro',
    matchKeywords: ['airpods pro', 'airpod pro'],
    dsp: {
      sweetenerTargetLUFS: -14,
      limiter: { threshold: -0.3, release: 0.05, ratio: 20 },
      eqTiltDbPerDecade: 0.5,  // Bright tilt
      monoBelowHz: 120
    }
  },
  // ... další profily
];

export function matchProfileByLabel(label: string): DeviceProfile | null {
  const lower = label.toLowerCase();
  return profiles.find(p =>
    p.matchKeywords.some(k => lower.includes(k))
  ) ?? null;
}
```

---

## 🔄 State Management

### Zustand Store Architecture

```typescript
// Rozdělení stores podle odpovědnosti:

// 1. src/store/audioStore.ts - PLAYBACK STATE
export const useAudioStore = create<AudioStoreState>((set) => ({
  // ✅ Playback
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.9,
  currentTrack: null,

  // ✅ Devices
  outputs: [],
  selectedOutputId: null,
  status: 'fallback',
  profile: null,

  // ✅ Actions
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  // ...
}));

// 2. src/audio/audioStore.ts - DEVICE ONLY (LEGACY)
export const useAudioStore = create<AudioStoreState>((set) => ({
  // ❌ NEMÁ playback state!
  // Pouze device management
  outputs: [],
  selectedOutputId: null,
  status: 'fallback',
  profile: null,
  plan: null,
  expertMode: false,
}));

// 3. src/store/useDspChainStore.ts - DSP STATE
export const useDspChainStore = create<DspChainState>((set) => ({
  modules: [],
  presets: defaultPresets,
  currentPreset: null,
  // ...
}));
```

---

## 🎛️ DSP Processing

### DSP Chain Configuration

```typescript
// dsp/types.ts
export interface DspPreferences {
  sweetenerTargetLUFS: number;     // -14 to -10
  limiter: {
    threshold: number;              // dB
    release: number;                // seconds
    ratio: number;                  // compression ratio
  };
  eqTiltDbPerDecade: number;        // ±6 dB/decade
  monoBelowHz: number;              // 0-200 Hz
}

// Example preset
const studioPreset: DspPreferences = {
  sweetenerTargetLUFS: -14,
  limiter: {
    threshold: -0.1,
    release: 0.05,
    ratio: 20
  },
  eqTiltDbPerDecade: 0,
  monoBelowHz: 120
};
```

### EQ Module

```typescript
// dsp/EQNode.ts
export class ParametricEQ {
  private lowShelf: BiquadFilterNode;
  private midPeak: BiquadFilterNode;
  private highShelf: BiquadFilterNode;

  constructor(context: AudioContext) {
    this.lowShelf = context.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 80;

    this.midPeak = context.createBiquadFilter();
    this.midPeak.type = 'peaking';
    this.midPeak.frequency.value = 1000;
    this.midPeak.Q.value = 0.7;

    this.highShelf = context.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 10000;
  }

  setBand(band: 'low' | 'mid' | 'high', gain: number) {
    const node = band === 'low' ? this.lowShelf
               : band === 'mid' ? this.midPeak
               : this.highShelf;
    node.gain.setTargetAtTime(gain, this.context.currentTime, 0.01);
  }
}
```

---

## 🤖 AI Enhancement

### AI Pipeline Architecture

```
[Audio Input]
     ↓
[Feature Extraction]
     ├── FFT Analysis
     ├── LUFS Measurement
     └── Genre Detection
     ↓
[AI Processing Queue]
     ├── AudioSR (super-resolution)
     ├── Demucs (stem separation)
     ├── DDSP (harmonic synthesis)
     └── Auto-mastering
     ↓
[Enhanced Audio Output]
```

### ONNX Model Management

```typescript
// ai/ONNXModelManager.ts
export class ONNXModelManager {
  private models: Map<string, InferenceSession> = new Map();

  async loadModel(modelName: string, modelPath: string) {
    if (this.models.has(modelName)) {
      return this.models.get(modelName)!;
    }

    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'], // or 'webgl', 'webgpu'
      graphOptimizationLevel: 'all'
    });

    this.models.set(modelName, session);
    return session;
  }

  async runInference(modelName: string, inputTensor: ort.Tensor) {
    const session = this.models.get(modelName);
    if (!session) throw new Error(`Model ${modelName} not loaded`);

    const feeds = { input: inputTensor };
    const results = await session.run(feeds);
    return results;
  }
}
```

---

## 🚀 Build & Deploy

### Development

```bash
# Web development
npm run dev              # Vite dev server na localhost:5174

# Desktop development
npm run dev:desktop      # Electron + Vite
npm run tauri:dev        # Tauri development

# Mobile development
npm run dev:mobile       # Mobile dev server (--host)
```

### Build

```bash
# Web build
npm run build            # Vite production build → dist/

# Desktop builds
npm run pack:desktop:win    # Windows NSIS installer
npm run pack:desktop:mac    # macOS .app / .dmg
npm run pack:desktop:linux  # AppImage + .deb
npm run tauri:build         # Tauri native build

# Mobile builds
npm run build:mobile        # Mobile optimized build
npm run deploy:mobile       # Deploy to Android
```

### Scripts

```json
{
  "dev": "vite --port 5174",
  "build": "vite build",
  "preview": "vite preview",
  "dev:desktop": "concurrently -k -c auto \"vite --port 5175\" \"wait-on http://localhost:5175 && cross-env NODE_ENV=development ELECTRON_IS_DEV=1 electron .\"",
  "pack:desktop:win": "pnpm build && electron-builder --win",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build"
}
```

---

## ⚙️ Configuration Files

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5174,
    host: true  // For mobile development
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'audio-vendor': ['standardized-audio-context'],
          'ai-vendor': ['onnxruntime-web', '@ffmpeg/ffmpeg']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  }
});
```

---

## 🐛 Časté Problémy a Řešení

### Problém 1: Audio se nehraje

**Příznaky**:
- Nahraje se track, ale nepřehrává se
- Console nehlásí chyby
- Player je v "playing" stavu, ale žádný zvuk

**Příčiny a řešení**:

1. **Špatný store import**
   ```typescript
   // ❌ ŠPATNĚ - store bez playback state
   import { useAudioStore } from '@/audio/audioStore';

   // ✅ SPRÁVNĚ
   import { useAudioStore } from '../store/audioStore';
   ```

2. **Multiple AutoPlayer instances**
   ```typescript
   // ❌ ŠPATNĚ - vytváří vlastní instanci
   const player = new AutoPlayer();

   // ✅ SPRÁVNĚ - používá singleton
   const player = useAutoPlayer();
   ```

3. **AudioContext suspended**
   ```typescript
   // Player automaticky resumuje context při play()
   async play(): Promise<void> {
     if (this.ctx.state === 'suspended') {
       await this.ctx.resume();  // ✅ Automatické resume
     }
     await this.sourceEl.play();
     await this.sinkEl.play();
   }
   ```

### Problém 2: Chyba "Cannot set properties of null"

**Příčina**: Input element je null při resetu

**Řešení**:
```typescript
// ❌ ŠPATNĚ
event.currentTarget.value = '';

// ✅ SPRÁVNĚ - kontrola null
if (event.currentTarget) {
  event.currentTarget.value = '';
}
```

### Problém 3: Multiple windows playing současně

**Příčina**: Žádná koordinace mezi windows

**Řešení**: BroadcastChannel API
```typescript
// V AutoPlayer konstruktoru
this.broadcastChannel = new BroadcastChannel('ravr-audio-player');
this.broadcastChannel.onmessage = (event) => {
  if (event.data?.type === 'play' &&
      event.data?.instanceId !== this.instanceId) {
    this.pause();  // Pausnout tento player
  }
};

// V play() metodě
this.broadcastChannel.postMessage({
  type: 'play',
  instanceId: this.instanceId
});
```

### Problém 4: VS Code diagnostic warnings

**Gradle warnings**:
```json
// .vscode/settings.json
{
  "java.import.exclusions": [
    "**/node_modules/**"
  ],
  "java.import.gradle.enabled": false
}
```

**Logical Properties false positives**:
```json
{
  "logicalProperties.files.exclude": [
    "**/*.json"
  ]
}
```

---

## 📚 Klíčové Koncepty

### 1. Singleton Pattern pro AutoPlayer

**Proč?**
- Pouze JEDNA instance AudioContext (browser limit)
- Sdílený state mezi komponenty
- Koordinace mezi multiple windows
- Reference counting pro proper cleanup

**Implementace**:
```typescript
// Global singleton
let globalPlayerInstance: AutoPlayer | null = null;
let instanceRefCount = 0;

export function useAutoPlayer() {
  // Vytvoř PŘED renderem (synchronně)
  if (!globalPlayerInstance) {
    globalPlayerInstance = new AutoPlayer();
  }

  const playerRef = useRef<AutoPlayer>(globalPlayerInstance);

  useLayoutEffect(() => {
    instanceRefCount++;
    // Setup listeners...

    return () => {
      instanceRefCount--;
      if (instanceRefCount === 0) {
        globalPlayerInstance?.dispose();
        globalPlayerInstance = null;
      }
    };
  }, []);

  return playerRef.current;
}
```

### 2. Multi-Window Coordination

**BroadcastChannel API**:
```typescript
// Instance A spustí playback
playerA.play();
→ broadcastChannel.postMessage({ type: 'play', instanceId: 'A' })

// Instance B dostane message
→ onmessage: { type: 'play', instanceId: 'A' }
→ if (instanceId !== 'B') playerB.pause();

// Výsledek: Pouze JEDEN player hraje současně
```

### 3. DSP Auto-Chain

**Auto-sweetening**:
```typescript
// Automatické vylepšení zvuku podle device profile
createAutoChain(context, profile.dsp) {
  // LUFS normalization
  const sweetener = createAutoSweetener(targetLUFS);

  // EQ tilt (bright/warm)
  const eq = createTiltEQ(eqTiltDbPerDecade);

  // Mono bass (sub 120Hz)
  const monoer = createMonoBass(monoBelowHz);

  // True peak limiter
  const limiter = createTruePeakLimiter(threshold, release, ratio);

  // Connect chain
  sweetener.connect(eq);
  eq.connect(monoer);
  monoer.connect(limiter);

  return { input: sweetener, output: limiter };
}
```

### 4. Track Model

```typescript
export interface Track {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  duration: number;  // seconds
  url: string;       // ObjectURL nebo HTTP URL

  // Optional metadata
  year?: number;
  genre?: string;
  coverArt?: string;

  // ReplayGain
  replayGain?: {
    trackGain?: number;
    trackPeak?: number;
    albumGain?: number;
    albumPeak?: number;
  };
}
```

---

## 🎯 Routing Structure

```typescript
// App.tsx routes
<Routes>
  <Route path="/" element={<PlayerView />} />
  {/* Home page with WelcomeAudioDemo */}

  <Route path="/dsp" element={<DspView />} />
  {/* Professional DSP controls, WASM, AI Mastering */}

  <Route path="/tracks" element={<TrackDetectionPage />} />
  {/* Auto track detection and analysis */}

  <Route path="/ai-models" element={<ModelTestPage />} />
  {/* AI model testing and benchmarking */}

  <Route path="/euph-test" element={<EuphTestPage />} />
  {/* EUPH format testing */}

  <Route path="/euph-live" element={<EuphLivePage />} />
  {/* EUPH live processing */}

  <Route path="/settings" element={<SettingsView />} />
  {/* Application settings */}
</Routes>
```

---

## 🔑 Keyboard Shortcuts

```typescript
// hooks/useKeyboardShortcuts.ts
const shortcuts = {
  'Space': 'Play/Pause',
  'Escape': 'Stop',
  'ArrowLeft': 'Seek -5s',
  'ArrowRight': 'Seek +5s',
  'ArrowUp': 'Volume +10%',
  'ArrowDown': 'Volume -10%',
  'Shift+D': 'Toggle Dev Panel',
  'L': 'Open Library',
  'F': 'Toggle Fullscreen Visualizer'
};
```

---

## 📦 Dependencies Breakdown

### Core Dependencies (Production)
```json
{
  "react": "18.2.0",              // UI framework
  "react-dom": "18.2.0",          // React renderer
  "react-router-dom": "6.20.1",   // Routing
  "zustand": "4.4.7",             // State management
  "standardized-audio-context": "25.3.77", // Audio API polyfill
  "three": "0.180.0",             // 3D graphics
  "framer-motion": "10.16.4",     // Animations
  "tailwindcss": "3.3.5",         // Styling
  "onnxruntime-web": "1.23.0",    // AI inference
  "@ffmpeg/ffmpeg": "0.12.15",    // Audio processing
  "music-metadata": "11.9.0",     // Metadata parsing
  "@capacitor/core": "7.4.3",     // Mobile runtime
  "@tauri-apps/api": "2.8.0"      // Desktop runtime
}
```

### Dev Dependencies
```json
{
  "vite": "7.1.4",                // Build tool
  "typescript": "4.8.4",          // Type system
  "electron": "38.1.2",           // Desktop wrapper
  "@tauri-apps/cli": "2.9.2",     // Tauri CLI
  "electron-builder": "24.13.3",  // Electron packager
  "@vitejs/plugin-react": "4.7.0" // Vite React plugin
}
```

---

## 🎨 UI Component Library

### Radix UI Components
```typescript
import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import * as Tabs from '@radix-ui/react-tabs';

// Accessible, unstyled UI primitives
```

### Custom Components
- **Layout**: Main page wrapper
- **Navigation**: Tab navigation
- **Background**: Animated gradient background
- **Card**: Styled card container
- **Button**: Custom button styles
- **Knob**: Rotary knob control
- **Slider**: Range slider
- **VU Meter**: Audio level meter
- **Waveform**: Audio waveform display
- **Spectrum**: FFT spectrum analyzer

---

## 🎤 Audio Features Checklist

### Playback Features
- ✅ Multiple format support (MP3, FLAC, WAV, M4A, OGG)
- ✅ Gapless playback
- ✅ Crossfade between tracks
- ✅ ReplayGain normalization
- ✅ Seeking with sample-accurate precision
- ✅ Volume control with dB scaling
- ✅ Multi-window coordination (BroadcastChannel)
- ✅ Device auto-detection and selection
- ✅ Device-specific profiles (AirPods, etc.)

### DSP Features
- ✅ 3-band parametric EQ
- ✅ Multiband dynamics compressor
- ✅ Convolution reverb
- ✅ True peak limiter
- ✅ Stereo enhancer
- ✅ Crossfeed (headphone spatialization)
- ✅ Transient shaper
- ✅ Auto-sweetening (LUFS normalization)
- ✅ EQ tilt (bright/warm)
- ✅ Mono bass (sub-bass management)

### AI Features
- ✅ AudioSR super-resolution
- ✅ Demucs stem separation
- ✅ DDSP neural synthesis
- ✅ Auto-mastering
- ✅ Genre detection
- ✅ Smart enhancement
- ✅ Processing queue
- ✅ Model caching

### Advanced Features
- ✅ EUPH format support
- ✅ WASM DSP acceleration
- ✅ GPU processing (WebGPU)
- ✅ 3D spatial audio
- ✅ Real-time visualization
- ✅ Spectrum analyzer (FFT)
- ✅ Waveform display
- ✅ LUFS metering
- ✅ Preset management
- ✅ Library management
- ✅ Keyboard shortcuts
- ✅ Gesture controls

---

## 📝 Code Conventions

### TypeScript Style
```typescript
// Interface naming: PascalCase
export interface AudioStoreState { }

// Type naming: PascalCase
export type Status = 'optimal' | 'fallback';

// Enum naming: PascalCase
export enum PlaybackState {
  Playing,
  Paused,
  Stopped
}

// Function naming: camelCase
export function matchProfileByLabel(label: string) { }

// Component naming: PascalCase
export const WelcomeAudioDemo: React.FC = () => { };

// Hook naming: camelCase with "use" prefix
export function useAutoPlayer() { }

// Private class members: camelCase with leading underscore
private _audioContext: AudioContext;
```

### Import Organization
```typescript
// 1. External dependencies
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal modules
import { useAudioStore } from '@/store/audioStore';
import { AutoPlayer } from '@/audio/player';

// 3. Components
import { Layout } from './Layout';
import { Button } from './ui/Button';

// 4. Types
import type { Track, DspPreferences } from '@/types';

// 5. Styles
import './styles.css';
```

---

## 🚨 Critical Warnings

### ⚠️ NIKDY NEDĚLAT

1. **NIKDY nevytvářet novou instanci AutoPlayeru**
   ```typescript
   // ❌ ŠPATNĚ
   const player = new AutoPlayer();

   // ✅ SPRÁVNĚ
   const player = useAutoPlayer();
   ```

2. **NIKDY neimportovat špatný store**
   ```typescript
   // ❌ ŠPATNĚ - device only store
   import { useAudioStore } from '@/audio/audioStore';

   // ✅ SPRÁVNĚ - playback state store
   import { useAudioStore } from '../store/audioStore';
   ```

3. **NIKDY nezapomenout na null check**
   ```typescript
   // ❌ ŠPATNĚ
   event.currentTarget.value = '';

   // ✅ SPRÁVNĚ
   if (event.currentTarget) {
     event.currentTarget.value = '';
   }
   ```

4. **NIKDY neblokovat audio play()**
   ```typescript
   // ❌ ŠPATNĚ - synchronní
   this.sourceEl.play();

   // ✅ SPRÁVNĚ - asynchronní
   await this.sourceEl.play();
   await this.ctx.resume();
   ```

---

## 🔍 Debugging Tips

### Chrome DevTools

**Audio Tab**:
1. F12 → More Tools → Media
2. Zobrazuje active AudioContext instances
3. Sleduje node connections
4. Monitoruje playback state

**Console Debugging**:
```typescript
// Enable debug logging
localStorage.setItem('DEBUG', 'ravr:*');

// Player debug
console.log('Player state:', {
  isPlaying: player.isPlaying(),
  currentTime: player.getCurrentTime(),
  duration: player.getDuration(),
  contextState: player.getContext().state
});

// Store debug
console.log('Store state:', useAudioStore.getState());
```

**Performance Profiling**:
1. F12 → Performance tab
2. Record audio playback
3. Analyze AudioContext operations
4. Check for dropped frames

---

## 📚 Resources & Links

### Documentation
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/
- **Zustand**: https://zustand-demo.pmnd.rs/
- **Vite**: https://vitejs.dev/
- **Tailwind CSS**: https://tailwindcss.com/

### Audio Resources
- **LUFS Normalization**: https://en.wikipedia.org/wiki/LUFS
- **ReplayGain**: https://wiki.hydrogenaud.io/index.php?title=ReplayGain
- **True Peak Limiting**: https://en.wikipedia.org/wiki/Peak_limiting
- **Convolution Reverb**: https://en.wikipedia.org/wiki/Convolution_reverb

### AI/ML Resources
- **ONNX Runtime**: https://onnxruntime.ai/
- **AudioSR**: https://github.com/haoheliu/versatile_audio_super_resolution
- **Demucs**: https://github.com/facebookresearch/demucs
- **DDSP**: https://github.com/magenta/ddsp

---

## ✅ Quick Reference Checklist

### Před začátkem práce na projektu:
- [ ] Přečíst tento dokument
- [ ] Pochopit AutoPlayer singleton pattern
- [ ] Vědět rozdíl mezi audio stores
- [ ] Pochopit useAutoPlayer hook
- [ ] Znát flow audio playback

### Při přidávání nové komponenty s audio:
- [ ] Importovat `useAutoPlayer` z `src/hooks/useAutoPlayer.ts`
- [ ] Importovat `useAudioStore` z `src/store/audioStore.ts` (NE z audio/)
- [ ] Nikdy nevytvářet `new AutoPlayer()`
- [ ] Použít `player.load()` a `player.play()` async
- [ ] Pravidelně logovat console pro debugging

### Při debugging audio problémů:
- [ ] Zkontrolovat console errory
- [ ] Ověřit správný store import
- [ ] Zkontrolovat, že používáme useAutoPlayer hook
- [ ] Ověřit AudioContext state (suspended/running)
- [ ] Zkontrolovat BroadcastChannel coordination
- [ ] Použít Chrome DevTools → Media tab

---

## 🎯 Shrnutí pro Claude

**Co je RAVR?**
Pokročilý webový audio přehrávač s profesionálním DSP processingem, AI enhancement, a revolučními features jako EUPH format, WASM acceleration, GPU processing, 3D spatial audio, atd.

**Klíčové technologie:**
React + TypeScript + Vite + Zustand + Web Audio API + ONNX + WebGPU + Electron + Tauri + Capacitor

**Hlavní architekturu:**
- `AutoPlayer` = singleton audio engine s DSP chain
- `useAutoPlayer` = global hook pro přístup k playeru
- `src/store/audioStore.ts` = SPRÁVNÝ store s playback state
- BroadcastChannel = multi-window coordination

**Běžné problémy:**
1. Špatný store import (audio/ vs store/)
2. Multiple player instances (new AutoPlayer() vs useAutoPlayer())
3. Null checks chybí
4. AudioContext suspended

**Best Practices:**
- Vždy používat `useAutoPlayer()` hook
- Vždy importovat z `src/store/audioStore.ts`
- Vždy await async audio operations
- Vždy kontrolovat null/undefined

---

## 📞 Kontakt & Podpora

Pro další pomoc nebo dotazy:
- **GitHub Issues**: [github.com/ravr-audio/ravr-engine/issues](https://github.com/ravr-audio/ravr-engine/issues)
- **Email**: support@ravr.audio
- **Discord**: ravr-audio community

---

**Tento dokument vytvořen pro Claude Desktop**
**Verze: 1.0**
**Poslední aktualizace: 2025-01-25**

---

🎵 **Happy Coding with RAVR!** 🎵
