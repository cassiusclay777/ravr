# 🎵 RAVR Player - Cashi's Professional Upgrade Plan

**Autor:** Cashi
**Datum:** 2025-01-26
**Cíl:** Upgradovat RAVR na profesionální audio player s funkcemi z Neutron/UAPP/foobar2000
**Timeline:** 52 hodin (~6.5 pracovních dní)
**Status:** 🟢 Ready to start

---

## 📋 Executive Summary

RAVR už má **silný základ**:
- ✅ EUPH formát (90% hotovo)
- ✅ 11 DSP modulů (70% hotovo)
- ✅ Gapless playback
- ✅ ReplayGain support
- ✅ Crossfade

**Co přidáme:**
1. 🎛️ **Modulární DSP Chain** (inspirace: foobar2000)
2. 🎚️ **Bit-Perfect Output Mode** (inspirace: USB Audio Player PRO)
3. 📚 **Smart Library + Playlists** (inspirace: foobar2000 + Neutron)

**Všechno 100% open-source!**

---

## 🎯 Upgrade Phases

### Phase 1: EUPH + DSP Integration (20 hodin) 🔥

**Proč jako první:**
- Využijeme co už máme (90% EUPH, 70% DSP)
- Rychlé výsledky (2.5 dne)
- Okamžitá hodnota

#### Week 1, Day 1-2: EUPH File Support (8 hodin)

##### Task 1.1: EUPH File Detection & Loading (3h)

**Files to modify:**
- `src/audio/player.ts`

**Implementation:**
```typescript
// src/audio/player.ts

async load(source: string | File | Blob, replayGain?: ReplayGainData): Promise<boolean> {
  try {
    // Detect EUPH format
    if (source instanceof File && source.name.toLowerCase().endsWith('.euph')) {
      console.log('🎵 Loading EUPH file:', source.name);
      return await this.loadEuphFile(source);
    }

    // Normal loading for other formats
    return await this.loadNormalFile(source, replayGain);
  } catch (e) {
    console.error('Load failed:', e);
    return false;
  }
}

private async loadEuphFile(file: File): Promise<boolean> {
  const buffer = await file.arrayBuffer();

  // Decode EUPH
  const decoder = new EuphDecoder();
  const decoded = await decoder.decode(buffer);

  // 1. Extract audio data
  const audioBlob = new Blob([decoded.audioData], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(audioBlob);

  // 2. Apply metadata
  console.log('📝 EUPH Metadata:', decoded.metadata);

  // 3. Apply DSP settings from EUPH
  if (decoded.dspSettings) {
    console.log('🎛️ Applying EUPH DSP settings:', decoded.dspSettings);
    await this.applyEuphDspSettings(decoded.dspSettings);
  }

  // 4. Apply AI enhancements
  if (decoded.aiEnhancements) {
    console.log('🤖 AI enhancements detected:', decoded.aiEnhancements);
    // TODO: Apply AI enhancements
  }

  // 5. Apply ReplayGain if present
  const replayGain = decoded.metadata.replayGain ? {
    trackGain: decoded.metadata.replayGain,
  } : undefined;

  // 6. Load audio
  return await this.loadNormalFile(audioUrl, replayGain);
}

private async applyEuphDspSettings(settings: Record<string, any>): Promise<void> {
  // TODO: Implement DSP chain rebuild from settings
  console.log('Applying DSP settings:', settings);

  // For now, just apply basic settings
  if (settings.dspChain) {
    console.log('DSP Chain:', settings.dspChain);
  }
}

private async loadNormalFile(source: string | Blob, replayGain?: ReplayGainData): Promise<boolean> {
  // Original load logic (rename existing load code)
  // ... existing code ...
}
```

**Test:**
- [ ] Load .euph file
- [ ] Audio plays correctly
- [ ] Metadata extracted
- [ ] DSP settings logged

---

##### Task 1.2: DSP Settings Export/Import (2h)

**Files to create:**
- `src/audio/DspSettingsManager.ts`

