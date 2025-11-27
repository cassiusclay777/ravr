import { create } from 'zustand';
import type { DeviceProfile } from '../utils/profiles';
import type { QualityPlan } from '../utils/qualityPlanner';

export type Status = 'optimal' | 'fallback';

export interface DeviceInfoLite {
  id: string;
  label: string;
  kind: MediaDeviceInfo['kind'];
  groupId?: string;
  canSetSinkId: boolean;
}

export interface AudioStoreState {
  // Devices
  outputs: DeviceInfoLite[];
  selectedOutputId: string | null;

  // Auto decisions
  status: Status;
  profile: DeviceProfile | null;
  plan: QualityPlan | null;

  // Hidden dev / expert
  expertMode: boolean;

  // Actions
  setOutputs: (outputs: DeviceInfoLite[]) => void;
  setSelectedOutput: (id: string | null) => void;
  setStatus: (s: Status) => void;
  setProfile: (p: DeviceProfile | null) => void;
  setPlan: (p: QualityPlan | null) => void;
  setExpertMode: (v: boolean) => void;
}

export const useAudioStore = create<AudioStoreState>((set) => ({
  outputs: [],
  selectedOutputId: null,
  status: 'fallback',
  profile: null,
  plan: null,
  expertMode: false,

  setOutputs: (outputs) => set({ outputs }),
  setSelectedOutput: (id) => set({ selectedOutputId: id }),
  setStatus: (status) => set({ status }),
  setProfile: (profile) => set({ profile }),
  setPlan: (plan) => set({ plan }),
  setExpertMode: (expertMode) => set({ expertMode }),
}));
