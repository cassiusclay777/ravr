export async function applyCasshiTechnoPunch(
  context: AudioContext,
  audioBuffer: AudioBuffer,
  intensity: number = 1,
  shouldStart: boolean = true
): Promise<AudioNode> {
  const source = context.createBufferSource();
  source.buffer = audioBuffer;

  // 🔊 Low-end boost (bass EQ)
  const bassEQ = context.createBiquadFilter();
  bassEQ.type = 'lowshelf';
  bassEQ.frequency.value = 100;
  bassEQ.gain.value = 8 * intensity;

  // 🔊 Stereo shaping
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);
  const leftGain = context.createGain();
  const rightGain = context.createGain();
  leftGain.gain.value = 1 + 0.2 * intensity;
  rightGain.gain.value = 1 - 0.2 * intensity;

  // 🌬️ Clarity boost (airy EQ)
  const airyEQ = context.createBiquadFilter();
  airyEQ.type = 'highshelf';
  airyEQ.frequency.value = 8000;
  airyEQ.gain.value = 6 * intensity;

  // ⚡ Compression & punch
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -24 - intensity * 6;
  compressor.knee.value = 20 - intensity * 5;
  compressor.ratio.value = 3 + intensity * 2;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // 🔀 Chain connections
  source.connect(bassEQ);
  bassEQ.connect(splitter);
  splitter.connect(leftGain, 0);
  splitter.connect(rightGain, 1);
  leftGain.connect(merger, 0, 0);
  rightGain.connect(merger, 0, 1);
  merger.connect(airyEQ);
  airyEQ.connect(compressor);

  // ⏯️ Optional playback
  if (shouldStart) source.start();

  // 🔌 Return output node → useful for analysis, export or chaining
  return compressor;
}

// Streaming-friendly builder that can be inserted into an existing audio graph.
// Usage: const punch = buildTechnoPunch(ctx, 0.8); input.connect(punch.input); punch.output.connect(next);
export function buildTechnoPunch(
  context: AudioContext,
  initialIntensity: number = 1
): { input: GainNode; output: AudioNode; setIntensity: (v: number) => void; dispose: () => void } {
  const input = context.createGain();
  // Ensure stereo processing path is available
  try {
    (input as any).channelCount = 2;
    (input as any).channelCountMode = 'explicit';
  } catch {
    // ignore if not supported
  }

  let intensity = initialIntensity;

  // 🔊 Low-end boost (bass EQ)
  const bassEQ = context.createBiquadFilter();
  bassEQ.type = 'lowshelf';
  bassEQ.frequency.value = 100;
  bassEQ.gain.value = 8 * intensity;

  // 🔊 Stereo shaping
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);
  const leftGain = context.createGain();
  const rightGain = context.createGain();
  leftGain.gain.value = 1 + 0.2 * intensity;
  rightGain.gain.value = 1 - 0.2 * intensity;

  // 🌬️ Clarity boost (airy EQ)
  const airyEQ = context.createBiquadFilter();
  airyEQ.type = 'highshelf';
  airyEQ.frequency.value = 8000;
  airyEQ.gain.value = 6 * intensity;

  // ⚡ Compression & punch
  const compressor = context.createDynamicsCompressor();
  const setComp = (i: number) => {
    compressor.threshold.setTargetAtTime(-24 - i * 6, context.currentTime, 0.02);
    compressor.knee.setTargetAtTime(20 - i * 5, context.currentTime, 0.02);
    compressor.ratio.setTargetAtTime(3 + i * 2, context.currentTime, 0.02);
    compressor.attack.setTargetAtTime(0.003, context.currentTime, 0.02);
    compressor.release.setTargetAtTime(0.25, context.currentTime, 0.02);
  };
  setComp(intensity);

  // 🔀 Chain connections (streaming; no internal source)
  input.connect(bassEQ);
  bassEQ.connect(splitter);
  splitter.connect(leftGain, 0);
  splitter.connect(rightGain, 1);
  leftGain.connect(merger, 0, 0);
  rightGain.connect(merger, 0, 1);
  merger.connect(airyEQ);
  airyEQ.connect(compressor);

  const output = compressor as AudioNode;

  const setIntensity = (v: number) => {
    intensity = Math.max(0, v);
    bassEQ.gain.setTargetAtTime(8 * intensity, context.currentTime, 0.02);
    leftGain.gain.setTargetAtTime(1 + 0.2 * intensity, context.currentTime, 0.02);
    rightGain.gain.setTargetAtTime(1 - 0.2 * intensity, context.currentTime, 0.02);
    airyEQ.gain.setTargetAtTime(6 * intensity, context.currentTime, 0.02);
    setComp(intensity);
  };

  const dispose = () => {
    try { input.disconnect(); } catch {}
    try { bassEQ.disconnect(); } catch {}
    try { splitter.disconnect(); } catch {}
    try { leftGain.disconnect(); } catch {}
    try { rightGain.disconnect(); } catch {}
    try { merger.disconnect(); } catch {}
    try { airyEQ.disconnect(); } catch {}
    try { compressor.disconnect(); } catch {}
  };

  return { input, output, setIntensity, dispose };
}