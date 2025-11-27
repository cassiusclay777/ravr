/**
 * Equalizer Interface
 *
 * Parametric and Graphic EQ definitions.
 * Inspired by Neutron's advanced EQ.
 */

import type { IDspNode, DspParameters } from './IDspNode';

/**
 * Parametric Equalizer
 * Supports multiple bands with individual frequency, gain, Q
 */
export interface IParametricEqualizer extends IDspNode {
  /**
   * Get all EQ bands
   */
  getBands(): EqBand[];

  /**
   * Set EQ band parameters
   */
  setBand(index: number, band: Partial<EqBand>): void;

  /**
   * Add new band
   */
  addBand(band: EqBand): void;

  /**
   * Remove band
   */
  removeBand(index: number): void;

  /**
   * Reset all bands to flat response
   */
  resetBands(): void;

  /**
   * Set number of bands (resize)
   */
  setBandCount(count: number): void;

  /**
   * Apply preset (rock, jazz, classical, etc.)
   */
  applyPreset(preset: EqPreset): void;
}

/**
 * Graphic Equalizer
 * Fixed frequency bands (10-band, 15-band, 31-band)
 */
export interface IGraphicEqualizer extends IDspNode {
  /**
   * Get number of bands
   */
  getBandCount(): number;

  /**
   * Get band frequencies
   */
  getFrequencies(): number[];

  /**
   * Set gain for specific band
   */
  setBandGain(index: number, gainDb: number): void;

  /**
   * Get gain for specific band
   */
  getBandGain(index: number): number;

  /**
   * Set all band gains
   */
  setAllGains(gains: number[]): void;

  /**
   * Get all band gains
   */
  getAllGains(): number[];

  /**
   * Reset all bands to 0 dB
   */
  resetToFlat(): void;

  /**
   * Apply graphic EQ preset
   */
  applyPreset(preset: GraphicEqPreset): void;
}

/**
 * Single EQ band definition
 */
export interface EqBand {
  /**
   * Band index
   */
  index: number;

  /**
   * Center frequency in Hz
   */
  frequency: number;

  /**
   * Gain in dB (-20 to +20 typical)
   */
  gain: number;

  /**
   * Q factor (bandwidth)
   * Higher Q = narrower band
   */
  q: number;

  /**
   * Filter type
   */
  type: FilterType;

  /**
   * Is band enabled
   */
  enabled: boolean;

  /**
   * Channel selection
   */
  channel?: 'left' | 'right' | 'both';
}

/**
 * Filter types for parametric EQ
 */
export type FilterType =
  | 'peak' // Peaking/Bell filter
  | 'low-shelf' // Low shelf
  | 'high-shelf' // High shelf
  | 'low-pass' // Low-pass filter
  | 'high-pass' // High-pass filter
  | 'notch' // Notch/Band-stop
  | 'all-pass'; // All-pass (phase)

/**
 * Parametric EQ Preset
 */
export interface EqPreset {
  name: string;
  description?: string;
  bands: Omit<EqBand, 'index'>[];
}

/**
 * Graphic EQ Preset
 */
export interface GraphicEqPreset {
  name: string;
  description?: string;
  gains: number[]; // Array of gain values in dB
}

/**
 * Common EQ Presets
 */
export const EqPresets: Record<string, EqPreset> = {
  FLAT: {
    name: 'Flat',
    description: 'No EQ applied',
    bands: [],
  },

  BASS_BOOST: {
    name: 'Bass Boost',
    description: 'Enhanced low frequencies',
    bands: [
      { frequency: 60, gain: 6, q: 0.7, type: 'low-shelf', enabled: true },
      { frequency: 120, gain: 4, q: 1.0, type: 'peak', enabled: true },
    ],
  },

  VOCAL_BOOST: {
    name: 'Vocal Boost',
    description: 'Enhanced vocal frequencies',
    bands: [
      { frequency: 1000, gain: 3, q: 1.5, type: 'peak', enabled: true },
      { frequency: 3000, gain: 4, q: 2.0, type: 'peak', enabled: true },
    ],
  },

  TREBLE_BOOST: {
    name: 'Treble Boost',
    description: 'Enhanced high frequencies',
    bands: [
      { frequency: 8000, gain: 4, q: 0.7, type: 'high-shelf', enabled: true },
      { frequency: 12000, gain: 5, q: 1.0, type: 'peak', enabled: true },
    ],
  },

  V_SHAPE: {
    name: 'V-Shape',
    description: 'Boosted bass and treble, reduced mids',
    bands: [
      { frequency: 80, gain: 5, q: 0.7, type: 'low-shelf', enabled: true },
      { frequency: 800, gain: -3, q: 1.0, type: 'peak', enabled: true },
      { frequency: 10000, gain: 5, q: 0.7, type: 'high-shelf', enabled: true },
    ],
  },
};

/**
 * Standard Graphic EQ frequency sets
 */
export const GraphicEqFrequencies = {
  ISO_10_BAND: [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
  ISO_15_BAND: [25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000],
  ISO_31_BAND: [
    20, 25, 31, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
    800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000,
    12500, 16000, 20000,
  ],
};
