import { DspPreferences } from '../utils/profiles';

export interface Preset {
  id: string;
  name: string;
  description?: string;
  dsp: DspPreferences;
  createdAt: number;
  isBuiltIn?: boolean;
  deviceId?: string;
}

export interface QuickPreset {
  slot: number;
  preset: Preset | null;
}

class PresetManagerClass {
  private readonly STORAGE_KEY = 'ravr_presets';
  private readonly QUICK_PRESETS_KEY = 'ravr_quick_presets';
  private readonly AUTO_DEVICE_KEY = 'ravr_auto_device_presets';
  private presets: Map<string, Preset> = new Map();
  private quickPresets: Map<number, string> = new Map();
  private devicePresets: Map<string, string> = new Map();

  constructor() {
    this.loadPresets();
    this.initBuiltInPresets();
  }

  private initBuiltInPresets() {
    const builtIns: Preset[] = [
      {
        id: 'flat',
        name: 'Flat',
        description: 'Neutral, no coloration',
        isBuiltIn: true,
        createdAt: Date.now(),
        dsp: {
          sweetenerTargetLUFS: -14,
          limiter: { threshold: -0.1, release: 0.05, ratio: 20 },
          eqTiltDbPerDecade: 0,
          monoBelowHz: 120,
          stereoWidth: 1
        }
      },
      {
        id: 'warm',
        name: 'Warm & Smooth',
        description: 'Enhanced bass, smooth highs',
        isBuiltIn: true,
        createdAt: Date.now(),
        dsp: {
          sweetenerTargetLUFS: -12,
          limiter: { threshold: -0.5, release: 0.1, ratio: 10 },
          eqTiltDbPerDecade: 2,
          monoBelowHz: 100,
          stereoWidth: 1.1
        }
      },
      {
        id: 'bright',
        name: 'Bright & Clear',
        description: 'Enhanced clarity and detail',
        isBuiltIn: true,
        createdAt: Date.now(),
        dsp: {
          sweetenerTargetLUFS: -16,
          limiter: { threshold: -0.1, release: 0.03, ratio: 30 },
          eqTiltDbPerDecade: -2,
          monoBelowHz: 150,
          stereoWidth: 1.2
        }
      },
      {
        id: 'punchy',
        name: 'Punchy Bass',
        description: 'Strong bass impact',
        isBuiltIn: true,
        createdAt: Date.now(),
        dsp: {
          sweetenerTargetLUFS: -10,
          limiter: { threshold: -1, release: 0.2, ratio: 8 },
          eqTiltDbPerDecade: 3,
          monoBelowHz: 80,
          stereoWidth: 0.9
        }
      },
      {
        id: 'spatial',
        name: 'Spatial Wide',
        description: 'Enhanced stereo width',
        isBuiltIn: true,
        createdAt: Date.now(),
        dsp: {
          sweetenerTargetLUFS: -14,
          limiter: { threshold: -0.3, release: 0.08, ratio: 15 },
          eqTiltDbPerDecade: 0,
          monoBelowHz: 200,
          stereoWidth: 1.5
        }
      }
    ];

    builtIns.forEach(preset => {
      if (!this.presets.has(preset.id)) {
        this.presets.set(preset.id, preset);
      }
    });
  }

