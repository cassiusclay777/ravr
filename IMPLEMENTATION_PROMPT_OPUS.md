# RAVR Audio Player - EUPH + DSP Implementation Prompt for Claude OPUS 4.5

## Context

You are implementing Phase 1 of the RAVR audio player upgrade. RAVR is a desktop audio player built with:
- **Frontend**: React + TypeScript + Vite
- **Audio**: Web Audio API + custom EUPH format
- **State**: Zustand
- **Desktop**: Electron (planned)

## What Already Exists (CRITICAL)

### EUPH Format - 90% Complete
Located in `src/formats/`:
- ✅ **EuphFormat.ts** (480 lines) - Full encoder/decoder with WASM support
- ✅ **EUPHCodec.ts** (466 lines) - Pure TypeScript codec with pako compression
- ✅ **EUPHEncoder.ts** - Encodes audio + metadata + DSP settings + AI data
- ✅ **EUPHDecoder.ts** - Decodes all chunks

EUPH stores:
```typescript
interface EuphMetadata {
  title, artist, album, year, genre
  sampleRate, bitDepth, channels, duration
  dspChain?: string[]          // DSP module list
  replayGain?: number
  aiProcessed: boolean
  aiModel?: string
  aiParameters?: Record<string, any>
}
```

**What's Missing**: Integration into AutoPlayer - player can't load .euph files yet

### DSP System - 70% Complete
Located in `src/dsp/`:
- ✅ **11 DSP modules** exist: ParametricEQ, MultibandCompressor, TruePeakLimiter, Crossfeed, StereoEnhancer, TransientShaper, ConvolutionReverb, EQPresets, RelativisticEffects, SpatialAudio, FFTProcessor
- ✅ **ModuleRegistry.ts** (111 lines) - Singleton registry for DSP modules, can create modules by type
- ✅ **dspChain.ts** (108 lines) - Basic FIXED chain (gain → compressor → limiter → analyzer)

