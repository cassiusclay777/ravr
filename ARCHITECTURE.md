# RAVR Audio Player - Architecture Documentation

## Project Structure

```
src/
├── core/                           # 🎯 Core Domain Layer (Pure TypeScript)
│   ├── audio/                     # Audio engine domain
│   │   ├── interfaces/
│   │   │   ├── IAudioEngine.ts    # Main audio engine interface
│   │   │   ├── IAudioDecoder.ts   # Decoder interface
│   │   │   ├── IAudioSource.ts    # Audio source abstraction
│   │   │   └── IAudioOutput.ts    # Output device interface
│   │   ├── models/
│   │   │   ├── Track.ts           # Track model
│   │   │   ├── AudioFormat.ts     # Format definitions
│   │   │   └── PlaybackState.ts   # State machine
│   │   └── events/
│   │       └── AudioEvents.ts     # Audio engine events
│   │
│   ├── dsp/                       # DSP domain
│   │   ├── interfaces/
│   │   │   ├── IDspNode.ts        # Base DSP node interface
│   │   │   ├── IDspChain.ts       # DSP chain interface
│   │   │   └── IDspPreset.ts      # DSP preset interface
│   │   ├── nodes/
│   │   │   ├── IEqualizer.ts      # EQ interface
│   │   │   ├── ICompressor.ts     # Compressor interface
│   │   │   ├── ICrossfeed.ts      # Crossfeed interface
│   │   │   └── ILimiter.ts        # Limiter interface
│   │   └── models/
│   │       ├── DspParameters.ts   # DSP parameter types
│   │       └── FilterTypes.ts     # Filter definitions
│   │
│   ├── library/                   # Library domain
│   │   ├── interfaces/
│   │   │   ├── ILibrary.ts        # Library interface
│   │   │   ├── IIndexer.ts        # Indexer interface
│   │   │   └── IMetadataReader.ts # Metadata reader
│   │   ├── models/
│   │   │   ├── Track.ts           # Track entity
│   │   │   ├── Album.ts           # Album entity
│   │   │   ├── Artist.ts          # Artist entity
│   │   │   └── Genre.ts           # Genre entity
│   │   └── queries/
│   │       └── LibraryQuery.ts    # Query builder
│   │
│   ├── playlist/                  # Playlist domain
│   │   ├── interfaces/
│   │   │   ├── IPlaylist.ts       # Playlist interface
│   │   │   ├── IQueue.ts          # Queue interface
│   │   │   └── ISmartPlaylist.ts  # Smart playlist
│   │   └── models/
│   │       ├── Playlist.ts        # Playlist entity
│   │       └── PlaylistRule.ts    # Smart playlist rules
│   │
│   ├── output/                    # Output management domain
│   │   ├── interfaces/
│   │   │   ├── IOutputDevice.ts   # Output device interface
│   │   │   ├── IRenderer.ts       # Network renderer (UPnP/DLNA)
│   │   │   └── IBitPerfect.ts     # Bit-perfect mode
│   │   └── models/
│   │       ├── OutputDevice.ts    # Device model
│   │       └── OutputCapabilities.ts # Device capabilities
│   │
│   ├── source/                    # Source management domain
│   │   ├── interfaces/
│   │   │   ├── IFileSource.ts     # File source interface
│   │   │   ├── INetworkSource.ts  # Network source (SMB, FTP, etc.)
│   │   │   └── IStreamSource.ts   # Streaming source
│   │   └── models/
│   │       └── SourceLocation.ts  # Source location model
│   │
│   └── types/                     # Shared types
│       ├── common.ts              # Common types
│       ├── audio.ts               # Audio-related types
│       └── errors.ts              # Error types
│
├── infrastructure/                 # 🔧 Infrastructure Layer
│   ├── audio/
│   │   ├── WebAudioEngine.ts      # Web Audio API implementation
│   │   ├── decoders/
│   │   │   ├── MP3Decoder.ts
│   │   │   ├── FLACDecoder.ts
│   │   │   └── WavDecoder.ts
│   │   └── analyzers/
│   │       ├── SpectrumAnalyzer.ts
│   │       └── WaveformAnalyzer.ts
│   │
│   ├── dsp/
│   │   ├── WebAudioDspChain.ts    # Web Audio DSP implementation
│   │   ├── nodes/
│   │   │   ├── ParametricEQ.ts    # Parametric EQ implementation
│   │   │   ├── GraphicEQ.ts       # Graphic EQ implementation
│   │   │   ├── DynamicsCompressor.ts
│   │   │   ├── Limiter.ts
│   │   │   ├── Crossfeed.ts
│   │   │   └── Dithering.ts
│   │   └── presets/
│   │       └── DspPresetManager.ts
│   │
│   ├── outputs/
│   │   ├── LocalAudioOutput.ts    # Local device output
│   │   ├── WASAPIOutput.ts        # WASAPI (Windows)
│   │   ├── ASIOOutput.ts          # ASIO (professional audio)
│   │   ├── renderers/
│   │   │   ├── UPnPRenderer.ts    # UPnP/DLNA renderer
│   │   │   ├── ChromecastRenderer.ts
│   │   │   └── AirPlayRenderer.ts
│   │   └── BitPerfectManager.ts   # Bit-perfect mode manager
│   │
│   ├── sources/
│   │   ├── LocalFileSource.ts     # Local file system
│   │   ├── network/
│   │   │   ├── SMBSource.ts       # SMB/CIFS
│   │   │   ├── FTPSource.ts       # FTP
│   │   │   ├── WebDAVSource.ts    # WebDAV
│   │   │   └── UPnPSource.ts      # UPnP/DLNA media server
│   │   └── streaming/
│   │       ├── TidalSource.ts     # TIDAL (future)
│   │       └── QobuzSource.ts     # Qobuz (future)
│   │
│   ├── storage/
│   │   ├── LibraryDatabase.ts     # SQLite/IndexedDB wrapper
│   │   ├── indexer/
│   │   │   ├── FileIndexer.ts     # File system indexer
│   │   │   └── MetadataExtractor.ts # Tag reading (music-metadata)
│   │   └── cache/
│   │       └── CacheManager.ts    # Artwork, metadata cache
│   │
│   └── platform/
│       ├── electron/              # Electron-specific code
│       │   ├── ipc/              # IPC handlers
│       │   └── native/           # Native modules
│       └── tauri/                # Tauri-specific code
│
├── application/                   # 🎮 Application Layer
│   ├── services/
│   │   ├── AudioService.ts        # Main audio service
│   │   ├── LibraryService.ts      # Library management
│   │   ├── PlaylistService.ts     # Playlist management
│   │   ├── DspService.ts          # DSP management
│   │   ├── OutputService.ts       # Output device management
│   │   └── AnalyzerService.ts     # Real-time analysis
│   │
│   ├── use-cases/                 # Business logic use cases
│   │   ├── playback/
│   │   │   ├── PlayTrack.ts
│   │   │   ├── PausePlayback.ts
│   │   │   ├── SeekToPosition.ts
│   │   │   └── ChangeOutputDevice.ts
│   │   ├── library/
│   │   │   ├── IndexLibrary.ts
│   │   │   ├── SearchTracks.ts
│   │   │   └── UpdateMetadata.ts
│   │   └── dsp/
│   │       ├── ApplyDspPreset.ts
│   │       └── ReorderDspChain.ts
│   │
│   ├── state/                     # State management
│   │   ├── stores/
│   │   │   ├── playbackStore.ts   # Playback state (Zustand)
│   │   │   ├── libraryStore.ts    # Library state
│   │   │   ├── dspStore.ts        # DSP state
│   │   │   ├── playlistStore.ts   # Playlist state
│   │   │   └── uiStore.ts         # UI state (layout, theme)
│   │   └── selectors/
│   │       └── librarySelectors.ts
│   │
│   └── hooks/                     # React hooks
│       ├── usePlayback.ts         # Playback control hook
│       ├── useLibrary.ts          # Library access hook
│       ├── useDspChain.ts         # DSP chain hook
│       ├── useAnalyzer.ts         # Analyzer hook
│       └── useOutputDevices.ts    # Output devices hook
│
├── presentation/                  # 🎨 UI Layer
│   ├── components/
│   │   ├── player/
│   │   │   ├── PlayerControls.tsx
│   │   │   ├── SeekBar.tsx
│   │   │   ├── VolumeControl.tsx
│   │   │   └── NowPlaying.tsx
│   │   ├── library/
│   │   │   ├── LibraryBrowser.tsx
│   │   │   ├── TrackList.tsx
│   │   │   ├── AlbumGrid.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── playlist/
│   │   │   ├── PlaylistPanel.tsx
│   │   │   ├── QueuePanel.tsx
│   │   │   └── SmartPlaylistEditor.tsx
│   │   ├── dsp/
│   │   │   ├── DspChainPanel.tsx
│   │   │   ├── EqualizerPanel.tsx
│   │   │   ├── CompressorPanel.tsx
│   │   │   └── DspPresetSelector.tsx
│   │   ├── analyzers/
│   │   │   ├── SpectrumAnalyzer.tsx
│   │   │   ├── WaveformDisplay.tsx
│   │   │   └── LevelMeters.tsx
│   │   └── common/
│   │       ├── Knob.tsx           # Rotary knob control
│   │       ├── Slider.tsx
│   │       └── Button.tsx
│   │
│   ├── layouts/
│   │   ├── DefaultLayout.tsx      # Default layout
│   │   ├── MinimalLayout.tsx      # Minimal player
│   │   └── LayoutManager.tsx      # Layout switcher
│   │
│   └── views/
│       ├── PlayerView.tsx         # Main player view
│       ├── LibraryView.tsx        # Library view
│       ├── SettingsView.tsx       # Settings
│       └── DspView.tsx            # DSP configuration
│
└── shared/                        # 🛠️ Shared utilities
    ├── events/
    │   ├── EventBus.ts            # Global event bus
    │   └── EventTypes.ts          # Event type definitions
    ├── utils/
    │   ├── audio/
    │   │   ├── formatConversion.ts
    │   │   ├── sampleRateUtils.ts
    │   │   └── replayGain.ts
    │   ├── file/
    │   │   └── pathUtils.ts
    │   └── formatting/
    │       ├── timeFormat.ts
    │       └── bitrateFormat.ts
    └── constants/
        ├── audioFormats.ts
        ├── dspDefaults.ts
        └── uiConstants.ts
```

