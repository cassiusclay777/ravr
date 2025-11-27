export function useHifiTurbo(ctx: AudioContext, out: AudioNode) {
  const src = ctx.createGain(),
        pre = ctx.createGain(),
        post = ctx.createGain();
  
  pre.gain.value = 0.9;
  post.gain.value = 1.02;
  
  const eq = new BiquadFilterNode(ctx, { type: "lowshelf", frequency: 80, gain: 2 });
  const tilt = new BiquadFilterNode(ctx, { type: "highshelf", frequency: 9000, gain: 1.5 });
  const comp = new DynamicsCompressorNode(ctx, { threshold: -18, ratio: 2.5, attack: 0.005, release: 0.08 });
  const lim = new DynamicsCompressorNode(ctx, { threshold: -1, ratio: 20, attack: 0.001, release: 0.15 });
  
  const split = ctx.createChannelSplitter(2);
  const merge = ctx.createChannelMerger(2);
  const l = ctx.createGain();
  const r = ctx.createGain();
  const l2r = ctx.createGain();
  const r2l = ctx.createGain();
  
  l2r.gain.value = r2l.gain.value = 0.08;
  
  // Signal routing
  pre.connect(split);
  split.connect(l, 0);
  split.connect(r, 1);
  l.connect(merge, 0, 0);
  r.connect(merge, 0, 1);
  l.connect(r2l).connect(merge, 0, 1);
  r.connect(l2r).connect(merge, 0, 0);
  
  // Main signal chain
  src.connect(pre);
  merge.connect(eq).connect(tilt).connect(comp).connect(lim).connect(post).connect(out);
  
  return {
    input: src,
    bypass() {
      src.disconnect();
      src.connect(out);
    },
    enable() {
      src.disconnect();
      src.connect(pre);
    }
  };
}