  private loadPresets() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        data.forEach((preset: Preset) => {
          this.presets.set(preset.id, preset);
        });
      }

      const quickStored = localStorage.getItem(this.QUICK_PRESETS_KEY);
      if (quickStored) {
        const quickData = JSON.parse(quickStored);
        Object.entries(quickData).forEach(([slot, id]) => {
          this.quickPresets.set(Number(slot), id as string);
        });
      }

      const deviceStored = localStorage.getItem(this.AUTO_DEVICE_KEY);
      if (deviceStored) {
        const deviceData = JSON.parse(deviceStored);
        Object.entries(deviceData).forEach(([deviceId, presetId]) => {
          this.devicePresets.set(deviceId, presetId as string);
        });
      }
    } catch (e) {
      console.error('Failed to load presets:', e);
    }
  }

  private savePresets() {
    try {
      const userPresets = Array.from(this.presets.values()).filter(p => !p.isBuiltIn);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userPresets));
      
      const quickData: Record<number, string> = {};
      this.quickPresets.forEach((id, slot) => {
        quickData[slot] = id;
      });
      localStorage.setItem(this.QUICK_PRESETS_KEY, JSON.stringify(quickData));
      
      const deviceData: Record<string, string> = {};
      this.devicePresets.forEach((presetId, deviceId) => {
        deviceData[deviceId] = presetId;
      });
      localStorage.setItem(this.AUTO_DEVICE_KEY, JSON.stringify(deviceData));
    } catch (e) {
      console.error('Failed to save presets:', e);
    }
  }

  getAllPresets(): Preset[] {
    return Array.from(this.presets.values()).sort((a, b) => {
      if (a.isBuiltIn && !b.isBuiltIn) return -1;
      if (!a.isBuiltIn && b.isBuiltIn) return 1;
      return b.createdAt - a.createdAt;
    });
  }

  getPreset(id: string): Preset | undefined {
    return this.presets.get(id);
  }

  savePreset(preset: Preset): void {
    this.presets.set(preset.id, preset);
    this.savePresets();
  }

  deletePreset(id: string): boolean {
    const preset = this.presets.get(id);
    if (preset?.isBuiltIn) return false;
    
    const deleted = this.presets.delete(id);
    if (deleted) {
      // Remove from quick presets
      this.quickPresets.forEach((presetId, slot) => {
        if (presetId === id) {
          this.quickPresets.delete(slot);
        }
      });
      
      // Remove from device presets
      this.devicePresets.forEach((presetId, deviceId) => {
        if (presetId === id) {
          this.devicePresets.delete(deviceId);
        }
      });
      
      this.savePresets();
    }
    return deleted;
  }

  assignQuickPreset(slot: number, presetId: string | null): void {
    if (presetId === null) {
      this.quickPresets.delete(slot);
    } else {
      this.quickPresets.set(slot, presetId);
    }
    this.savePresets();
  }

  getQuickPreset(slot: number): Preset | null {
    const id = this.quickPresets.get(slot);
    return id ? this.presets.get(id) || null : null;
  }

  getQuickPresets(): QuickPreset[] {
    const slots = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    return slots.map(slot => ({
      slot,
      preset: this.getQuickPreset(slot)
    }));
  }

  setDevicePreset(deviceId: string, presetId: string | null): void {
    if (presetId === null) {
      this.devicePresets.delete(deviceId);
    } else {
      this.devicePresets.set(deviceId, presetId);
    }
    this.savePresets();
  }

  getDevicePreset(deviceId: string): Preset | null {
    const id = this.devicePresets.get(deviceId);
    return id ? this.presets.get(id) || null : null;
  }

  detectAndApplyDevicePreset(deviceLabel: string): Preset | null {
    // Auto-detect common audio devices
    const devicePatterns: Record<string, string> = {
      'airpods': 'flat',
      'wh-1000xm': 'warm',
      'hd6': 'bright',
      'dt990': 'bright',
      'ath-m50': 'punchy',
      'krk': 'flat',
      'yamaha': 'flat',
      'genelec': 'flat'
    };

    const lowerLabel = deviceLabel.toLowerCase();
    for (const [pattern, presetId] of Object.entries(devicePatterns)) {
      if (lowerLabel.includes(pattern)) {
        return this.presets.get(presetId) || null;
      }
    }

    return null;
  }

  exportPreset(id: string): string | null {
    const preset = this.presets.get(id);
    if (!preset) return null;
    return JSON.stringify(preset, null, 2);
  }

  importPreset(json: string): Preset | null {
    try {
      const preset = JSON.parse(json) as Preset;
      preset.id = `imported_${Date.now()}`;
      preset.createdAt = Date.now();
      preset.isBuiltIn = false;
      this.savePreset(preset);
      return preset;
    } catch (e) {
      console.error('Failed to import preset:', e);
      return null;
    }
  }
}

export const PresetManager = new PresetManagerClass();
