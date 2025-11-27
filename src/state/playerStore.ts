import { create } from 'zustand';
import { Track } from '@/hooks/useLibrary';

interface PlayerState {
  current: Track | null;
  setCurrent: (track: Track | null) => void;
}

export const usePlayer = create<PlayerState>((set) => ({
  current: null,
  setCurrent: (track) => set({ current: track }),
}));