**Implementation:**
```typescript
// src/audio/DspSettingsManager.ts

export interface DspChainConfig {
  version: string;
  modules: DspModuleConfig[];
  replayGain?: {
    mode: 'track' | 'album';
    preamp: number;
  };
}

export interface DspModuleConfig {
  id: string;
  type: string;
  enabled: boolean;
  parameters: Record<string, any>;
  order: number;
}

export class DspSettingsManager {
  /**
   * Export current DSP chain to JSON config
   */
  static exportDspSettings(chain: AutoChain): DspChainConfig {
    return {
      version: '2.0',
      modules: [
        {
          id: 'eq',
          type: 'parametric-eq',
          enabled: true,
          order: 0,
          parameters: {
            low: chain.controls.getEQ?.()?.low || 0,
            mid: chain.controls.getEQ?.()?.mid || 0,
            high: chain.controls.getEQ?.()?.high || 0,
          }
        },
        {
          id: 'compressor',
          type: 'dynamics-compressor',
          enabled: true,
          order: 1,
          parameters: {
            threshold: -24,
            ratio: 12,
            attack: 0.003,
            release: 0.25,
          }
        },
        {
          id: 'limiter',
          type: 'true-peak-limiter',
          enabled: true,
          order: 2,
          parameters: {
            threshold: -0.1,
            release: 0.05,
          }
        }
      ]
    };
  }

  /**
   * Import DSP config and apply to chain
   */
  static applyDspSettings(chain: AutoChain, config: DspChainConfig): void {
    console.log('Applying DSP config version:', config.version);

    // Sort modules by order
    const sortedModules = [...config.modules].sort((a, b) => a.order - b.order);

    for (const module of sortedModules) {
      if (!module.enabled) continue;

      switch (module.type) {
        case 'parametric-eq':
          if (chain.controls.setEQ) {
            chain.controls.setEQ(module.parameters);
          }
          break;

        case 'dynamics-compressor':
          if (chain.controls.setCompressor) {
            chain.controls.setCompressor(module.parameters);
          }
          break;

        case 'stereo-enhancer':
          if (chain.controls.setStereoWidth) {
            chain.controls.setStereoWidth(module.parameters.width || 1);
          }
          break;

        default:
          console.warn('Unknown module type:', module.type);
      }
    }
  }
}
```

**Files to modify:**
- `src/audio/player.ts`

```typescript
// Add to AutoPlayer class

import { DspSettingsManager } from './DspSettingsManager';

// Add method
exportDspSettings(): DspChainConfig {
  return DspSettingsManager.exportDspSettings(this.chain);
}

// Update applyEuphDspSettings
private async applyEuphDspSettings(settings: Record<string, any>): Promise<void> {
  if (settings.modules) {
    DspSettingsManager.applyDspSettings(this.chain, settings as DspChainConfig);
  }
}
```

**Test:**
- [ ] Export DSP settings to JSON
- [ ] Import DSP settings
- [ ] Settings applied correctly

---

##### Task 1.3: EUPH Export UI (3h)

**Files to create:**
- `src/components/export/EuphExporter.tsx`

