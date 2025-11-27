/**
 * Playback State Machine
 *
 * Defines all possible playback states
 */

export enum PlaybackState {
  /**
   * No track loaded
   */
  STOPPED = 'stopped',

  /**
   * Track loaded but not playing
   */
  PAUSED = 'paused',

  /**
   * Currently playing
   */
  PLAYING = 'playing',

  /**
   * Loading track data
   */
  LOADING = 'loading',

  /**
   * Buffering (network streams)
   */
  BUFFERING = 'buffering',

  /**
   * Error state
   */
  ERROR = 'error',
}

/**
 * Extended playback information
 */
export interface PlaybackInfo {
  state: PlaybackState;
  currentTime: number; // seconds
  duration: number; // seconds
  buffered: number; // seconds buffered (for streaming)
  volume: number; // 0.0 - 1.0
  isMuted: boolean;
  isGapless: boolean;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  crossfadeEnabled: boolean;
  crossfadeDuration: number; // seconds
}

/**
 * Repeat modes
 */
export enum RepeatMode {
  OFF = 'off',
  ONE = 'one', // Repeat current track
  ALL = 'all', // Repeat playlist
}

/**
 * Playback mode
 */
export interface PlaybackMode {
  repeat: RepeatMode;
  shuffle: boolean;
  gapless: boolean;
  crossfade: boolean;
  crossfadeDuration: number;
}
