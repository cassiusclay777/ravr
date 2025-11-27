export class StereoEnhancer {
  private ctx: AudioContext;
  private input: GainNode;
  private output: GainNode;
  
  // Mid/Side processing
  private splitter: ChannelSplitterNode;
  private merger: ChannelMergerNode;
  private midGain: GainNode;
  private sideGain: GainNode;
  
  // Haas effect
  private delayL: DelayNode;
  private delayR: DelayNode;
  
  // Phase shifter
  private allpassL: BiquadFilterNode;
  private allpassR: BiquadFilterNode;
  
  private width = 1.0; // 0 = mono, 1 = normal, 2 = wide
  private bassMonoFreq = 120; // Hz - frequencies below this are mono
  private bassMonoFilter: BiquadFilterNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    
    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);
    
    // Mid/Side matrix
    this.midGain = ctx.createGain();
    this.sideGain = ctx.createGain();
    
    // Haas delays
    this.delayL = ctx.createDelay(0.03);
    this.delayR = ctx.createDelay(0.03);
    this.delayL.delayTime.value = 0;
    this.delayR.delayTime.value = 0;
    
    // Phase shifters
    this.allpassL = ctx.createBiquadFilter();
    this.allpassR = ctx.createBiquadFilter();
    this.allpassL.type = 'allpass';
    this.allpassR.type = 'allpass';
    this.allpassL.frequency.value = 600;
    this.allpassR.frequency.value = 600;
    
    // Bass mono filter
    this.bassMonoFilter = ctx.createBiquadFilter();
    this.bassMonoFilter.type = 'highpass';
    this.bassMonoFilter.frequency.value = this.bassMonoFreq;
    
    this.connectNodes();
  }

  private connectNodes(): void {
    // Input to splitter
    this.input.connect(this.splitter);
    
    // Create mid/side matrix
    const midSplitter = this.ctx.createChannelSplitter(2);
    const sideSplitter = this.ctx.createChannelSplitter(2);
    
    // Mid = (L + R) / 2
    const midL = this.ctx.createGain();
    const midR = this.ctx.createGain();
    midL.gain.value = 0.5;
    midR.gain.value = 0.5;
    
    this.splitter.connect(midL, 0);
    this.splitter.connect(midR, 1);
    midL.connect(this.midGain);
    midR.connect(this.midGain);
    
    // Side = (L - R) / 2
    const sideL = this.ctx.createGain();
    const sideR = this.ctx.createGain();
    sideL.gain.value = 0.5;
    sideR.gain.value = -0.5;
    
    this.splitter.connect(sideL, 0);
    this.splitter.connect(sideR, 1);
    sideL.connect(this.sideGain);
    sideR.connect(this.sideGain);
    
    // Apply bass mono
    this.sideGain.connect(this.bassMonoFilter);
    
    // Apply Haas effect
    this.bassMonoFilter.connect(this.delayL);
    this.bassMonoFilter.connect(this.delayR);
    
    // Apply phase shift
    this.delayL.connect(this.allpassL);
    this.delayR.connect(this.allpassR);
    
    // Decode mid/side back to L/R
    const decoderL = this.ctx.createGain();
    const decoderR = this.ctx.createGain();
    
    this.midGain.connect(decoderL);
    this.midGain.connect(decoderR);
    this.allpassL.connect(decoderL);
    this.allpassR.connect(decoderR);
    
    // Connect to output
    decoderL.connect(this.merger, 0, 0);
    decoderR.connect(this.merger, 0, 1);
    this.merger.connect(this.output);
  }

  setWidth(width: number): void {
    this.width = Math.max(0, Math.min(2, width));
    
    // Adjust mid/side balance
    const midLevel = this.width <= 1 ? 1 : 2 - this.width;
    const sideLevel = this.width;
    
    this.midGain.gain.setTargetAtTime(midLevel, this.ctx.currentTime, 0.01);
    this.sideGain.gain.setTargetAtTime(sideLevel, this.ctx.currentTime, 0.01);
    
    // Adjust Haas effect
    const delayAmount = Math.max(0, (this.width - 1) * 0.001); // 0-1ms
    this.delayL.delayTime.setTargetAtTime(0, this.ctx.currentTime, 0.01);
    this.delayR.delayTime.setTargetAtTime(delayAmount, this.ctx.currentTime, 0.01);
  }

  setBassMonoFrequency(freq: number): void {
    this.bassMonoFreq = Math.max(20, Math.min(500, freq));
    this.bassMonoFilter.frequency.setTargetAtTime(this.bassMonoFreq, this.ctx.currentTime, 0.01);
  }

  enablePhaseShift(enable: boolean): void {
    const freq = enable ? 600 : 20000;
    this.allpassL.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.01);
    this.allpassR.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.01);
  }

  getInput(): AudioNode { return this.input; }
  getOutput(): AudioNode { return this.output; }

  dispose(): void {
    this.input.disconnect();
    this.splitter.disconnect();
    this.midGain.disconnect();
    this.sideGain.disconnect();
    this.bassMonoFilter.disconnect();
    this.delayL.disconnect();
    this.delayR.disconnect();
    this.allpassL.disconnect();
    this.allpassR.disconnect();
    this.merger.disconnect();
    this.output.disconnect();
  }
}