**Implementation:**
```tsx
// src/components/export/EuphExporter.tsx

import React, { useState } from 'react';
import { EuphEncoder, EuphMetadata } from '@/formats/EuphFormat';
import { useAudioStore } from '@/store/audioStore';
import { useAutoPlayer } from '@/hooks/useAutoPlayer';
import { saveEuphFile } from '@/formats/EuphFormat';

export const EuphExporter: React.FC = () => {
  const { currentTrack } = useAudioStore();
  const player = useAutoPlayer();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    if (!currentTrack) {
      alert('No track loaded');
      return;
    }

    setExporting(true);
    setProgress(0);

    try {
      // 1. Get audio data
      const response = await fetch(currentTrack.url);
      const audioBuffer = await response.arrayBuffer();

      // 2. Create metadata
      const metadata: EuphMetadata = {
        title: currentTrack.title,
        artist: currentTrack.artist || 'Unknown',
        album: currentTrack.album,
        duration: currentTrack.duration,
        sampleRate: 48000, // TODO: Get from actual track
        bitDepth: 24,
        channels: 2,
        aiProcessed: false,
        ravrVersion: '2.0',
      };

      // 3. Create encoder
      const encoder = new EuphEncoder(metadata);

      // 4. Add audio data
      setProgress(30);
      encoder.addAudioData(audioBuffer, 'ZSTD');

      // 5. Add DSP settings
      setProgress(60);
      const dspSettings = player.exportDspSettings();
      encoder.addDSPSettings(dspSettings);

      // 6. Encode
      setProgress(80);
      const euphData = await encoder.encode();

      // 7. Download
      setProgress(100);
      const filename = `${currentTrack.title.replace(/[^a-z0-9]/gi, '_')}.euph`;
      saveEuphFile(euphData, filename);

      alert(`Exported to ${filename}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="euph-exporter p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Export to EUPH</h3>
      <p className="text-sm text-gray-400 mb-4">
        Save with DSP settings and metadata
      </p>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
      >
        {exporting ? `Exporting... ${progress}%` : 'Export to .euph'}
      </button>

      {exporting && (
        <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
```

**Files to modify:**
- `src/components/NowPlaying.tsx` (add export button)

```tsx
// Add to NowPlaying component

import { EuphExporter } from './export/EuphExporter';

// Add to render:
<div className="export-section mt-4">
  <EuphExporter />
</div>
```

**Test:**
- [ ] Export button visible
- [ ] Click exports .euph file
- [ ] File downloads
- [ ] Progress indicator works

---

#### Week 1, Day 3: Modulární DSP Chain Core (4 hodin)

##### Task 2.1: Modular DSP Chain Class (4h)

**Files to create:**
- `src/dsp/ModularDspChain.ts`

**Implementation:**
```typescript
// src/dsp/ModularDspChain.ts

import { moduleRegistry } from './ModuleRegistry';
import { DSPModule, DSPModuleType } from './types';

export interface DspChainConfig {
  modules: {
    id: string;
    type: DSPModuleType;
    enabled: boolean;
    order: number;
    parameters: Record<string, any>;
  }[];
}

export class ModularDspChain {
  private modules: DSPModule[] = [];
  private ctx: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private analyzerNode: AnalyserNode;

  constructor(context: AudioContext) {
    this.ctx = context;

    // Create I/O nodes
    this.inputNode = context.createGain();
    this.outputNode = context.createGain();
    this.analyzerNode = context.createAnalyser();
    this.analyzerNode.fftSize = 2048;

    // Default connection (no modules)
    this.reconnectChain();
  }

  /**
   * Get input node (connect audio source here)
   */
  getInput(): AudioNode {
    return this.inputNode;
  }

  /**
   * Get output node (connect to destination)
   */
  getOutput(): AudioNode {
    return this.outputNode;
  }

  /**
   * Get analyzer for visualization
   */
  getAnalyzer(): AnalyserNode {
    return this.analyzerNode;
  }

  /**
   * Add DSP module to chain
   */
  addModule(type: DSPModuleType, index?: number): DSPModule | null {
    const id = `${type}-${Date.now()}`;
    const module = moduleRegistry.createModule(type, this.ctx, id);

    if (!module) {
      console.error('Failed to create module:', type);
      return null;
    }

    if (index !== undefined && index >= 0 && index <= this.modules.length) {
      this.modules.splice(index, 0, module);
    } else {
      this.modules.push(module);
    }

    this.reconnectChain();
    return module;
  }

  /**
   * Remove module by ID
   */
  removeModule(moduleId: string): void {
    const index = this.modules.findIndex(m => m.id === moduleId);
    if (index === -1) {
      console.warn('Module not found:', moduleId);
      return;
    }

    const module = this.modules[index];
    module.disconnect?.();
    this.modules.splice(index, 1);
    this.reconnectChain();
  }

  /**
   * Move module to new position
   */
  moveModule(moduleId: string, newIndex: number): void {
    const oldIndex = this.modules.findIndex(m => m.id === moduleId);
    if (oldIndex === -1) {
      console.warn('Module not found:', moduleId);
      return;
    }

    const [module] = this.modules.splice(oldIndex, 1);
    this.modules.splice(newIndex, 0, module);
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
  getModule(moduleId: string): DSPModule | undefined {
    return this.modules.find(m => m.id === moduleId);
  }

  /**
   * Enable/disable module
   */
  setModuleEnabled(moduleId: string, enabled: boolean): void {
    const module = this.getModule(moduleId);
    if (!module) return;

    module.enabled = enabled;
    this.reconnectChain();
  }

  /**
   * Clear all modules
   */
  clear(): void {
    for (const module of this.modules) {
      module.disconnect?.();
    }
    this.modules = [];
    this.reconnectChain();
  }

  /**
   * Reconnect entire chain
   */
  private reconnectChain(): void {
    // Disconnect everything first
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.analyzerNode.disconnect();

      for (const module of this.modules) {
        module.getOutput?.()?.disconnect();
      }
    } catch (e) {
      // Ignore disconnect errors
    }

    // Rebuild chain
    let currentNode: AudioNode = this.inputNode;

    // Connect enabled modules in order
    for (const module of this.modules) {
      if (module.enabled && module.getInput && module.getOutput) {
        currentNode.connect(module.getInput());
        currentNode = module.getOutput();
      }
    }

    // Connect to analyzer and output
    currentNode.connect(this.analyzerNode);
    this.analyzerNode.connect(this.outputNode);

    console.log('DSP chain reconnected:', this.modules.map(m => m.type).join(' → '));
  }

  /**
   * Serialize chain to config
   */
  serialize(): DspChainConfig {
    return {
      modules: this.modules.map((module, index) => ({
        id: module.id,
        type: module.type,
        enabled: module.enabled ?? true,
        order: index,
        parameters: module.getParameters?.() || {},
      }))
    };
  }

  /**
   * Load chain from config
   */
  deserialize(config: DspChainConfig): void {
    this.clear();

    // Sort by order
    const sorted = [...config.modules].sort((a, b) => a.order - b.order);

    for (const moduleConfig of sorted) {
      const module = this.addModule(moduleConfig.type);
      if (module) {
        module.enabled = moduleConfig.enabled;
        module.setParameters?.(moduleConfig.parameters);
      }
    }
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.clear();
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.analyzerNode.disconnect();
  }
}
```

**Test:**
- [ ] Create chain
- [ ] Add modules
- [ ] Remove modules
- [ ] Move modules
- [ ] Serialize/deserialize

---

#### Week 1, Day 4-5: DSP Chain UI (8 hodin)

##### Task 2.2: DSP Chain Panel (5h)

**Files to create:**
- `src/components/dsp/DspChainPanel.tsx`

**Implementation:**
```tsx
// src/components/dsp/DspChainPanel.tsx

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { DSPModule } from '@/dsp/types';
import { moduleRegistry } from '@/dsp/ModuleRegistry';

interface DspChainPanelProps {
  modules: DSPModule[];
  onAddModule: (type: string) => void;
  onRemoveModule: (id: string) => void;
  onMoveModule: (id: string, newIndex: number) => void;
  onToggleModule: (id: string, enabled: boolean) => void;
  onUpdateParameters: (id: string, params: any) => void;
}

export const DspChainPanel: React.FC<DspChainPanelProps> = ({
  modules,
  onAddModule,
  onRemoveModule,
  onMoveModule,
  onToggleModule,
  onUpdateParameters,
}) => {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    const moduleId = modules[sourceIndex].id;
    onMoveModule(moduleId, destIndex);
  };

  const availableModules = moduleRegistry.listModules();

  return (
    <div className="dsp-chain-panel p-4 bg-gray-900 rounded-lg">
      <div className="header flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">DSP Chain</h2>

        {/* Add Module Dropdown */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              onAddModule(e.target.value);
              e.target.value = '';
            }
          }}
          className="px-3 py-1 bg-gray-800 rounded text-sm"
        >
          <option value="">+ Add Module</option>
          {availableModules.map((mod) => (
            <option key={mod.type} value={mod.type}>
              {mod.name}
            </option>
          ))}
        </select>
      </div>

      {/* Module List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dsp-modules">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="modules-list space-y-2"
            >
              {modules.length === 0 && (
                <div className="empty-state text-center py-8 text-gray-500">
                  No modules. Add one from the dropdown above.
                </div>
              )}

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
                      className={`
                        module-card p-3 bg-gray-800 rounded
                        ${snapshot.isDragging ? 'shadow-lg' : ''}
                        ${module.enabled ? '' : 'opacity-50'}
                      `}
                    >
                      {/* Drag Handle */}
                      <div className="flex items-center gap-3">
                        <div
                          {...provided.dragHandleProps}
                          className="drag-handle cursor-move text-gray-500"
                        >
                          ⋮⋮
                        </div>

                        {/* Module Info */}
                        <div className="flex-1">
                          <div className="font-medium">{module.type}</div>
                          <div className="text-xs text-gray-500">
                            {module.id}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                          {/* Enable/Disable */}
                          <button
                            onClick={() => onToggleModule(module.id, !module.enabled)}
                            className={`
                              px-2 py-1 rounded text-xs
                              ${module.enabled ? 'bg-green-600' : 'bg-gray-600'}
                            `}
                          >
                            {module.enabled ? 'ON' : 'OFF'}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => setSelectedModule(
                              selectedModule === module.id ? null : module.id
                            )}
                            className="px-2 py-1 bg-blue-600 rounded text-xs"
                          >
                            Edit
                          </button>

                          {/* Remove */}
                          <button
                            onClick={() => {
                              if (confirm('Remove this module?')) {
                                onRemoveModule(module.id);
                              }
                            }}
                            className="px-2 py-1 bg-red-600 rounded text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Parameter Editor (expanded) */}
                      {selectedModule === module.id && (
                        <div className="parameters mt-3 pt-3 border-t border-gray-700">
                          <ModuleParameterEditor
                            module={module}
                            onUpdate={(params) => onUpdateParameters(module.id, params)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

// Parameter Editor Component
const ModuleParameterEditor: React.FC<{
  module: DSPModule;
  onUpdate: (params: any) => void;
}> = ({ module, onUpdate }) => {
  const params = module.getParameters?.() || {};

  const handleChange = (key: string, value: any) => {
    onUpdate({ ...params, [key]: value });
  };

  return (
    <div className="space-y-2">
      {Object.entries(params).map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <label className="text-sm text-gray-400 w-24">{key}</label>
          <input
            type="range"
            min={-20}
            max={20}
            step={0.1}
            value={value as number}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm w-12 text-right">
            {(value as number).toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
};
```

**Dependencies:**
```bash
pnpm add react-beautiful-dnd @types/react-beautiful-dnd
```

**Test:**
- [ ] Drag & drop works
- [ ] Add module works
- [ ] Remove module works
- [ ] Enable/disable works
- [ ] Parameter editing works

---

##### Task 2.3: Integration into App (3h)

**Files to modify:**
- `src/hooks/useAutoPlayer.ts`
- `src/App.tsx`

**Implementation:**
```typescript
// src/hooks/useAutoPlayer.ts - Add DSP chain management

import { ModularDspChain } from '@/dsp/ModularDspChain';

export function useAutoPlayer() {
  const [dspModules, setDspModules] = useState<DSPModule[]>([]);

  // ... existing code ...

  // Add DSP chain methods
  const addDspModule = (type: DSPModuleType) => {
    const module = player.getDspChain().addModule(type);
    if (module) {
      setDspModules(player.getDspChain().getModules());
    }
  };

  const removeDspModule = (id: string) => {
    player.getDspChain().removeModule(id);
    setDspModules(player.getDspChain().getModules());
  };

  const moveDspModule = (id: string, newIndex: number) => {
    player.getDspChain().moveModule(id, newIndex);
    setDspModules(player.getDspChain().getModules());
  };

  return {
    player,
    dspModules,
    addDspModule,
    removeDspModule,
    moveDspModule,
    // ... existing return values ...
  };
}
```

```tsx
// src/App.tsx - Add DSP panel route

import { DspChainPanel } from '@/components/dsp/DspChainPanel';

<Route path="/dsp" element={
  <DspChainPanel
    modules={dspModules}
    onAddModule={addDspModule}
    onRemoveModule={removeDspModule}
    onMoveModule={moveDspModule}
    // ...
  />
} />
```

**Test:**
- [ ] DSP panel accessible at /dsp
- [ ] Hook integration works
- [ ] UI updates on changes

---

### Phase 2: Bit-Perfect Output Mode (12 hodin)

#### Week 2, Day 1-2: Bit-Perfect Core (12h)

**Skipped for now - see detailed plan in PROFESSIONAL_UPGRADE_PLAN.md**

---

### Phase 3: Smart Library + Playlists (20 hodin)

#### Week 2, Day 3-5: Library System (20h)

**Skipped for now - see detailed plan in PROFESSIONAL_UPGRADE_PLAN.md**

---

## 📦 Dependencies to Install

```bash
# DSP UI
pnpm add react-beautiful-dnd @types/react-beautiful-dnd

# EUPH format (already has pako)
# Already installed: pako

# Library system (for Phase 3)
pnpm add better-sqlite3 @types/better-sqlite3
pnpm add music-metadata @types/music-metadata

# UI components
pnpm add react-window @types/react-window
```

---

## ✅ Completion Checklist

### Phase 1: EUPH + DSP Integration (20h)

#### EUPH File Support (8h)
- [ ] Task 1.1: EUPH file detection & loading (3h)
  - [ ] Detect .euph files
  - [ ] Load and decode EUPH
  - [ ] Extract audio data
  - [ ] Extract metadata
  - [ ] Extract DSP settings
  - [ ] Apply settings to player
- [ ] Task 1.2: DSP settings export/import (2h)
  - [ ] Create DspSettingsManager
  - [ ] Export current DSP config
  - [ ] Import and apply DSP config
  - [ ] Test save/load cycle
- [ ] Task 1.3: EUPH export UI (3h)
  - [ ] Create EuphExporter component
  - [ ] Add export button to NowPlaying
  - [ ] Progress indicator
  - [ ] File download
  - [ ] Test full export workflow

#### Modular DSP Chain (12h)
- [ ] Task 2.1: Modular DSP chain class (4h)
  - [ ] Create ModularDspChain class
  - [ ] Add/remove/move modules
  - [ ] Chain reconnection logic
  - [ ] Serialize/deserialize
  - [ ] Test core functionality
- [ ] Task 2.2: DSP chain panel UI (5h)
  - [ ] Create DspChainPanel component
  - [ ] Drag & drop with react-beautiful-dnd
  - [ ] Module cards
  - [ ] Parameter editing
  - [ ] Add/remove buttons
  - [ ] Enable/disable toggles
- [ ] Task 2.3: Integration (3h)
  - [ ] Update useAutoPlayer hook
  - [ ] Connect to AutoPlayer
  - [ ] Add route to App
  - [ ] Test end-to-end

### Phase 2: Bit-Perfect Mode (12h)
- [ ] See PROFESSIONAL_UPGRADE_PLAN.md for details

### Phase 3: Smart Library (20h)
- [ ] See PROFESSIONAL_UPGRADE_PLAN.md for details

---

## 🎯 Success Metrics

After Phase 1 completion (20h), you'll have:

✅ **EUPH Format - 100% Complete**
- Load .euph files
- Save to .euph with DSP settings
- Auto-apply DSP on load
- Metadata preservation

✅ **Modulární DSP Chain - 100% Complete**
- 11 DSP modules ready
- Drag & drop editor
- Add/remove/reorder modules
- Parameter editing
- Preset save/load (via EUPH)

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm add react-beautiful-dnd @types/react-beautiful-dnd

# 2. Start with Task 1.1
# Edit: src/audio/player.ts
# Add EUPH file detection

# 3. Test with .euph file
# Create a test .euph using existing encoder

# 4. Continue with checklist
```

---

## 📝 Notes

- **All open-source**: No proprietary dependencies
- **Backward compatible**: Existing features still work
- **Incremental**: Can deploy after each task
- **Well-tested**: Checklist ensures nothing skipped

---

**Ready to upgrade?** 🎵 Start with Task 1.1! 🚀

---

_Created: 2025-01-26_
_Author: Cashi_
_Version: 1.0_