**What's Missing**:
- Modular chain (current chain is fixed, can't add/remove/reorder modules)
- UI for DSP chain editing
- Integration with ModuleRegistry

### AutoPlayer - Current Implementation
Located in `src/audio/player.ts` (362 lines):
- ✅ Singleton pattern
- ✅ Gapless playback with crossfade
- ✅ ReplayGain support
- ✅ BroadcastChannel for multi-instance

**Missing EUPH support** - needs detection and loading logic

## Your Mission: Phase 1 - EUPH + DSP Integration (20 hours)

You will implement 6 tasks to complete the existing EUPH and DSP infrastructure:

---

## Task 1.1: EUPH File Detection & Loading (3 hours)

**Goal**: AutoPlayer can load and play .euph files

**File to modify**: `src/audio/player.ts`

**Implementation**:

1. Import EUPH decoder at top:
```typescript
import { EuphDecoder } from '../formats/EUPHDecoder';
```

2. Add EUPH loading method to AutoPlayer class:
```typescript
private async loadEuphFile(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new EuphDecoder();

    const decoded = await decoder.decode(arrayBuffer, (progress, stage) => {
      console.log(`EUPH decode: ${stage} ${progress}%`);
    });

    // 1. Create audio blob from decoded audio data
    const audioBlob = new Blob([decoded.audioData], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);

    // 2. Apply DSP settings if present
    if (decoded.dspSettings) {
      console.log('Applying DSP settings from EUPH:', decoded.dspSettings);
      // TODO: Will be implemented in Task 1.2
      // this.applyDspSettings(decoded.dspSettings);
    }

    // 3. Apply AI enhancements if present
    if (decoded.aiData) {
      console.log('AI enhancement data found:', decoded.aiData);
      // Store for future AI processing
    }

    // 4. Load audio normally with metadata
    const replayGain = decoded.metadata.replayGain ? {
      trackGain: decoded.metadata.replayGain,
      trackPeak: 1.0,
      albumGain: undefined,
      albumPeak: undefined
    } : undefined;

    return await this.load(audioUrl, replayGain);
  } catch (error) {
    console.error('Failed to load EUPH file:', error);
    return false;
  }
}
```

3. Modify existing `load()` method to detect .euph files:
```typescript
async load(source: string | File | Blob, replayGain?: ReplayGainData): Promise<boolean> {
  // Detect EUPH file
  if (source instanceof File && source.name.endsWith('.euph')) {
    return await this.loadEuphFile(source);
  }

  // Rest of existing load logic...
  // (keep all existing code)
}
```

**Test**: Try loading a .euph file, should decode and play audio

---

## Task 1.2: DSP Settings Export/Import (2 hours)

**Goal**: Save and restore DSP chain configuration

**Create new file**: `src/dsp/DspSettingsManager.ts`

```typescript
import { DSPModule } from './types';
import { moduleRegistry } from './ModuleRegistry';
import { AudioContextType } from './audioTypes';

export interface DSPModuleConfig {
  id: string;
  type: string;
  enabled: boolean;
  parameters: Record<string, any>;
}

export interface DSPChainConfig {
  version: string;
  modules: DSPModuleConfig[];
  replayGain?: {
    enabled: boolean;
    preamp: number;
  };
}

export class DspSettingsManager {
  /**
   * Export current DSP chain configuration
   */
  static exportSettings(modules: DSPModule[], replayGainEnabled: boolean, replayGainPreamp: number): DSPChainConfig {
    return {
      version: '1.0',
      modules: modules.map(module => ({
        id: module.id,
        type: module.type,
        enabled: module.enabled,
        parameters: module.getParameters()
      })),
      replayGain: {
        enabled: replayGainEnabled,
        preamp: replayGainPreamp
      }
    };
  }

  /**
   * Import DSP chain configuration and recreate modules
   */
  static importSettings(
    config: DSPChainConfig,
    audioContext: AudioContextType
  ): DSPModule[] {
    const recreatedModules: DSPModule[] = [];

    for (const moduleConfig of config.modules) {
      const module = moduleRegistry.createModule(
        moduleConfig.type as any,
        audioContext,
        moduleConfig.id
      );

      if (module) {
        module.enabled = moduleConfig.enabled;
        module.setParameters(moduleConfig.parameters);
        recreatedModules.push(module);
      } else {
        console.warn(`Could not recreate module: ${moduleConfig.type}`);
      }
    }

    return recreatedModules;
  }

  /**
   * Serialize to JSON string
   */
  static serialize(config: DSPChainConfig): string {
    return JSON.stringify(config, null, 2);
  }

  /**
   * Deserialize from JSON string
   */
  static deserialize(json: string): DSPChainConfig {
    return JSON.parse(json);
  }
}
```

**Update player.ts**:
```typescript
import { DspSettingsManager } from '../dsp/DspSettingsManager';

// Add to AutoPlayer class:
exportDspSettings(): string {
  // TODO: Replace with actual module list from modular chain
  const modules: DSPModule[] = []; // Will be populated in Task 2.3
  return DspSettingsManager.serialize(
    DspSettingsManager.exportSettings(modules, true, 0)
  );
}

applyDspSettings(settingsJson: string | object): void {
  try {
    const config = typeof settingsJson === 'string'
      ? DspSettingsManager.deserialize(settingsJson)
      : settingsJson;

    const modules = DspSettingsManager.importSettings(config, this.ctx);
    console.log('Applied DSP settings:', modules.length, 'modules');
    // TODO: Replace chain with new modules (Task 2.3)
  } catch (error) {
    console.error('Failed to apply DSP settings:', error);
  }
}
```

**Update Task 1.1**: Uncomment the DSP settings line:
```typescript
if (decoded.dspSettings) {
  this.applyDspSettings(decoded.dspSettings);
}
```

---

## Task 1.3: EUPH Export UI Component (3 hours)

**Goal**: User can export current track as .euph file

**Create new file**: `src/components/export/EuphExporter.tsx`

```typescript
import React, { useState } from 'react';
import { EuphEncoder } from '../../formats/EUPHEncoder';
import { EUPHMetadata } from '../../formats/EUPHCodec';

interface Props {
  audioBuffer?: AudioBuffer;
  metadata?: Partial<EUPHMetadata>;
  getDspSettings?: () => object;
  disabled?: boolean;
}

export const EuphExporter: React.FC<Props> = ({
  audioBuffer,
  metadata,
  getDspSettings,
  disabled = false
}) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  const handleExport = async () => {
    if (!audioBuffer || !metadata) {
      alert('No audio loaded to export');
      return;
    }

    setExporting(true);
    setProgress(0);

    try {
      // 1. Prepare metadata
      const euphMetadata: EUPHMetadata = {
        title: metadata.title || 'Untitled',
        artist: metadata.artist || 'Unknown Artist',
        album: metadata.album,
        genre: metadata.genre,
        year: metadata.year,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        bitDepth: 16, // Or detect from source
        encodingProfile: 'lossless',
        enhancementData: {
          aiProcessed: false,
          dspSettings: getDspSettings?.()
        }
      };

      // 2. Convert AudioBuffer to ArrayBuffer
      const audioData = audioBufferToArrayBuffer(audioBuffer);

      // 3. Encode to EUPH
      const encoder = new EuphEncoder();
      const euphData = await encoder.encode(
        audioData,
        euphMetadata,
        {
          profile: 'lossless',
          compressionLevel: 6,
          includeDSPSettings: true,
          includeAIData: false,
          enableIntegrityCheck: true
        },
        (prog, stg) => {
          setProgress(prog);
          setStage(stg);
        }
      );

      // 4. Download file
      const blob = new Blob([euphData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${metadata.title || 'audio'}.euph`;
      a.click();
      URL.revokeObjectURL(url);

      alert('EUPH file exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
      setProgress(0);
      setStage('');
    }
  };

  return (
    <div className="euph-exporter">
      <button
        onClick={handleExport}
        disabled={disabled || exporting || !audioBuffer}
        className="export-btn"
      >
        {exporting ? `Exporting... ${progress}%` : 'Export to EUPH'}
      </button>
      {exporting && (
        <div className="export-progress">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <span>{stage}</span>
        </div>
      )}
    </div>
  );
};

