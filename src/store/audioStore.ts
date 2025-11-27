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

export interface Track {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  duration: number;
  url: string;
}

export interface AudioStoreState {
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTrack: Track | null;

  // Devices
  outputs: DeviceInfoLite[];
  selectedOutputId: string | null;

  // Auto decisions
  status: Status;
  profile: DeviceProfile | null;
  plan: QualityPlan | null;

  // Hidden dev / expert
  expertMode: boolean;

  // Playback actions
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setCurrentTrack: (track: Track | null) => void;

  // Device actions
  setOutputs: (outputs: DeviceInfoLite[]) => void;
  setSelectedOutput: (id: string | null) => void;
  setStatus: (s: Status) => void;
  setProfile: (p: DeviceProfile | null) => void;
  setPlan: (p: QualityPlan | null) => void;
  setExpertMode: (v: boolean) => void;
}

export const useAudioStore = create<AudioStoreState>((set) => ({
  // Playback state
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.9,
  currentTrack: null,

  // Devices
  outputs: [],
  selectedOutputId: null,
  status: 'fallback',
  profile: null,
  plan: null,
  expertMode: false,

  // Playback actions
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setCurrentTrack: (currentTrack) => set({ currentTrack }),

  // Device actions
  setOutputs: (outputs) => set({ outputs }),
  setSelectedOutput: (id) => set({ selectedOutputId: id }),
  setStatus: (status) => set({ status }),
  setProfile: (profile) => set({ profile }),
  setPlan: (plan) => set({ plan }),
  setExpertMode: (expertMode) => set({ expertMode }),
}));
