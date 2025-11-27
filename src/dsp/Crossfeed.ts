export type CrossfeedType = 'bauer' | 'meier' | 'custom';

export class Crossfeed {
  private ctx: AudioContext;
  private input: GainNode;
  private output: GainNode;
  
  private splitter: ChannelSplitterNode;
  private merger: ChannelMergerNode;
  
  // Crossfeed paths
  private directL: GainNode;
  private directR: GainNode;
  private crossL: GainNode;
  private crossR: GainNode;
  
  // Filters for crossfeed
  private lowpassL: BiquadFilterNode;
  private lowpassR: BiquadFilterNode;
  private delayL: DelayNode;
  private delayR: DelayNode;
  
  private type: CrossfeedType = 'bauer';
  private amount = 0.5;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    
    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);
    
    // Direct paths
    this.directL = ctx.createGain();
    this.directR = ctx.createGain();
    
    // Cross paths
    this.crossL = ctx.createGain();
    this.crossR = ctx.createGain();
    
    // Filters
    this.lowpassL = ctx.createBiquadFilter();
    this.lowpassR = ctx.createBiquadFilter();
    this.lowpassL.type = 'lowpass';
    this.lowpassR.type = 'lowpass';
    
    // Delays for ITD (Interaural Time Difference)
    this.delayL = ctx.createDelay(0.001);
    this.delayR = ctx.createDelay(0.001);
    
    this.applyPreset('bauer');
    this.connectNodes();
  }

  private connectNodes(): void {
    this.input.connect(this.splitter);
    
    // Direct paths
    this.splitter.connect(this.directL, 0);
    this.splitter.connect(this.directR, 1);
    
    // Cross paths with filtering and delay
    this.splitter.connect(this.lowpassL, 0);
    this.splitter.connect(this.lowpassR, 1);
    
    this.lowpassL.connect(this.delayL);
    this.lowpassR.connect(this.delayR);
    
    this.delayL.connect(this.crossR);
    this.delayR.connect(this.crossL);
    
    // Mix to output
    this.directL.connect(this.merger, 0, 0);
    this.directR.connect(this.merger, 0, 1);
    this.crossL.connect(this.merger, 0, 0);
    this.crossR.connect(this.merger, 0, 1);
    
    this.merger.connect(this.output);
  }

  private applyPreset(type: CrossfeedType): void {
    switch (type) {
      case 'bauer':
        // Bauer stereophonic-to-binaural DSP
        this.lowpassL.frequency.value = 700;
        this.lowpassR.frequency.value = 700;
        this.lowpassL.Q.value = 0.5;
        this.lowpassR.Q.value = 0.5;
        this.delayL.delayTime.value = 0.00026; // 260 μs
        this.delayR.delayTime.value = 0.00026;
        this.directL.gain.value = 0.85;
        this.directR.gain.value = 0.85;
        this.crossL.gain.value = 0.35;
        this.crossR.gain.value = 0.35;
        break;
        
      case 'meier':
        // Meier crossfeed
        this.lowpassL.frequency.value = 650;
        this.lowpassR.frequency.value = 650;
        this.lowpassL.Q.value = 0.7;
        this.lowpassR.Q.value = 0.7;
        this.delayL.delayTime.value = 0.00033; // 330 μs
        this.delayR.delayTime.value = 0.00033;
        this.directL.gain.value = 0.8;
        this.directR.gain.value = 0.8;
        this.crossL.gain.value = 0.45;
        this.crossR.gain.value = 0.45;
        break;
        
      case 'custom':
        // Keep current values
        break;
    }
    
    this.type = type;
  }

  setType(type: CrossfeedType): void {
    this.applyPreset(type);
  }

  setAmount(amount: number): void {
    this.amount = Math.max(0, Math.min(1, amount));
    
    const directGain = 1 - this.amount * 0.3;
    const crossGain = this.amount * 0.5;
    
    this.directL.gain.setTargetAtTime(directGain, this.ctx.currentTime, 0.01);
    this.directR.gain.setTargetAtTime(directGain, this.ctx.currentTime, 0.01);
    this.crossL.gain.setTargetAtTime(crossGain, this.ctx.currentTime, 0.01);
    this.crossR.gain.setTargetAtTime(crossGain, this.ctx.currentTime, 0.01);
  }

  setCustomParams(freq: number, delay: number, directGain: number, crossGain: number): void {
    this.type = 'custom';
    
    this.lowpassL.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.01);
    this.lowpassR.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.01);
    
    this.delayL.delayTime.setTargetAtTime(delay, this.ctx.currentTime, 0.01);
    this.delayR.delayTime.setTargetAtTime(delay, this.ctx.currentTime, 0.01);
    
    this.directL.gain.setTargetAtTime(directGain, this.ctx.currentTime, 0.01);
    this.directR.gain.setTargetAtTime(directGain, this.ctx.currentTime, 0.01);
    
    this.crossL.gain.setTargetAtTime(crossGain, this.ctx.currentTime, 0.01);
    this.crossR.gain.setTargetAtTime(crossGain, this.ctx.currentTime, 0.01);
  }

  getInput(): AudioNode { return this.input; }
  getOutput(): AudioNode { return this.output; }

  dispose(): void {
    this.input.disconnect();
    this.splitter.disconnect();
    this.directL.disconnect();
    this.directR.disconnect();
    this.crossL.disconnect();
    this.crossR.disconnect();
    this.lowpassL.disconnect();
    this.lowpassR.disconnect();
    this.delayL.disconnect();
    this.delayR.disconnect();
    this.merger.disconnect();
    this.output.disconnect();
  }
}
