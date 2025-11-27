# 🎵 RAVR Professional Audio Player - Upgrade Plan

## 📊 Current State Analysis

### ✅ Co RAVR již má:
- ✅ **Gapless playback** (včetně preloadingu)
- ✅ **Crossfade** mezi tracky
- ✅ **ReplayGain** support (track + album gain)
- ✅ **DSP chain** (AutoChain s EQ, compressor, sweetener)
- ✅ **Device profiles** (automatické ladění podle zařízení)
- ✅ **Multi-instance coordination** (BroadcastChannel API)
- ✅ **Volume control** s smooth transitions
- ✅ **Audio analyzer** (FFT ready)
- ✅ **Multi-format support** (MP3, FLAC, WAV, DSD placeholder)

### ❌ Co chybí (ve srovnání s Neutron/UAPP/foobar2000):
- ❌ **Modulární DSP chain** (nelze přeuspořádávat efekty)
- ❌ **Bit-perfect mode** (vždy běží DSP chain)
- ❌ **Library management** (indexování, vyhledávání)
- ❌ **Smart playlists** (pravidlové playlisty)
- ❌ **Advanced EQ** (pouze 3-band, ne parametrický)
- ❌ **Output device manager** (pouze základní setSinkId)
- ❌ **Format detection** (žádné Hi-Res indikace)

---

## 🎯 TOP 3 Funkce k implementaci

Vybrané funkce jsou **100% open-source** a realisticky implementovatelné:

### 1. 🎛️ Modulární DSP Chain (z foobar2000)

**Co to je:**
- DSP efekty jako samostatné moduly
- Drag & drop pro změnu pořadí
- Přidávání/odebírání modulů za běhu
- Vizuální editor s preview
- Preset management

**Inspirace:** foobar2000 DSP Manager
**Technologie:** Web Audio API + React DnD
**Obtížnost:** ⭐⭐⭐ (Medium)
**Hodnota:** ⭐⭐⭐⭐⭐ (Critical)

**Moduly k implementaci:**
- ✅ Parametrický EQ (10-band)
- ✅ Grafický EQ (31-band)
- ✅ Compressor/Limiter
- ✅ Crossfeed (sluchátka)
- ✅ Stereo Enhancer
- ✅ Gain node
- ✅ Phase inverter
- ✅ Balance control

---

### 2. 🎚️ Bit-Perfect Output Mode (z UAPP)

**Co to je:**
- Bypass VŠEHO zpracování (DSP, ReplayGain, volume)
- Exclusive output mode (WASAPI Exclusive na Windows)
- Automatické sample rate matching
- Hi-Res format detection
- Bit-depth preservation

**Inspirace:** USB Audio Player PRO
**Technologie:** Electron native modules (WASAPI), Web Audio bypass
**Obtížnost:** ⭐⭐⭐⭐ (Hard)
**Hodnota:** ⭐⭐⭐⭐ (High)

**Features:**
- ✅ Detect source sample rate
- ✅ Switch output to match (44.1k, 48k, 96k, 192k, 384k)
- ✅ Bypass DSP chain
- ✅ Bypass volume control
- ✅ Direct audio path
- ✅ Quality indicator (Bit-Perfect badge)

---

### 3. 📚 Smart Library + Advanced Playlists (z foobar2000 + Neutron)

**Co to je:**
- Automatické indexování složek
- Pokročilé vyhledávání (artist, album, genre, year, format, atd.)
- Smart playlists s pravidly (např. "všechny FLAC skladby, rok > 2020, rating >= 4")
- Tag editor
- Statistiky (play count, last played)

**Inspirace:** foobar2000 Media Library + Neutron Browser
**Technologie:** SQLite (Electron) nebo IndexedDB, music-metadata NPM
**Obtížnost:** ⭐⭐⭐⭐ (Hard)
**Hodnota:** ⭐⭐⭐⭐⭐ (Critical)

**Features:**
- ✅ Scan C:\hudba recursively
- ✅ Extract metadata (music-metadata library)
- ✅ Store in SQLite database
- ✅ Full-text search
- ✅ Filter by format/quality
- ✅ Smart playlist rules
- ✅ Album art caching
- ✅ Play count tracking

---

## 🚀 Implementation Roadmap

### Phase 1: Modulární DSP Chain (16 hodin)

#### Week 1: Core DSP System (8h)

**1.1 DSP Node Base Class (2h)**
```typescript
// src/dsp/nodes/DspNode.ts
abstract class DspNode {
  abstract process(input: Float32Array): Float32Array;
  abstract getParameters(): any;
  abstract setParameters(params: any): void;
}
```

**Files to create:**
- `src/dsp/nodes/DspNode.ts` - Base class
- `src/dsp/nodes/ParametricEQNode.ts` - 10-band EQ
- `src/dsp/nodes/CompressorNode.ts` - Dynamics compressor
- `src/dsp/nodes/CrossfeedNode.ts` - Headphone crossfeed
- `src/dsp/nodes/GainNode.ts` - Simple gain
- `src/dsp/DspChain.ts` - Chain manager

