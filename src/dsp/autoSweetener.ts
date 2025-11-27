import { measureIntegratedLUFS, gainForTargetLUFS } from '../utils/lufs';

export function buildAutoSweetener(ctx: AudioContext) {
  const inNode = ctx.createGain();
  const preGain = ctx.createGain();

  const hp20 = ctx.createBiquadFilter();
  hp20.type = 'highpass';
  hp20.frequency.value = 20;
  hp20.Q.value = 0.707;

  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 90;
  lowShelf.gain.value = 2.5;

  const highShelf = ctx.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 8500;
  highShelf.gain.value = 2.0;

  const split = ctx.createChannelSplitter(2);
  const merge = ctx.createChannelMerger(2);
  const inv = ctx.createGain();
  inv.gain.value = -1.0;

  const lp120_M = ctx.createBiquadFilter();
  lp120_M.type = 'lowpass';
  lp120_M.frequency.value = 120;
  const hp120_S = ctx.createBiquadFilter();
  hp120_S.type = 'highpass';
  hp120_S.frequency.value = 120;

  const smoother = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 128 - 1;
    const k = 1.5;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  smoother.curve = curve;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1.0;
  limiter.knee.value = 0.0;
  limiter.ratio.value = 20.0;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.05;

  // Drátování
  inNode.connect(preGain).connect(hp20).connect(lowShelf).connect(highShelf).connect(split);

  const L = ctx.createGain(),
    R = ctx.createGain();
  split.connect(L, 0);
  split.connect(R, 1);

  const M = ctx.createGain();
  const S = ctx.createGain();
  // Build M/S with proper scaling: M = 0.5*(L+R), S = 0.5*(L-R)
  M.gain.value = 0.5;
  S.gain.value = 0.5;
  L.connect(M);
  R.connect(M);
  L.connect(S);
  R.connect(inv);
  inv.connect(S);

  M.connect(lp120_M);
  S.connect(hp120_S);

  const outM = ctx.createGain(),
    outS = ctx.createGain();
  lp120_M.connect(outM);
  hp120_S.connect(outS);

  // Decode M/S back to L/R: L = M + S, R = M - S
  outM.connect(merge, 0, 0);
  outM.connect(merge, 0, 1);
  const sToL = ctx.createGain();
  sToL.gain.value = 1;
  const sToRInv = ctx.createGain();
  sToRInv.gain.value = -1;
  outS.connect(sToL).connect(merge, 0, 0);
  outS.connect(sToRInv).connect(merge, 0, 1);

  merge.connect(smoother).connect(limiter);

  return {
    input: inNode,
    output: limiter,
    async autoGainForBuffer(audioBuffer: AudioBuffer, targetLUFS = -14) {
      const lufs = await measureIntegratedLUFS(audioBuffer);
      const linear = gainForTargetLUFS(lufs, targetLUFS);
      preGain.gain.value = Math.max(0.1, Math.min(5, linear));
      return { lufs, appliedDb: 20 * Math.log10(preGain.gain.value) };
    },
  };
}
