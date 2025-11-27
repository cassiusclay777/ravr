export interface EQBand {
  frequency: number;
  gain: number;
  Q: number;
  type: BiquadFilterType;
  bypass?: boolean;
}

export interface CompressorSettings {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  knee: number;
  bypass?: boolean;
}

export interface ReverbSettings {
  decay: number;
  preDelay: number;
  wet: number;
  bypass?: boolean;
}

export interface DelaySettings {
  time: number;
  feedback: number;
  wet: number;
  bypass?: boolean;
}

export interface DSPPreset {
  id: string;
  name: string;
  description?: string;
  eqBands?: EQBand[];
  compressor?: CompressorSettings;
  reverb?: ReverbSettings;
  delay?: DelaySettings;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DSPModule<T> {
  id: string;
  name: string;
  enabled: boolean;
  settings: T;
  applySettings: (settings: Partial<T>) => void;
  reset: () => void;
  dispose: () => void;
}

export type DSPModuleType = 'eq' | 'compressor' | 'reverb' | 'delay' | 'enhancer';

export interface DSPModuleState {
  id: string;
  type: DSPModuleType;
  enabled: boolean;
  settings: Record<string, any>;
}

export interface DSPState {
  modules: DSPModuleState[];
  activePresetId?: string;
  isBypassed: boolean;
  volume: number;
}
