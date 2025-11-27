import { HybridDSPModule } from '../dsp/HybridDSPModule';
import type { DspPreferences } from './profiles';
import { buildAutoSweetener } from '../dsp/autoSweetener';
import { buildTechnoPunch } from '../dsp/technoPunch';
import { ParametricEQ } from '../dsp/ParametricEQ';
import { MultibandCompressor } from '../dsp/MultibandCompressor';
import { TruePeakLimiter } from '../dsp/TruePeakLimiter';
import { StereoEnhancer } from '../dsp/StereoEnhancer';
import { Crossfeed } from '../dsp/Crossfeed';
import { ConvolutionReverb } from '../dsp/ConvolutionReverb';
import { TransientShaper } from '../dsp/TransientShaper';

export interface ChainControls {
  setEQ: (gain: { low: number; mid: number; high: number }) => void;
  setStereoWidth: (width: number) => void;
  setCompressor: (settings: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    knee: number;
    makeupGain: number;
  }) => void;
  setGain: (gain: { input: number; output: number }) => void;
  toggleBypass: () => void;
  isBypassed: () => boolean;
  // Optional plugin controls (only active if plugin is present)
  setTechnoPunchIntensity?: (v: number) => void;
  setTechnoPunchMix?: (mix01: number) => void; // 0=dry, 1=wet
  enableTechnoPunch?: (on: boolean) => void;
  // New DSP controls
  parametricEQ: ParametricEQ;
  multibandCompressor: MultibandCompressor;
  truePeakLimiter: TruePeakLimiter;
  stereoEnhancer: StereoEnhancer;
  crossfeed: Crossfeed;
  convolutionReverb: ConvolutionReverb;
  transientShaper: TransientShaper;
  setChainOrder: (order: string[]) => void;
}

export interface AutoChain {
  input: AudioNode;
  output: AudioNode;
  controls: ChainControls;
  sweetener?: ReturnType<typeof buildAutoSweetener> | null;
  analyser: AnalyserNode;
  disconnect: () => void;
}

export function createAutoChain(ctx: AudioContext, prefs: DspPreferences): AutoChain {
  // Create basic audio nodes for safe fallback
  const inputGain = ctx.createGain();
  const outputGain = ctx.createGain();
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  
  // Basic EQ nodes
  const lowEQ = ctx.createBiquadFilter();
  lowEQ.type = 'lowshelf';
  lowEQ.frequency.value = 80;
  
  const midEQ = ctx.createBiquadFilter();
  midEQ.type = 'peaking';
  midEQ.frequency.value = 1000;
  midEQ.Q.value = 0.7;
  
  const highEQ = ctx.createBiquadFilter();
  highEQ.type = 'highshelf';
  highEQ.frequency.value = 10000;
  
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.ratio.value = 2;
  
  // Create sum node
  const preSweetenerSum = ctx.createGain();
  
  // Default: subtle mix
  dryGain.gain.value = 0.9;
  wetGain.gain.value = 0.1;
  
  // Configure basic EQ from prefs
  if (prefs.eqTiltDbPerDecade && prefs.eqTiltDbPerDecade !== 0) {
    const tilt = prefs.eqTiltDbPerDecade;
    lowEQ.gain.value = tilt;
    highEQ.gain.value = -tilt;
  }
  
  // Create simple audio chain: input -> EQ -> compressor -> output
  inputGain.connect(lowEQ);
  lowEQ.connect(midEQ);
  midEQ.connect(highEQ);
  highEQ.connect(compressor);
  compressor.connect(analyser);
  analyser.connect(outputGain);
  
  // Create placeholder modules for controls
  const mockModule = {
    getInput: () => inputGain,
    getOutput: () => outputGain,
    dispose: () => {},
    setWidth: () => {},
    setBands: () => {},
    setThreshold: () => {},
    setRatio: () => {},
    setAttack: () => {},
    setRelease: () => {},
    setMakeupGain: () => {},
    setKnee: () => {},
    setFrequency: () => {},
    setQ: () => {},
    setGain: () => {},
    setType: () => {},
    setIntensity: () => {},
    setMix: () => {},
    autoGainForBuffer: async () => ({ lufs: -14, peak: 0.9 })
  };

  let bypassed = false;
  const controls: ChainControls = {
    setEQ: (g) => {
      lowEQ.gain.value = g.low;
      midEQ.gain.value = g.mid;
      highEQ.gain.value = g.high;
    },
    setStereoWidth: (w) => {
      // Placeholder - implement stereo width logic
      console.log('Setting stereo width:', w);
    },
    setCompressor: (c) => {
      compressor.threshold.value = c.threshold;
      compressor.ratio.value = c.ratio;
      compressor.attack.value = c.attack / 1000; // Convert to seconds
      compressor.release.value = c.release / 1000;
      compressor.knee.value = c.knee;
    },
    setGain: (g) => {
      inputGain.gain.value = Math.pow(10, g.input / 20);
      outputGain.gain.value = Math.pow(10, g.output / 20);
    },
    toggleBypass: () => {
      bypassed = !bypassed;
      const gainValue = bypassed ? 0 : 1;
      inputGain.gain.setTargetAtTime(gainValue, ctx.currentTime, 0.01);
    },
    isBypassed: () => bypassed,
    setTechnoPunchIntensity: (v: number) => {
      console.log('TechnoPunch intensity:', v);
    },
    setTechnoPunchMix: (mix01: number) => {
      const m = Math.min(1, Math.max(0, mix01));
      wetGain.gain.setTargetAtTime(m, ctx.currentTime, 0.02);
      dryGain.gain.setTargetAtTime(1 - m, ctx.currentTime, 0.02);
    },
    enableTechnoPunch: (on: boolean) => {
      console.log('TechnoPunch enabled:', on);
    },
    // Mock DSP modules for compatibility
    parametricEQ: mockModule as any,
    multibandCompressor: mockModule as any,
    truePeakLimiter: mockModule as any,
    stereoEnhancer: mockModule as any,
    crossfeed: mockModule as any,
    convolutionReverb: mockModule as any,
    transientShaper: mockModule as any,
    setChainOrder: (order: string[]) => {
      console.log('Chain order:', order);
    }
  };

  return {
    input: inputGain,
    output: outputGain,
    controls,
    sweetener: {
      input: inputGain,
      output: outputGain,
      autoGainForBuffer: async () => ({ lufs: -14, appliedDb: 0 })
    } as any,
    analyser,
    disconnect: () => {
      try { lowEQ.disconnect(); } catch { /* noop */ }
      try { midEQ.disconnect(); } catch { /* noop */ }
      try { highEQ.disconnect(); } catch { /* noop */ }
      try { compressor.disconnect(); } catch { /* noop */ }
      try { analyser.disconnect(); } catch { /* noop */ }
      try { inputGain.disconnect(); } catch { /* noop */ }
      try { outputGain.disconnect(); } catch { /* noop */ }
      try { dryGain.disconnect(); } catch { /* noop */ }
      try { wetGain.disconnect(); } catch { /* noop */ }
    },
  };
}
