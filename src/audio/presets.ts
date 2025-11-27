import { DSPModuleConfig } from '../dsp/types';

export type PresetName = 'flat' | 'bassBoost' | 'vocalEnhance' | 'rock' | 'jazz' | 'classical' | 'electronic';

export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  modules: DSPModuleConfig[];
  tags?: string[];
}

const PRESET_STORE_NAME = 'audioPresets';
const DB_NAME = 'ravrPresetsDB';
const DB_VERSION = 1;

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PRESET_STORE_NAME)) {
        db.createObjectStore(PRESET_STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePresetToDB(preset: AudioPreset): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRESET_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PRESET_STORE_NAME);
    
    store.put({
      ...preset,
      updatedAt: new Date().toISOString()
    });
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPresetFromDB(id: string): Promise<AudioPreset | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRESET_STORE_NAME, 'readonly');
    const store = tx.objectStore(PRESET_STORE_NAME);
    
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllPresetsFromDB(): Promise<AudioPreset[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRESET_STORE_NAME, 'readonly');
    const store = tx.objectStore(PRESET_STORE_NAME);
    
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePresetFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRESET_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PRESET_STORE_NAME);
    
    store.delete(id);
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Fallback storage that tries localStorage first, then IndexedDB
export async function savePresetWithFallback(preset: AudioPreset): Promise<void> {
  try {
    // Try localStorage first
    const presets = JSON.parse(localStorage.getItem('audioPresets') || '{}');
    presets[preset.id] = preset;
    localStorage.setItem('audioPresets', JSON.stringify(presets));
  } catch (e) {
    // Fall back to IndexedDB if localStorage is full
    await savePresetToDB(preset);
  }
}

export const PRESETS: Record<PresetName, AudioPreset> = {
  flat: {
    id: 'flat',
    name: 'Flat',
    description: 'Neutral sound with no equalization',
    version: '1.0',
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
    isDefault: true,
    modules: [
      {
        id: 'eq-flat',
        type: 'eq',
        name: 'Flat EQ',
        enabled: true,
        params: {
          lowGain: 0,
          midGain: 0,
          highGain: 0,
        },
      },
    ],
  },
  bassBoost: {
    id: 'bassBoost',
    name: 'Bass Boost',
    description: 'Enhanced low frequencies for powerful bass',
    version: '1.0',
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
    modules: [
      {
        id: 'eq-bass-boost',
        type: 'eq',
        name: 'Bass Boost EQ',
        enabled: true,
        params: {
          lowGain: 6,
          midGain: 0,
          highGain: 2,
        },
      },
    ],
  },
  vocalEnhance: {
    id: 'vocalEnhance',
    name: 'Vocal Enhance',
    description: 'Clarifies and brings forward vocal frequencies',
    version: '1.0',
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
    modules: [
      {
        id: 'eq-vocal',
        type: 'eq',
        name: 'Vocal EQ',
        enabled: true,
        params: {
          lowGain: 2,
          midGain: 4,
          highGain: 3,
        },
      },
    ],
  },
  rock: {
    id: 'rock',
    name: 'Rock',
    description: 'Enhanced for rock music with punchy mids and highs',
    version: '1.0',
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
    modules: [
      {
        id: 'eq-rock',
        type: 'eq',
        name: 'Rock EQ',
        enabled: true,
        params: {
          lowGain: 4,
          midGain: 3,
          highGain: 4,
        },
      },
    ],
  },
  jazz: {
    id: 'jazz',
    name: 'Jazz',
    description: 'Warm and rich sound for jazz music',
    version: '1.0',
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
    modules: [
      {
        id: 'eq-jazz',
        type: 'eq',
        name: 'Jazz EQ',
        enabled: true,
        params: {
          lowGain: 3,
          midGain: 2,
          highGain: 3,
        },
      },
    ],
  },
  classical: {
    id: 'classical',
    name: 'Classical',
    description: 'Natural and balanced sound for classical music',
    version: '1.0',
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
    modules: [
      {
        id: 'eq-classical',
        type: 'eq',
        name: 'Classical EQ',
        enabled: true,
        params: {
          lowGain: 2,
          midGain: 1,
          highGain: 4,
        },
      },
    ],
  },
  electronic: {
    id: 'electronic',
    name: 'Electronic',
    description: 'Enhanced for electronic music with deep bass and crisp highs',
    version: '1.0',
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
    modules: [
      {
        id: 'eq-electronic',
        type: 'eq',
        name: 'Electronic EQ',
        enabled: true,
        params: {
          lowGain: 5,
          midGain: 2,
          highGain: 5,
        },
      },
    ],
  },
};

export const DEFAULT_PRESET: PresetName = 'flat';

export const getPreset = (presetName: PresetName): AudioPreset => {
  return PRESETS[presetName] || PRESETS[DEFAULT_PRESET];
};
