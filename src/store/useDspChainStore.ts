import { create } from 'zustand';

// AudioNode is a built-in type in TypeScript when using the Web Audio API
declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

export type DspModuleType = 'eq' | 'compressor' | 'reverb' | 'delay' | 'distortion' | 'filter';

export interface DspModule {
  id: string;
  type: DspModuleType;
  name: string;
  enabled: boolean;
  params: Record<string, number>;
  audioNode?: AudioNode;
}

interface DspChainState {
  modules: DspModule[];
  addModule: (type: DspModuleType) => void;
  removeModule: (id: string) => void;
  updateModule: (id: string, updates: Partial<Omit<DspModule, 'id' | 'type'>>) => void;
  reorderModules: (fromIndex: number, toIndex: number) => void;
  toggleModule: (id: string) => void;
  updateParam: (moduleId: string, paramName: string, value: number) => void;
}

const defaultParams: Record<DspModuleType, Record<string, number>> = {
  eq: {
    lowFreq: 200,
    lowGain: 0,
    midFreq: 1000,
    midGain: 0,
    midQ: 1.0,
    highFreq: 5000,
    highGain: 0,
  },
  compressor: {
    threshold: -24,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
    knee: 30,
  },
  reverb: {
    level: 0.5,
    decay: 2.5,
    reverse: 0,
  },
  delay: {
    time: 0.3,
    feedback: 0.5,
    mix: 0.3,
  },
  distortion: {
    amount: 0.5,
    oversample: 0,
  },
  filter: {
    frequency: 1000,
    Q: 1.0,
    type: 0, // 0 = lowpass, 1 = highpass, 2 = bandpass
  },
};

type SetState = (fn: (state: DspChainState) => Partial<DspChainState>) => void;

export const useDspChainStore = create<DspChainState>((set: SetState) => ({
  modules: [],
  
  addModule: (type: DspModuleType) =>
    set((state: DspChainState) => {
      const newModule: DspModule = {
        id: `module-${Date.now()}`,
        type,
        name: `${type} ${state.modules.filter((m: DspModule) => m.type === type).length + 1}`,
        enabled: true,
        params: { ...defaultParams[type] },
      };
      return { modules: [...state.modules, newModule] };
    }),

  removeModule: (id: string) =>
    set((state: DspChainState) => ({
      modules: state.modules.filter((module: DspModule) => module.id !== id),
    })),

  updateModule: (id: string, updates: Partial<Omit<DspModule, 'id' | 'type'>>) =>
    set((state: DspChainState) => ({
      modules: state.modules.map((module: DspModule) =>
        module.id === id ? { ...module, ...updates } : module
      ),
    })),

  reorderModules: (fromIndex: number, toIndex: number) =>
    set((state: DspChainState) => {
      const newModules = [...state.modules];
      const [moved] = newModules.splice(fromIndex, 1);
      newModules.splice(toIndex, 0, moved);
      return { modules: newModules };
    }),

  toggleModule: (id: string) =>
    set((state: DspChainState) => ({
      modules: state.modules.map((module: DspModule) =>
        module.id === id ? { ...module, enabled: !module.enabled } : module
      ),
    })),

  updateParam: (moduleId: string, paramName: string, value: number) =>
    set((state: DspChainState) => ({
      modules: state.modules.map((module: DspModule) =>
        module.id === moduleId
          ? {
              ...module,
              params: {
                ...module.params,
                [paramName]: value,
              },
            }
          : module
      ),
    })),
}));
