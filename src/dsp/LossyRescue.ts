export interface LossyRescueNode {
  input: AudioNode;
  output: AudioNode;
  setMix: (value: number) => void;
  bypass: (value: boolean) => void;
}

// Helper functions for type-safe connections
const connectAudioNode = <T extends AudioNode>(
  source: T,
  destination: AudioNode,
  output?: number,
  input?: number,
): T => {
  return source.connect(destination, output, input) as T;
};

function connectAudioParam({
  source,
  destination,
  output,
}: {
  source: AudioNode;
  destination: AudioParam;
  output?: number;
}): void {
  source.connect(destination, output);
}

export function buildLossyRescue(ctx: AudioContext): LossyRescueNode {
  const pre = ctx.createGain();
  pre.gain.value = 0.9;

  // EQ stages
  const lows = ctx.createBiquadFilter();
  lows.type = 'lowshelf';
  lows.frequency.value = 90;
  lows.gain.value = 1.5;

  const highs = ctx.createBiquadFilter();
  highs.type = 'highshelf';
  highs.frequency.value = 6800;
  highs.gain.value = 2.0;

  // Exciter path
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 4500;
  bp.Q.value = 0.8;

  const exc = ctx.createWaveShaper();
  exc.curve = new Float32Array(65536).map((_, i) => {
    const x = i / 32768 - 1;
    return Math.tanh(x * 3.5);
  });

  const excG = ctx.createGain();
  excG.gain.value = 0.12;

  // Split-band compression
  const loSplit = ctx.createBiquadFilter();
  loSplit.type = 'lowshelf';
  loSplit.frequency.value = 220;

  const loC = ctx.createDynamicsCompressor();
  loC.threshold.value = -28;
  loC.ratio.value = 2.5;
  loC.knee.value = 12;
  loC.attack.value = 0.01;
  loC.release.value = 0.12;

  const hiSplit = ctx.createBiquadFilter();
  hiSplit.type = 'highpass';
  hiSplit.frequency.value = 220;

  const hiC = ctx.createDynamicsCompressor();
  hiC.threshold.value = -24;
  hiC.ratio.value = 1.8;
  hiC.knee.value = 10;
  hiC.attack.value = 0.003;
  hiC.release.value = 0.08;

  // De-esser
  const deEs = ctx.createDynamicsCompressor();
  deEs.threshold.value = -35;
  deEs.ratio.value = 3;
  deEs.knee.value = 8;
  deEs.attack.value = 0.002;
  deEs.release.value = 0.06;

  const deBand = ctx.createBiquadFilter();
  deBand.type = 'bandpass';
  deBand.frequency.value = 7500;
  deBand.Q.value = 2.2;

  // Limiter
  const shaper = ctx.createWaveShaper();
  shaper.curve = new Float32Array(65536).map((_, i) => {
    const x = i / 32768 - 1;
    return Math.tanh(x * 2.2) * 0.97;
  });

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1.5;
  limiter.ratio.value = 20;
  limiter.knee.value = 0;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.08;

  // Dither
  const dither = ctx.createGain();
  dither.gain.value = 1e-5;

  // Mix controls
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const mix = ctx.createGain();
  mix.gain.value = 1;

  // Connect nodes using the standardized-audio-context connector
  connectAudioNode(pre, lows);
  connectAudioNode(lows, highs);

  // Exciter path
  connectAudioNode(highs, bp);
  connectAudioNode(bp, exc);
  connectAudioNode(exc, excG);

  // Split-band compression
  const loBus = ctx.createGain();
  connectAudioNode(highs, loSplit);
  connectAudioNode(loSplit, loC);
  connectAudioNode(loC, loBus);

  const hiBus = ctx.createGain();
  connectAudioNode(highs, hiSplit);
  connectAudioNode(hiSplit, hiC);
  connectAudioNode(hiC, hiBus);

  // Summing
  const sum = ctx.createGain();
  connectAudioNode(highs, dry);
  connectAudioNode(dry, sum);
  connectAudioNode(excG, sum);
  connectAudioNode(loBus, sum);
  connectAudioNode(hiBus, sum);

  // Process chain
  connectAudioNode(sum, shaper);
  connectAudioNode(shaper, limiter);
  connectAudioNode(limiter, dither);

  // De-esser sidechain
  connectAudioNode(deBand, deEs);
  connectAudioParam({ source: deEs, destination: dither.gain as unknown as AudioParam });

  // Wet/dry mix
  const output = ctx.createGain();
  dry.gain.value = 1;
  connectAudioNode(dither, wet);
  connectAudioNode(wet, output);
  connectAudioNode(dry, output);
  // Bypass functionality
  let isBypassed = false;
  const bypassNode = ctx.createGain();
  pre.connect(bypassNode);

  const fadeTime = 0.01; // 10ms fade time for smooth transitions

  const setMix = (value: number) => {
    const now = ctx.currentTime;
    dry.gain.setTargetAtTime(1 - value, now, fadeTime);
    wet.gain.setTargetAtTime(value, now, fadeTime);
  };

  const bypass = (value: boolean) => {
    if (value === isBypassed) return;

    const now = ctx.currentTime;
    isBypassed = value;

    if (value) {
      // Fade to bypass
      output.gain.setTargetAtTime(0, now, fadeTime);
      bypassNode.gain.setTargetAtTime(1, now, fadeTime);
    } else {
      // Fade from bypass
      output.gain.setTargetAtTime(1, now, fadeTime);
      bypassNode.gain.setTargetAtTime(0, now, fadeTime);
    }
  };

  // Initialize bypass state
  bypass(false);

  return {
    input: pre,
    output: bypassNode,
    setMix,
    bypass,
  };
}
