/**
 * Audio Format Definitions
 *
 * Comprehensive audio format and codec information
 */

export interface AudioFormat {
  /**
   * Audio codec
   */
  codec: AudioCodec;

  /**
   * Container format
   */
  container: string;

  /**
   * Sample rate in Hz
   */
  sampleRate: number;

  /**
   * Bit depth (bits per sample)
   */
  bitsPerSample?: number;

  /**
   * Number of channels
   */
  channels: number;

  /**
   * Bitrate in kbps (for lossy formats)
   */
  bitrate?: number;

  /**
   * Is lossless compression
   */
  lossless: boolean;

  /**
   * Channel layout (e.g., 'stereo', '5.1', '7.1')
   */
  channelLayout?: ChannelLayout;

  /**
   * Is DSD (Direct Stream Digital)
   */
  isDSD?: boolean;

  /**
   * DSD rate (if applicable)
   */
  dsdRate?: number; // e.g., 2.8224 MHz for DSD64
}

/**
 * Supported audio codecs
 */
export type AudioCodec =
  // Lossless
  | 'flac'
  | 'alac'
  | 'ape'
  | 'wav'
  | 'aiff'
  | 'wv' // WavPack
  | 'tta' // True Audio
  | 'dsd' // Direct Stream Digital
  // Lossy
  | 'mp3'
  | 'aac'
  | 'opus'
  | 'vorbis'
  | 'wma'
  | 'ac3'
  | 'eac3'
  // Other
  | 'unknown';

/**
 * Channel layouts
 */
export type ChannelLayout =
  | 'mono'
  | 'stereo'
  | '2.1'
  | '3.0'
  | '3.1'
  | '4.0'
  | '4.1'
  | '5.0'
  | '5.1'
  | '6.1'
  | '7.1'
  | '7.1.4' // Dolby Atmos
  | 'other';

/**
 * Audio quality tier
 */
export enum AudioQuality {
  LOW = 'low', // < 128 kbps or low sample rate
  STANDARD = 'standard', // 128-320 kbps, 44.1 kHz
  HIGH = 'high', // Lossless 16/44.1
  HIRES = 'hires', // Lossless 24/96 or higher
  DSD = 'dsd', // DSD formats
}

/**
 * Format utilities
 */
export class AudioFormatUtils {
  /**
   * Determine audio quality tier
   */
  static getQualityTier(format: AudioFormat): AudioQuality {
    if (format.isDSD) {
      return AudioQuality.DSD;
    }

    if (format.lossless) {
      const sampleRate = format.sampleRate;
      const bitDepth = format.bitsPerSample || 16;

      if (sampleRate >= 88200 || bitDepth >= 24) {
        return AudioQuality.HIRES;
      }
      return AudioQuality.HIGH;
    }

    // Lossy
    const bitrate = format.bitrate || 128;
    if (bitrate >= 256) {
      return AudioQuality.STANDARD;
    }
    return AudioQuality.LOW;
  }

  /**
   * Format display string
   * e.g., "FLAC 24/96" or "MP3 320 kbps"
   */
  static getDisplayString(format: AudioFormat): string {
    const codec = format.codec.toUpperCase();

    if (format.lossless) {
      const bitDepth = format.bitsPerSample || 16;
      const sampleRateKHz = Math.round(format.sampleRate / 1000);
      return `${codec} ${bitDepth}/${sampleRateKHz}`;
    }

    const bitrate = format.bitrate || '?';
    return `${codec} ${bitrate} kbps`;
  }

  /**
   * Check if format is Hi-Res (> 16/44.1)
   */
  static isHiRes(format: AudioFormat): boolean {
    return (
      format.lossless &&
      (format.sampleRate > 48000 || (format.bitsPerSample || 16) > 16)
    );
  }

  /**
   * Get recommended buffer size for format
   */
  static getRecommendedBufferSize(format: AudioFormat): number {
    // Higher sample rates need larger buffers
    if (format.sampleRate >= 192000) return 8192;
    if (format.sampleRate >= 96000) return 4096;
    if (format.sampleRate >= 48000) return 2048;
    return 1024;
  }

  /**
   * Calculate data rate in bytes/second
   */
  static getDataRate(format: AudioFormat): number {
    if (format.lossless && format.bitsPerSample) {
      // Uncompressed data rate
      return (format.sampleRate * format.channels * format.bitsPerSample) / 8;
    }
    // Lossy bitrate
    if (format.bitrate) {
      return (format.bitrate * 1000) / 8; // Convert kbps to bytes/sec
    }
    // Unknown
    return 0;
  }
}
