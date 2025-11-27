export interface EQBand {
  frequency: number;
  gain: number;
  q: number;
  type: BiquadFilterType;
  enabled: boolean;
}

export class ParametricEQ {
  private ctx: AudioContext;
  private bands: BiquadFilterNode[] = [];
  private input: GainNode;
  private output: GainNode;
  private bandConfigs: EQBand[] = [];

  constructor(ctx: AudioContext, numBands: number = 10) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    // Initialize 10-band parametric EQ with professional frequency distribution
    const defaultFreqs = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    
    for (let i = 0; i < numBands; i++) {
      const band = ctx.createBiquadFilter();
      band.type = i === 0 ? 'lowshelf' : i === numBands - 1 ? 'highshelf' : 'peaking';
      band.frequency.value = defaultFreqs[i] || 1000 * Math.pow(2, i - 5);
      band.Q.value = 0.7;
      band.gain.value = 0;
      
      this.bands.push(band);
      this.bandConfigs.push({
        frequency: band.frequency.value,
        gain: 0,
        q: 0.7,
        type: band.type,
        enabled: true
      });
    }

    this.connectNodes();
  }

  private connectNodes(): void {
    let prevNode: AudioNode = this.input;
    
    for (const band of this.bands) {
      prevNode.connect(band);
      prevNode = band;
    }
    
    prevNode.connect(this.output);
  }

  setBand(index: number, config: Partial<EQBand>): void {
    if (index < 0 || index >= this.bands.length) return;
    
    const band = this.bands[index];
    const bandConfig = this.bandConfigs[index];
    
    if (config.frequency !== undefined && config.frequency !== bandConfig.frequency) {
      band.frequency.setTargetAtTime(config.frequency, this.ctx.currentTime, 0.01);
      bandConfig.frequency = config.frequency;
    }
    
    if (config.gain !== undefined && config.gain !== bandConfig.gain) {
      band.gain.setTargetAtTime(config.gain, this.ctx.currentTime, 0.01);
      bandConfig.gain = config.gain;
    }
    
    if (config.q !== undefined && config.q !== bandConfig.q) {
      band.Q.setTargetAtTime(config.q, this.ctx.currentTime, 0.01);
      bandConfig.q = config.q;
    }
    
    if (config.type !== undefined && band.type !== config.type) {
      band.type = config.type;
      bandConfig.type = config.type;
    }
    
    if (config.enabled !== undefined && config.enabled !== bandConfig.enabled) {
      bandConfig.enabled = config.enabled;
      band.gain.setTargetAtTime(config.enabled ? bandConfig.gain : 0, this.ctx.currentTime, 0.01);
    }
  }

  getConfig(): EQBand[] {
    return [...this.bandConfigs];
  }

  reset(): void {
    this.bands.forEach((band, i) => {
      band.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
      this.bandConfigs[i].gain = 0;
    });
  }

  getInput(): AudioNode { return this.input; }
  getOutput(): AudioNode { return this.output; }

  dispose(): void {
    this.bands.forEach(band => band.disconnect());
    this.input.disconnect();
    this.output.disconnect();
  }
}