// Helper function
function audioBufferToArrayBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;

  // Create interleaved PCM data
  const interleaved = new Float32Array(length * channels);

  for (let ch = 0; ch < channels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      interleaved[i * channels + ch] = channelData[i];
    }
  }

  // Convert to 16-bit PCM
  const pcm16 = new Int16Array(interleaved.length);
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  return pcm16.buffer;
}
```

**Add to player controls** (e.g., `src/components/PlayerControls.tsx`):
```typescript
import { EuphExporter } from './export/EuphExporter';

// Inside component:
<EuphExporter
  audioBuffer={currentAudioBuffer}
  metadata={currentMetadata}
  getDspSettings={() => player.exportDspSettings()}
/>
```

**Add basic CSS** (`src/components/export/EuphExporter.css`):
```css
.euph-exporter {
  margin: 10px 0;
}

.export-btn {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.export-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.export-progress {
  margin-top: 10px;
}

.progress-bar {
  height: 4px;
  background: #4CAF50;
  transition: width 0.3s;
}
```

---

## Task 2.1: Create ModularDspChain Class (4 hours)

**Goal**: Replace fixed DSP chain with modular, reorderable chain

**Create new file**: `src/dsp/ModularDspChain.ts`

```typescript
import { DSPModule } from './types';
import { AudioContextType } from './audioTypes';

export interface ModularDspChainConfig {
  modules: {
    id: string;
    type: string;
    enabled: boolean;
    parameters: Record<string, any>;
  }[];
}

export class ModularDspChain {
  private audioContext: AudioContextType;
  private modules: DSPModule[] = [];

  private input: GainNode;
  private output: GainNode;
  private analyzer: AnalyserNode;

  constructor(audioContext: AudioContextType) {
    this.audioContext = audioContext;

    // Create input/output nodes
    this.input = this.audioContext.createGain();
    this.output = this.audioContext.createGain();
    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = 256;

    // Initially connect input → analyzer → output
    this.reconnectChain();
  }

  /**
   * Add module to end of chain
   */
  addModule(module: DSPModule): void {
    this.modules.push(module);
    this.reconnectChain();
  }

  /**
   * Insert module at specific index
   */
  insertModule(module: DSPModule, index: number): void {
    this.modules.splice(index, 0, module);
    this.reconnectChain();
  }

  /**
   * Remove module by ID
   */
  removeModule(id: string): void {
    const index = this.modules.findIndex(m => m.id === id);
    if (index !== -1) {
      this.modules.splice(index, 1);
      this.reconnectChain();
    }
  }

  /**
   * Move module from one index to another
   */
  moveModule(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.modules.length) return;
    if (toIndex < 0 || toIndex >= this.modules.length) return;

    const [module] = this.modules.splice(fromIndex, 1);
    this.modules.splice(toIndex, 0, module);
    this.reconnectChain();
  }

  /**
   * Get all modules
   */
  getModules(): DSPModule[] {
    return [...this.modules];
  }

  /**
   * Get module by ID
   */
  getModule(id: string): DSPModule | undefined {
    return this.modules.find(m => m.id === id);
  }

  /**
   * Clear all modules
   */
  clearModules(): void {
    this.modules = [];
    this.reconnectChain();
  }

  /**
   * Reconnect entire audio chain
   */
  private reconnectChain(): void {
    // Disconnect everything first
    this.input.disconnect();
    this.modules.forEach(m => m.getNode().disconnect());
    this.analyzer.disconnect();

    // Build new chain: input → modules → analyzer → output
    let currentNode: AudioNode = this.input;

    for (const module of this.modules) {
      if (module.enabled) {
        currentNode.connect(module.getNode());
        currentNode = module.getNode();
      }
    }

    // Connect to analyzer
    currentNode.connect(this.analyzer);
    this.analyzer.connect(this.output);
  }

  /**
   * Get input node
   */
  getInput(): AudioNode {
    return this.input;
  }

  /**
   * Get output node
   */
  getOutput(): AudioNode {
    return this.output;
  }

  /**
   * Get analyzer node
   */
  getAnalyzer(): AnalyserNode {
    return this.analyzer;
  }

  /**
   * Serialize chain config
   */
  serialize(): ModularDspChainConfig {
    return {
      modules: this.modules.map(m => ({
        id: m.id,
        type: m.type,
        enabled: m.enabled,
        parameters: m.getParameters()
      }))
    };
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.input.disconnect();
    this.modules.forEach(m => m.dispose?.());
    this.analyzer.disconnect();
    this.output.disconnect();
    this.modules = [];
  }
}
```

---

## Task 2.2: Build DSP Chain Panel UI (5 hours)

**Goal**: Visual drag & drop interface for DSP chain

**Install dependency**:
```bash
npm install react-beautiful-dnd
npm install -D @types/react-beautiful-dnd
```

**Create new file**: `src/components/dsp/DspChainPanel.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { DSPModule } from '../../dsp/types';
import { moduleRegistry } from '../../dsp/ModuleRegistry';
import { ModularDspChain } from '../../dsp/ModularDspChain';