**1.2 DSP Chain Manager (3h)**
```typescript
// src/dsp/DspChain.ts
class DspChain {
  nodes: DspNode[] = [];

  addNode(node: DspNode, index?: number): void
  removeNode(id: string): void
  moveNode(fromIndex: number, toIndex: number): void
  process(buffer: Float32Array): Float32Array
}
```

**1.3 Integration with AutoPlayer (2h)**
- Replace fixed `AutoChain` with modular `DspChain`
- Add enable/disable per node
- Add bypass all DSP mode

**1.4 Testing (1h)**
- Test node reordering
- Test add/remove nodes
- Test audio processing quality

#### Week 2: DSP UI Editor (8h)

**2.1 DSP Chain Panel Component (4h)**
```tsx
// src/components/dsp/DspChainPanel.tsx
- Drag & drop node list (react-beautiful-dnd)
- Add node dropdown
- Remove node button
- Enable/disable toggles
- Bypass all switch
```

**2.2 Node Parameter Controls (3h)**
```tsx
// src/components/dsp/NodeParameterPanel.tsx
- Parametric EQ: 10 sliders (freq, gain, Q)
- Compressor: threshold, ratio, attack, release
- Crossfeed: frequency, attenuation
- Knob components (react-rotary-knob)
```

**2.3 Preset Management (1h)**
- Save DSP chain as preset
- Load preset
- Default presets (Rock, Jazz, Classical, Vocal Boost)

---

### Phase 2: Bit-Perfect Output (12 hodin)

#### Week 3: Bit-Perfect Core (6h)

**3.1 Output Device Manager (3h)**
```typescript
// src/audio/OutputDeviceManager.ts
class OutputDeviceManager {
  async listDevices(): Promise<OutputDevice[]>
  async selectDevice(id: string, exclusive: boolean): Promise<void>
  async setSampleRate(rate: number): Promise<void>
  getCurrentDevice(): OutputDevice | null
}
```

**Files to create:**
- `src/audio/OutputDeviceManager.ts`
- `src/audio/WASAPIOutput.ts` (Electron native module)
- `src/audio/FormatDetector.ts` (detect Hi-Res)
- `src/audio/BitPerfectMode.ts` (bypass manager)

**3.2 WASAPI Exclusive Mode (2h)**
- Electron native addon (Node-API)
- Or use existing library: `windows-audio-device`
- Detect available sample rates
- Set exclusive mode

**3.3 Bit-Perfect Logic (1h)**
```typescript
// src/audio/BitPerfectMode.ts
class BitPerfectMode {
  async enable(track: Track): Promise<void> {
    // 1. Detect source sample rate
    // 2. Switch output to match
    // 3. Bypass DSP chain
    // 4. Bypass volume (set to 1.0)
    // 5. Direct audio path
  }

  verify(): BitPerfectStatus {
    // Verify chain is truly bit-perfect
  }
}
```

#### Week 4: Bit-Perfect UI (6h)

**4.1 Output Device Selector (3h)**
```tsx
// src/components/audio/OutputDeviceSelector.tsx
- Device dropdown
- Sample rate dropdown (44.1k, 48k, 96k, 192k)
- Exclusive mode toggle
- Bit-perfect mode toggle
```

**4.2 Quality Indicators (2h)**
```tsx
// src/components/audio/QualityIndicator.tsx
- Badge: "16/44.1" or "24/96" or "24/192"
- Hi-Res icon (if sampleRate > 48kHz)
- Bit-Perfect badge (green checkmark)
- Lossless indicator
```

**4.3 Settings Panel (1h)**
- Bit-perfect settings
- Output device settings
- Sample rate preference (match source / fixed)

---

### Phase 3: Smart Library & Playlists (20 hodin)

#### Week 5: Library Core (10h)

**5.1 Database Schema (2h)**
```sql
-- SQLite schema
CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  title TEXT,
  artist TEXT,
  album TEXT,
  year INTEGER,
  genre TEXT,
  duration REAL,
  sampleRate INTEGER,
  bitDepth INTEGER,
  codec TEXT,
  lossless INTEGER,
  playCount INTEGER DEFAULT 0,
  lastPlayed TEXT,
  dateAdded TEXT,
  rating INTEGER
);

CREATE TABLE albums (...);
CREATE TABLE artists (...);
CREATE TABLE playlists (...);
CREATE TABLE playlist_tracks (...);
```

**Files to create:**
- `src/library/LibraryDatabase.ts` (SQLite wrapper)
- `src/library/FileIndexer.ts` (scan folders)
- `src/library/MetadataExtractor.ts` (music-metadata)
- `src/library/LibraryService.ts` (business logic)

**5.2 File Indexer (4h)**
```typescript
// src/library/FileIndexer.ts
class FileIndexer {
  async scanDirectory(path: string): Promise<Track[]> {
    // 1. Recursively find audio files
    // 2. Extract metadata (music-metadata)
    // 3. Insert into database
    // 4. Progress callback
  }
}
```

