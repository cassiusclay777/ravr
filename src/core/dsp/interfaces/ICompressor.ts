/**
 * Compressor/Limiter Interface
 *
 * Dynamics processing for controlling audio levels.
 * Inspired by foobar2000 limiter and Neutron dynamics.
 */

import type { IDspNode } from './IDspNode';

/**
 * Dynamic Range Compressor
 */
export interface ICompressor extends IDspNode {
  /**
   * Set threshold in dB
   * Signals above this level will be compressed
   */
  setThreshold(db: number): void;
  getThreshold(): number;

  /**
   * Set compression ratio
   * 2:1 = gentle, 4:1 = medium, 10:1+ = limiting
   */
  setRatio(ratio: number): void;
  getRatio(): number;

  /**
   * Set attack time in milliseconds
   * How quickly compressor responds to signals above threshold
   */
  setAttack(ms: number): void;
  getAttack(): number;

  /**
   * Set release time in milliseconds
   * How quickly compressor recovers after signal drops below threshold
   */
  setRelease(ms: number): void;
  getRelease(): number;

  /**
   * Set knee (soft/hard)
   * 0 = hard knee, >0 = soft knee (dB range)
   */
  setKnee(db: number): void;
  getKnee(): number;

  /**
   * Set makeup gain in dB
   * Compensate for gain reduction
   */
  setMakeupGain(db: number): void;
  getMakeupGain(): number;

  /**
   * Enable automatic makeup gain
   */
  setAutoMakeupGain(enabled: boolean): void;
  getAutoMakeupGain(): boolean;

  /**
   * Get current gain reduction in dB
   * For metering/visualization
   */
  getGainReduction(): number;
}

/**
 * Limiter (special case of compressor with high ratio)
 */
export interface ILimiter extends IDspNode {
  /**
   * Set ceiling/threshold in dB
   * Output will never exceed this level
   */
  setCeiling(db: number): void;
  getCeiling(): number;

  /**
   * Set release time
   */
  setRelease(ms: number): void;
  getRelease(): number;

  /**
   * Set lookahead time
   * Allows limiter to anticipate peaks
   */
  setLookahead(ms: number): void;
  getLookahead(): number;

  /**
   * Enable true peak limiting
   * Prevents inter-sample peaks
   */
  setTruePeakMode(enabled: boolean): void;
  getTruePeakMode(): boolean;

  /**
   * Get current gain reduction
   */
  getGainReduction(): number;
}

/**
 * Multiband Compressor
 * Independent compression for different frequency bands
 */
export interface IMultibandCompressor extends IDspNode {
  /**
   * Get number of bands
   */
  getBandCount(): number;

  /**
   * Set band count (2, 3, or 4 typically)
   */
  setBandCount(count: number): void;

  /**
   * Set crossover frequency between bands
   */
  setCrossoverFrequency(bandIndex: number, frequency: number): void;
  getCrossoverFrequency(bandIndex: number): number;

  /**
   * Set compressor parameters for specific band
   */
  setBandCompressor(bandIndex: number, params: CompressorParams): void;
  getBandCompressor(bandIndex: number): CompressorParams;

  /**
   * Solo specific band (for monitoring)
   */
  setSoloBand(bandIndex: number, solo: boolean): void;
  isBandSolo(bandIndex: number): boolean;

  /**
   * Bypass specific band
   */
  setBypassBand(bandIndex: number, bypass: boolean): void;
  isBandBypassed(bandIndex: number): boolean;

  /**
   * Get gain reduction per band
   */
  getBandGainReduction(bandIndex: number): number;
}

/**
 * Compressor parameters
 */
export interface CompressorParams {
  threshold: number; // dB
  ratio: number; // n:1
  attack: number; // ms
  release: number; // ms
  knee: number; // dB
  makeupGain: number; // dB
  autoMakeupGain: boolean;
}

/**
 * Limiter parameters
 */
export interface LimiterParams {
  ceiling: number; // dB (typically -0.1 to -1.0)
  release: number; // ms
  lookahead: number; // ms
  truePeak: boolean;
}

/**
 * Default compressor settings
 */
export const CompressorDefaults: CompressorParams = {
  threshold: -20, // dB
  ratio: 4, // 4:1
  attack: 10, // ms
  release: 100, // ms
  knee: 6, // dB
  makeupGain: 0, // dB
  autoMakeupGain: false,
};

/**
 * Default limiter settings (similar to foobar2000)
 */
export const LimiterDefaults: LimiterParams = {
  ceiling: -0.3, // dB (prevent clipping with small margin)
  release: 50, // ms
  lookahead: 5, // ms
  truePeak: true,
};