## Architecture Principles

### 1. Dependency Rule
- Dependencies point INWARD (UI → Application → Core)
- Core has NO dependencies on outer layers
- Infrastructure implements Core interfaces

### 2. Communication Patterns
- **UI ↔ Application**: React hooks, Zustand stores
- **Application ↔ Core**: Direct service calls
- **Core → UI**: Event bus (pub/sub)
- **Cross-cutting**: Event-driven for loose coupling

### 3. Technology Isolation
- Core: Pure TypeScript (platform-agnostic)
- Infrastructure: Platform-specific (Web Audio, Electron, Tauri)
- Easy to swap Web Audio for WASM/Native implementation

### 4. State Management Strategy
- **Zustand** for global app state (playback, library, DSP, UI)
- **React Context** for component-local state
- **Event Bus** for cross-component communication
- **Audio Engine** maintains its own internal state

### 5. Error Handling
- Domain errors (custom error types in core/types/errors.ts)
- Infrastructure errors (network, file I/O, audio device)
- UI error boundaries for crash recovery

## Next Steps
1. Define TypeScript interfaces (Phase 2)
2. Implement core audio engine (Phase 3)
3. Build DSP chain infrastructure (Phase 4)
4. Create library indexer (Phase 5)
5. Develop UI components (Phase 6)
