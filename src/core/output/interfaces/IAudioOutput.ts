/**
 * Audio Output Interface
 *
 * Abstraction for output devices (local DAC, UPnP renderer, Chromecast, etc.)
 * Inspired by UAPP's device support and foobar2000's output management.
 */

export interface IAudioOutput {
  /**
   * Unique output device identifier
   */
  readonly id: string;

  /**
   * Device name
   */
  readonly name: string;

  /**
   * Output type
   */
  readonly type: OutputDeviceType;

  /**
   * Device capabilities
   */
  readonly capabilities: OutputCapabilities;

  /**
   * Is device currently available
   */
  isAvailable(): boolean;

  /**
   * Is device currently active
   */
  isActive(): boolean;

  /**
   * Initialize device
   */
  initialize(): Promise<void>;

  /**
   * Set output device for audio stream
   * @param sampleRate - Desired sample rate (null = use source rate)
   * @param bitDepth - Desired bit depth (null = use source depth)
   * @param channels - Number of channels
   */
  configure(config: OutputConfig): Promise<void>;

  /**
   * Get current configuration
   */
  getConfiguration(): OutputConfig;

  /**
   * Start audio output
   */
  start(): Promise<void>;

  /**
   * Stop audio output
   */
  stop(): Promise<void>;

  /**
   * Set volume (0.0 - 1.0)
   * May not be supported on all devices
   */
  setVolume(volume: number): void;
  getVolume(): number;

  /**
   * Get output latency in milliseconds
   */
  getLatency(): number;

  /**
   * Subscribe to output events
   */
  on(event: OutputEvent, callback: OutputEventCallback): void;
  off(event: OutputEvent, callback: OutputEventCallback): void;

  /**
   * Dispose resources
   */
  dispose(): void;
}

/**
 * Output Device Types
 */
export type OutputDeviceType =
  // Local devices
  | 'system-default' // System default device
  | 'wasapi' // Windows WASAPI
  | 'wasapi-exclusive' // WASAPI Exclusive (bit-perfect)
  | 'asio' // ASIO (professional audio)
  | 'coreaudio' // macOS Core Audio
  | 'alsa' // Linux ALSA
  // Network renderers
  | 'upnp' // UPnP/DLNA renderer
  | 'chromecast' // Google Chromecast
  | 'airplay' // Apple AirPlay
  | 'roon' // Roon endpoint
  // Other
  | 'file' // Render to file
  | 'null'; // Null output (for testing)

/**
 * Output Capabilities
 */
export interface OutputCapabilities {
  /**
   * Supported sample rates (Hz)
   */
  supportedSampleRates: number[];

  /**
   * Supported bit depths
   */
  supportedBitDepths: number[];

  /**
   * Maximum number of channels
   */
  maxChannels: number;

  /**
   * Supports exclusive mode (bit-perfect)
   */
  exclusiveMode: boolean;

  /**
   * Supports DSD (Direct Stream Digital)
   */
  dsd: boolean;

  /**
   * DSD modes supported
   */
  dsdModes?: ('dop' | 'native')[];

  /**
   * Supports gapless playback
   */
  gapless: boolean;

  /**
   * Supports volume control
   */
  volumeControl: boolean;

  /**
   * Can bypass system mixer (bit-perfect)
   */
  bypassMixer: boolean;

  /**
   * Hardware buffer size range
   */
  bufferSizeRange?: {
    min: number;
    max: number;
    default: number;
  };
}

/**
 * Output Configuration
 */
export interface OutputConfig {
  /**
   * Sample rate (null = use source rate)
   */
  sampleRate: number | null;

  /**
   * Bit depth (null = use source depth)
   */
  bitDepth: number | null;

  /**
   * Number of channels
   */
  channels: number;

  /**
   * Exclusive mode (bit-perfect)
   */
  exclusive: boolean;

  /**
   * Buffer size in samples
   */
  bufferSize: number;

  /**
   * Enable dithering when reducing bit depth
   */
  dithering: boolean;

  /**
   * Resample mode
   */
  resampleMode: ResampleMode;

  /**
   * DSD mode (if applicable)
   */
  dsdMode?: 'dop' | 'native';
}

/**
 * Resample modes
 */
export type ResampleMode =
  | 'none' // No resampling (bit-perfect)
  | 'linear' // Linear interpolation (fast, low quality)
  | 'sinc-fast' // Sinc interpolation (balanced)
  | 'sinc-best'; // Sinc interpolation (best quality, slower)

/**
 * Output Events
 */
export type OutputEvent =
  | 'configured'
  | 'started'
  | 'stopped'
  | 'disconnected'
  | 'error'
  | 'bufferUnderrun'
  | 'sampleRateChanged';

export type OutputEventCallback = (data?: any) => void;

/**
 * Bit-Perfect Mode Manager
 */
export interface IBitPerfectMode {
  /**
   * Check if bit-perfect mode is possible
   */
  isBitPerfectPossible(output: IAudioOutput, format: AudioFormatInfo): boolean;

  /**
   * Enable bit-perfect mode
   * - Disables DSP
   * - Disables resampling
   * - Uses exclusive output mode
   * - Matches source sample rate/bit depth
   */
  enableBitPerfect(output: IAudioOutput, format: AudioFormatInfo): Promise<BitPerfectConfig>;

  /**
   * Verify bit-perfect chain
   * Returns warnings if chain is not truly bit-perfect
   */
  verifyBitPerfectChain(output: IAudioOutput): BitPerfectVerification;
}

/**
 * Audio format information (simplified)
 */
export interface AudioFormatInfo {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  codec: string;
}

/**
 * Bit-perfect configuration result
 */
export interface BitPerfectConfig {
  success: boolean;
  outputMode: 'exclusive' | 'shared';
  sampleRate: number;
  bitDepth: number;
  dspDisabled: boolean;
  resamplingDisabled: boolean;
  warnings: string[];
}

/**
 * Bit-perfect verification result
 */
export interface BitPerfectVerification {
  isBitPerfect: boolean;
  issues: string[];
  warnings: string[];
}
