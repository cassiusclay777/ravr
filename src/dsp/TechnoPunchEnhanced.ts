export function buildTechnoPunchEnhanced(ctx: AudioContext) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  
  // Multi-band processing for better punch
  const lowSplit = ctx.createBiquadFilter();
  lowSplit.type = 'lowpass';
  lowSplit.frequency.value = 250;
  lowSplit.Q.value = 0.707;
  
  const midSplit = ctx.createBiquadFilter();
  midSplit.type = 'bandpass';
  midSplit.frequency.value = 1000;
  midSplit.Q.value = 2.0;
  
  const highSplit = ctx.createBiquadFilter();
  highSplit.type = 'highpass';
  highSplit.frequency.value = 4000;
  highSplit.Q.value = 0.707;
  
  // Transient enhancer using waveshaper
  const transientEnhancer = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 512) - 1;
    // Subtle transient enhancement curve
    curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.8);
  }
  transientEnhancer.curve = curve;
  transientEnhancer.oversample = '4x';
  
  // Parallel compression for punch
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -15;
  compressor.knee.value = 4;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.001;
  compressor.release.value = 0.05;
  
  // Makeup gain
  const makeupGain = ctx.createGain();
  makeupGain.gain.value = 2.0;
  
  // Wet/dry mix
  const wetGain = ctx.createGain();
  const dryGain = ctx.createGain();
  wetGain.gain.value = 0.3;
  dryGain.gain.value = 0.7;
  
  // Connect processing chain
  input.connect(lowSplit);
  input.connect(midSplit);
  input.connect(highSplit);
  
  // Combine bands and process
  const bandMixer = ctx.createGain();
  lowSplit.connect(bandMixer);
  midSplit.connect(bandMixer);
  highSplit.connect(bandMixer);
  
  bandMixer.connect(transientEnhancer);
  transientEnhancer.connect(compressor);
  compressor.connect(makeupGain);
  makeupGain.connect(wetGain);
  
  // Dry path
  input.connect(dryGain);
  
  // Mix wet and dry
  wetGain.connect(output);
  dryGain.connect(output);
  
  return {
    input,
    output,
    setIntensity: (intensity: number) => {
      const clampedIntensity = Math.max(0, Math.min(1, intensity));
      makeupGain.gain.value = 1 + clampedIntensity * 2;
      compressor.threshold.value = -20 + clampedIntensity * 10;
    },
    setMix: (mix: number) => {
      const clampedMix = Math.max(0, Math.min(1, mix));
      wetGain.gain.value = clampedMix;
      dryGain.gain.value = 1 - clampedMix;
    }
  };
}
