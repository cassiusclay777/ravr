export class TruePeakLimiter {
  private ctx: AudioContext;
  private input: GainNode;
  private output: GainNode;
  private oversampleFactor = 4;
  private lookahead = 0.005; // 5ms
  private ceiling = -0.1; // dB
  private release = 0.05; // 50ms
  
  private compressor: DynamicsCompressorNode;
  private makeupGain: GainNode;
  private delayNode: DelayNode;
  private analyser: AnalyserNode;
  private envelope = 0;
  private lastTime = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    
    this.delayNode = ctx.createDelay(0.1);
    this.delayNode.delayTime.value = this.lookahead;
    
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = this.ceiling;
    this.compressor.ratio.value = 20; // Brickwall
    this.compressor.attack.value = 0.0001;
    this.compressor.release.value = this.release;
    this.compressor.knee.value = 0;
    
    this.makeupGain = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    
    this.connectNodes();
    this.startTruePeakDetection();
  }

  private connectNodes(): void {
    this.input.connect(this.delayNode);
    this.delayNode.connect(this.compressor);
    this.compressor.connect(this.makeupGain);
    this.makeupGain.connect(this.output);
    this.makeupGain.connect(this.analyser);
  }

  private startTruePeakDetection(): void {
    const buffer = new Float32Array(this.analyser.fftSize);
    
    const detect = () => {
      this.analyser.getFloatTimeDomainData(buffer);
      
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        const sample = Math.abs(buffer[i]);
        if (sample > peak) peak = sample;
      }
      
      // Oversample simulation for true peak
      const truePeak = peak * (1 + (this.oversampleFactor - 1) * 0.1);
      
      const now = this.ctx.currentTime;
      const dt = now - this.lastTime;
      this.lastTime = now;
      
      // Envelope follower
      const attack = 0.0001;
      const release = this.release;
      
      if (truePeak > this.envelope) {
        this.envelope = truePeak;
      } else {
        this.envelope *= Math.exp(-dt / release);
      }
      
      // Adjust threshold based on true peak
      const targetThreshold = Math.min(this.ceiling, 20 * Math.log10(1 / Math.max(this.envelope, 0.001)));
      this.compressor.threshold.setTargetAtTime(targetThreshold, now, attack);
      
      requestAnimationFrame(detect);
    };
    
    detect();
  }

  setCeiling(dB: number): void {
    this.ceiling = Math.max(-3, Math.min(0, dB));
    this.compressor.threshold.value = this.ceiling;
  }

  setRelease(ms: number): void {
    this.release = ms / 1000;
    this.compressor.release.value = this.release;
  }

  setLookahead(ms: number): void {
    this.lookahead = Math.min(0.1, ms / 1000);
    this.delayNode.delayTime.setTargetAtTime(this.lookahead, this.ctx.currentTime, 0.01);
  }

  getInput(): AudioNode { return this.input; }
  getOutput(): AudioNode { return this.output; }

  dispose(): void {
    this.input.disconnect();
    this.delayNode.disconnect();
    this.compressor.disconnect();
    this.makeupGain.disconnect();
    this.analyser.disconnect();
    this.output.disconnect();
  }
}