**5.3 Metadata Extraction (2h)**
```typescript
// src/library/MetadataExtractor.ts
- Use music-metadata NPM package
- Extract: title, artist, album, year, genre
- Extract: sampleRate, bitDepth, codec, bitrate
- Extract: album art
- Extract: ReplayGain tags
```

**5.4 Library Service (2h)**
```typescript
// src/library/LibraryService.ts
class LibraryService {
  async search(query: string): Promise<Track[]>
  async filterBy(filters: LibraryFilters): Promise<Track[]>
  async getAlbums(): Promise<Album[]>
  async getArtists(): Promise<Artist[]>
}
```

#### Week 6: Smart Playlists & UI (10h)

**6.1 Smart Playlist Engine (4h)**
```typescript
// src/playlist/SmartPlaylist.ts
class SmartPlaylist {
  rules: PlaylistRule[]

  async evaluate(): Promise<Track[]> {
    // Convert rules to SQL WHERE clause
    // Execute query
    // Return matching tracks
  }
}

interface PlaylistRule {
  field: 'artist' | 'album' | 'year' | 'genre' | 'codec' | ...
  operator: 'is' | 'contains' | '>' | '<' | 'between'
  value: any
}
```

**Files to create:**
- `src/playlist/SmartPlaylist.ts`
- `src/playlist/PlaylistManager.ts`
- `src/playlist/RuleEngine.ts`

**6.2 Library Browser UI (4h)**
```tsx
// src/components/library/LibraryBrowser.tsx
- Search bar (instant search)
- Filter sidebar:
  - Artist filter
  - Album filter
  - Genre filter
  - Year slider
  - Format filter (FLAC, MP3, etc.)
  - Quality filter (Lossless, Hi-Res)
- Track list (virtualized - react-window)
- Album grid view
- Sort options
```

**6.3 Smart Playlist Editor (2h)**
```tsx
// src/components/playlist/SmartPlaylistEditor.tsx
- Rule builder:
  - Add rule button
  - Field dropdown (artist, album, year, etc.)
  - Operator dropdown (is, contains, >, <)
  - Value input
  - Remove rule button
- AND/OR combinator
- Preview results (live update)
- Save playlist button
```

---

## 📦 Dependencies

### New NPM Packages:
```bash
# DSP Chain UI
pnpm add react-beautiful-dnd @types/react-beautiful-dnd
pnpm add react-rotary-knob

# Library & Database
pnpm add better-sqlite3 @types/better-sqlite3  # SQLite
pnpm add music-metadata @types/music-metadata  # Metadata extraction

# Bit-Perfect (Windows)
pnpm add windows-audio-device  # WASAPI access (optional)

# UI Components
pnpm add react-window @types/react-window  # Virtualized lists
pnpm add react-virtualized-auto-sizer
```

### Total: ~10 packages, všechny open-source

---

## 📅 Timeline Summary

| Phase | Feature | Duration | Complexity |
|-------|---------|----------|------------|
| 1 | Modulární DSP Chain | 16h | ⭐⭐⭐ |
| 2 | Bit-Perfect Output | 12h | ⭐⭐⭐⭐ |
| 3 | Smart Library | 20h | ⭐⭐⭐⭐ |
| **Total** | | **48 hodin** | **6 dní** |

---

## ✅ Success Metrics

Po dokončení budeš mít:

### 1. Modulární DSP Chain ✨
- ✅ Drag & drop reordering
- ✅ 8+ DSP moduly
- ✅ Preset management
- ✅ Visual editor
- **Srovnatelné s:** foobar2000 DSP Manager

### 2. Bit-Perfect Mode 🎚️
- ✅ WASAPI Exclusive (Windows)
- ✅ Sample rate matching
- ✅ Zero processing path
- ✅ Quality indicators
- **Srovnatelné s:** USB Audio Player PRO

### 3. Smart Library 📚
- ✅ Auto-indexing
- ✅ Advanced search
- ✅ Smart playlists
- ✅ Format filtering
- **Srovnatelné s:** foobar2000 Media Library + Neutron Browser

---

## 🎯 Why These 3?

### Modulární DSP Chain
- ✅ **Open-source**: 100% Web Audio API
- ✅ **High value**: Power users milují customizaci
- ✅ **Unique**: Jen foobar2000 to má
- ✅ **Implementovatelné**: Medium difficulty

### Bit-Perfect Mode
- ✅ **Open-source**: WASAPI je Windows API
- ✅ **High value**: Audiophiles to požadují
- ✅ **Differentiator**: Konkurence to nemá (kromě UAPP)
- ✅ **Feasible**: Hard, ale možné přes Electron

### Smart Library
- ✅ **Open-source**: SQLite + music-metadata
- ✅ **Essential**: Základní funkce pro library management
- ✅ **Power**: Smart playlists jsou killer feature
- ✅ **Implementovatelné**: Hard, ale standardní technologie

---

## 🚀 Next Steps

1. **Rozhodnutí**: Souhlasíš s TOP 3?
2. **Prioritizace**: Které implementovat jako první?
3. **Start**: Můžu začít s Phase 1 (DSP Chain)

**Ready to start?** 🎵