interface Props {
  chain: ModularDspChain;
}

export const DspChainPanel: React.FC<Props> = ({ chain }) => {
  const [modules, setModules] = useState<DSPModule[]>([]);
  const [availableModules, setAvailableModules] = useState<any[]>([]);

  useEffect(() => {
    // Load available module types
    setAvailableModules(moduleRegistry.listModules());

    // Load current chain
    refreshModules();
  }, [chain]);

  const refreshModules = () => {
    setModules(chain.getModules());
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const fromIndex = result.source.index;
    const toIndex = result.destination.index;

    chain.moveModule(fromIndex, toIndex);
    refreshModules();
  };

  const handleAddModule = (type: string) => {
    const audioContext = (chain as any).audioContext;
    const id = `${type}-${Date.now()}`;
    const module = moduleRegistry.createModule(type as any, audioContext, id);

    if (module) {
      chain.addModule(module);
      refreshModules();
    }
  };

  const handleRemoveModule = (id: string) => {
    chain.removeModule(id);
    refreshModules();
  };

  const handleToggleEnabled = (id: string) => {
    const module = chain.getModule(id);
    if (module) {
      module.enabled = !module.enabled;
      refreshModules();
    }
  };

  return (
    <div className="dsp-chain-panel">
      <div className="panel-header">
        <h2>DSP Chain</h2>
        <select onChange={(e) => handleAddModule(e.target.value)} value="">
          <option value="">+ Add Module</option>
          {availableModules.map(mod => (
            <option key={mod.type} value={mod.type}>{mod.name}</option>
          ))}
        </select>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dsp-chain">
          {(provided) => (
            <div
              className="module-list"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {modules.map((module, index) => (
                <Draggable
                  key={module.id}
                  draggableId={module.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`module-card ${snapshot.isDragging ? 'dragging' : ''} ${!module.enabled ? 'disabled' : ''}`}
                    >
                      <div className="module-header">
                        <span className="drag-handle">⋮⋮</span>
                        <span className="module-name">{module.type}</span>
                        <div className="module-controls">
                          <button
                            onClick={() => handleToggleEnabled(module.id)}
                            className={`toggle-btn ${module.enabled ? 'active' : ''}`}
                          >
                            {module.enabled ? '🔊' : '🔇'}
                          </button>
                          <button
                            onClick={() => handleRemoveModule(module.id)}
                            className="remove-btn"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="module-params">
                        {/* TODO: Render parameter controls based on module type */}
                        <div className="params-placeholder">
                          {Object.entries(module.getParameters()).map(([key, value]) => (
                            <div key={key} className="param">
                              <label>{key}</label>
                              <span>{typeof value === 'number' ? value.toFixed(2) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {modules.length === 0 && (
        <div className="empty-state">
          No DSP modules. Add one from the dropdown above.
        </div>
      )}
    </div>
  );
};
```

**Create CSS file**: `src/components/dsp/DspChainPanel.css`

```css
.dsp-chain-panel {
  background: #1e1e1e;
  color: #fff;
  padding: 20px;
  border-radius: 8px;
  min-height: 400px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
}

.panel-header select {
  padding: 8px 12px;
  background: #2d2d2d;
  color: #fff;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
}

.module-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100px;
}

.module-card {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 16px;
  transition: all 0.2s;
}

.module-card.dragging {
  background: #3d3d3d;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.module-card.disabled {
  opacity: 0.5;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.drag-handle {
  cursor: grab;
  color: #888;
  font-size: 18px;
}

.module-name {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
}

.module-controls {
  display: flex;
  gap: 8px;
}

.toggle-btn, .remove-btn {
  background: #3d3d3d;
  border: 1px solid #555;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.toggle-btn.active {
  background: #4CAF50;
}

.remove-btn:hover {
  background: #d32f2f;
}

.module-params {
  border-top: 1px solid #444;
  padding-top: 12px;
}

.params-placeholder {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.param {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param label {
  font-size: 11px;
  color: #aaa;
  text-transform: uppercase;
}

.param span {
font-size: 13px;
  color: #fff;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #888;
  font-style: italic;
}
```

---

## Task 2.3: Integration (3 hours)

**Goal**: Wire everything together in AutoPlayer and UI

**Update**: `src/audio/player.ts`

```typescript
import { ModularDspChain } from '../dsp/ModularDspChain';
import { DspSettingsManager } from '../dsp/DspSettingsManager';

export class AutoPlayer {
  // Replace:
  // private chain: AutoChain;

  // With:
  private chain: ModularDspChain;

  constructor() {
    // ... existing code ...

    // Replace chain creation:
    // this.chain = createAutoChain(this.ctx, dspPrefs);

    // With:
    this.chain = new ModularDspChain(this.ctx);

    // Connect chain
    this.sourceEl.connect(this.chain.getInput());
    this.chain.getOutput().connect(this.replayGainNode);

    // ... rest of constructor ...
  }

  // Update exportDspSettings:
  exportDspSettings(): string {
    const modules = this.chain.getModules();
    return DspSettingsManager.serialize(
      DspSettingsManager.exportSettings(modules, true, 0)
    );
  }

  // Update applyDspSettings:
  applyDspSettings(settingsJson: string | object): void {
    try {
      const config = typeof settingsJson === 'string'
        ? DspSettingsManager.deserialize(settingsJson)
        : settingsJson;

      // Clear existing modules
      this.chain.clearModules();

      // Recreate modules
      const modules = DspSettingsManager.importSettings(config, this.ctx);
      modules.forEach(module => this.chain.addModule(module));

      console.log('Applied DSP settings:', modules.length, 'modules');
    } catch (error) {
      console.error('Failed to apply DSP settings:', error);
    }
  }

  // Expose chain for UI
  getDspChain(): ModularDspChain {
    return this.chain;
  }
}
```

**Add DSP panel to UI**: Update `src/App.tsx` or create a new route

```typescript
import { DspChainPanel } from './components/dsp/DspChainPanel';
import { useAutoPlayer } from './hooks/useAutoPlayer';

function App() {
  const player = useAutoPlayer();

  return (
    <div className="app">
      {/* Existing player controls */}

      {/* Add DSP panel */}
      <div className="dsp-section">
        <DspChainPanel chain={player.getDspChain()} />
      </div>
    </div>
  );
}
```

**Update**: `src/hooks/useAutoPlayer.ts` if needed to expose DSP chain

```typescript
export const useAutoPlayer = () => {
  const player = AutoPlayer.getInstance();

  return {
    // ... existing methods ...
    getDspChain: () => player.getDspChain(),
    exportDspSettings: () => player.exportDspSettings(),
    applyDspSettings: (settings: string | object) => player.applyDspSettings(settings)
  };
};
```

---

## Testing Checklist

After implementation, verify:

### Task 1.1 ✓
- [ ] Load a .euph file → should decode and play audio
- [ ] Check console for "EUPH decode" progress logs
- [ ] Verify metadata is extracted correctly

### Task 1.2 ✓
- [ ] Call `player.exportDspSettings()` → returns JSON string
- [ ] Call `player.applyDspSettings(json)` → recreates modules
- [ ] Console shows "Applied DSP settings: X modules"

### Task 1.3 ✓
- [ ] Click "Export to EUPH" button with audio loaded
- [ ] Progress bar shows encoding progress
- [ ] .euph file downloads successfully
- [ ] Can re-load the exported .euph file

### Task 2.1 ✓
- [ ] Create ModularDspChain instance
- [ ] Add/remove modules → chain reconnects
- [ ] Move module → order changes
- [ ] Disable module → audio bypasses it

### Task 2.2 ✓
- [ ] DSP panel renders with module list
- [ ] Drag & drop reordering works
- [ ] Add module from dropdown → appears in list
- [ ] Remove module → disappears from list
- [ ] Toggle enabled/disabled → visual feedback

### Task 2.3 ✓
- [ ] AutoPlayer uses ModularDspChain
- [ ] Load .euph with DSP settings → modules auto-apply
- [ ] Export .euph → includes current DSP chain
- [ ] UI updates when modules change

---

## Dependencies

You may need to install:
```bash
npm install react-beautiful-dnd
npm install -D @types/react-beautiful-dnd
```

Existing dependencies (should already be installed):
- `pako` (compression for EUPH)
- `zustand` (state management)

---

## Success Criteria

Phase 1 is complete when:
1. ✅ User can drag & drop a .euph file into RAVR
2. ✅ RAVR decodes and plays the audio
3. ✅ DSP settings from .euph are automatically applied
4. ✅ User can modify DSP chain (add/remove/reorder modules)
5. ✅ User can export current track + DSP settings as .euph
6. ✅ Exported .euph can be re-loaded with full fidelity

---

## Notes

- **Backward compatibility**: Old AutoChain can coexist - just switch the class used
- **Error handling**: Wrap all EUPH operations in try-catch
- **Performance**: EUPH encoding/decoding is async, use progress callbacks
- **TypeScript**: Add proper types for all new functions
- **Testing**: Test with various audio formats before EUPH export

---

## Project Structure Reference

```
src/
├── audio/
│   └── player.ts          # AutoPlayer (modify Task 1.1, 2.3)
├── dsp/
│   ├── ModuleRegistry.ts  # Already exists (use in Task 1.2, 2.1)
│   ├── dspChain.ts        # Old chain (will be replaced)
│   ├── DspSettingsManager.ts  # Create in Task 1.2
│   └── ModularDspChain.ts     # Create in Task 2.1
├── formats/
│   ├── EUPHCodec.ts       # Already exists (use in Task 1.1)
│   ├── EUPHEncoder.ts     # Already exists (use in Task 1.3)
│   └── EUPHDecoder.ts     # Already exists (use in Task 1.1)
└── components/
    ├── export/
    │   └── EuphExporter.tsx   # Create in Task 1.3
    └── dsp/
        └── DspChainPanel.tsx  # Create in Task 2.2
```

---

## Additional Context

Read these files for full context:
- `c:\ravr-fixed\EUPH_DSP_STATUS.md` - Current implementation status
- `c:\ravr-fixed\cashi_upgrade.md` - Full upgrade plan
- `c:\ravr-fixed\RAVR_PROJECT_GUIDE.md` - Project architecture

---

**Start with Task 1.1 and work sequentially. Each task builds on the previous one. Good luck!** 🚀
