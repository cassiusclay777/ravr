/**
 * Type definitions for Web Audio API
 */

export type AudioContextType = AudioContext | OfflineAudioContext;

export interface EQSettings {
  low?: number; // -12 to +12 dB
  mid?: number; // -12 to +12 dB
  high?: number; // -12 to +12 dB
}

export interface CompressorSettings {
  threshold?: number; // -60 to 0 dB
  ratio?: number; // 1 to 20
  attack?: number; // 0.001 to 1 second
  release?: number; // 0.001 to 1 second
  knee?: number; // 0 to 40 dB
  makeupGain?: number; // 0 to 20 dB
}

export interface StereoWidenSettings {
  width?: number; // 0 to 1 (narrow to wide)
  delayTime?: number; // 0.0001 to 0.01 seconds
}

export interface GainSettings {
  input?: number; // -24 to +24 dB
  output?: number; // -24 to +24 dB
}
