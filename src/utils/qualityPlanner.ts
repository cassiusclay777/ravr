export type LatencyClass = 'low' | 'normal' | 'high';

export interface QualityPlan {
  sampleRate: number;
  latencyMs: number;
  latencyClass: LatencyClass;
  safe: boolean;
}

export async function planQuality(ctx: BaseAudioContext): Promise<QualityPlan> {
  // In browsers, sampleRate is fixed for an AudioContext
  const sr = ctx.sampleRate;
  const baseLatency = (ctx as AudioContext).baseLatency ?? 0.02; // seconds (approx)
  const outputLatency = (ctx as AudioContext).outputLatency ?? 0.0; // seconds (approx)
  const total = (baseLatency + outputLatency) * 1000;

  let latencyClass: LatencyClass = 'normal';
  if (total < 25) latencyClass = 'low';
  else if (total > 120) latencyClass = 'high';

  return {
    sampleRate: sr,
    latencyMs: Math.round(total),
    latencyClass,
    safe: true,
  };
}
