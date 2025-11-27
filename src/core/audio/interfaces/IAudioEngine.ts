/**
 * Core Audio Engine Interface
 *
 * Main interface for audio playback engine.
 * Platform-agnostic - can be implemented with Web Audio API, WASM, or native code.
 */

import type { Track } from '../models/Track';
import type { PlaybackState } from '../models/PlaybackState';
import type { AudioFormat } from '../models/AudioFormat';
import type { IAudioOutput } from './IAudioOutput';
import type { IDspChain } from '../../dsp/interfaces/IDspChain';

export interface IAudioEngine {
  /**
   * Load a track for playback
   * @param track - Track to load
   * @returns Promise resolving to true if loaded successfully
   */
  load(track: Track): Promise<boolean>;

  /**
   * Start playback
   */
  play(): Promise<void>;

  /**
   * Pause playback
   */
  pause(): void;

  /**
   * Stop playback and reset position
   */
  stop(): void;

  /**
   * Seek to a specific position
   * @param positionSeconds - Position in seconds
   */
  seek(positionSeconds: number): void;

  /**
   * Set playback volume (0.0 - 1.0)
   * @param volume - Volume level
   */
  setVolume(volume: number): void;

  /**
   * Get current playback state
   */
  getState(): PlaybackState;

  /**
   * Get current playback position in seconds
   */
  getCurrentTime(): number;

  /**
   * Get total duration of current track in seconds
   */
  getDuration(): number;

  /**
   * Get current track information
   */
  getCurrentTrack(): Track | null;

  /**
   * Get audio format of currently playing track
   */
  getAudioFormat(): AudioFormat | null;

  /**
   * Set output device
   * @param output - Audio output device
   */
  setOutput(output: IAudioOutput): Promise<void>;

  /**
   * Get current output device
   */
  getOutput(): IAudioOutput | null;

  /**
   * Get/set DSP chain
   */
  getDspChain(): IDspChain | null;
  setDspChain(chain: IDspChain): void;

  /**
   * Enable/disable DSP chain (for bit-perfect mode)
   */
  setDspEnabled(enabled: boolean): void;
  isDspEnabled(): boolean;

  /**
   * Enable/disable gapless playback
   */
  setGaplessEnabled(enabled: boolean): void;
  isGaplessEnabled(): boolean;

  /**
   * Preload next track for gapless playback
   * @param track - Next track to preload
   */
  preloadNext(track: Track): Promise<void>;

  /**
   * Subscribe to playback events
   * @param event - Event name
   * @param callback - Event callback
   */
  on(event: AudioEngineEvent, callback: AudioEngineEventCallback): void;

  /**
   * Unsubscribe from events
   */
  off(event: AudioEngineEvent, callback: AudioEngineEventCallback): void;

  /**
   * Clean up resources
   */
  dispose(): void;
}

/**
 * Audio Engine Events
 */
export type AudioEngineEvent =
  | 'stateChanged'
  | 'trackChanged'
  | 'timeUpdate'
  | 'ended'
  | 'error'
  | 'buffering'
  | 'loaded'
  | 'formatChanged';

export type AudioEngineEventCallback = (data?: any) => void;

/**
 * Audio Engine Configuration
 */
export interface AudioEngineConfig {
  /**
   * Target sample rate (null = use source sample rate)
   */
  sampleRate?: number | null;

  /**
   * Buffer size in samples (affects latency)
   */
  bufferSize?: number;

  /**
   * Enable gapless playback
   */
  gapless?: boolean;

  /**
   * Crossfade duration in seconds
   */
  crossfadeDuration?: number;

  /**
   * Enable bit-perfect mode (bypass all processing)
   */
  bitPerfect?: boolean;

  /**
   * Enable ReplayGain
   */
  replayGain?: {
    enabled: boolean;
    mode: 'track' | 'album';
    preamp: number; // dB
  };
}
