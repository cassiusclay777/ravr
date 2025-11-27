export interface CompressorBand {
  frequency: number;
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  knee: number;
  gain: number;
}

export class MultibandCompressor {
  private ctx: AudioContext;
  private input: GainNode;
  private output: GainNode;
  private bands: {
    lowpass?: BiquadFilterNode;
    highpass?: BiquadFilterNode;
    compressor: DynamicsCompressorNode;
    gain: GainNode;
  }[] = [];
  private splitter: ChannelSplitterNode;
  private merger: ChannelMergerNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);

    // 3-band compressor: Low (< 200Hz), Mid (200-2000Hz), High (> 2000Hz)
    const frequencies = [200, 2000];
    
    // Low band
    const lowBand = {
      highpass: undefined,
      lowpass: ctx.createBiquadFilter(),
      compressor: ctx.createDynamicsCompressor(),
      gain: ctx.createGain()
    };
    lowBand.lowpass!.type = 'lowpass';
    lowBand.lowpass!.frequency.value = frequencies[0];
    lowBand.compressor.threshold.value = -24;
    lowBand.compressor.ratio.value = 4;
    lowBand.compressor.attack.value = 0.003;
    lowBand.compressor.release.value = 0.1;
    this.bands.push(lowBand);

    // Mid band
    const midBand = {
      highpass: ctx.createBiquadFilter(),
      lowpass: ctx.createBiquadFilter(),
      compressor: ctx.createDynamicsCompressor(),
      gain: ctx.createGain()
    };
    midBand.highpass!.type = 'highpass';
    midBand.highpass!.frequency.value = frequencies[0];
    midBand.lowpass!.type = 'lowpass';
    midBand.lowpass!.frequency.value = frequencies[1];
    midBand.compressor.threshold.value = -20;
    midBand.compressor.ratio.value = 3;
    midBand.compressor.attack.value = 0.002;
    midBand.compressor.release.value = 0.05;
    this.bands.push(midBand);

    // High band
    const highBand = {
      highpass: ctx.createBiquadFilter(),
      lowpass: undefined,
      compressor: ctx.createDynamicsCompressor(),
      gain: ctx.createGain()
    };
    highBand.highpass!.type = 'highpass';
    highBand.highpass!.frequency.value = frequencies[1];
    highBand.compressor.threshold.value = -18;
    highBand.compressor.ratio.value = 2.5;
    highBand.compressor.attack.value = 0.001;
    highBand.compressor.release.value = 0.03;
    this.bands.push(highBand);

    this.connectNodes();
  }

  private connectNodes(): void {
    this.input.connect(this.splitter);

    this.bands.forEach((band, index) => {
      let node: AudioNode = this.splitter;
      
      if (band.highpass) {
        this.splitter.connect(band.highpass, 0);
        this.splitter.connect(band.highpass, 1);
        node = band.highpass;
      }
      
      if (band.lowpass) {
        if (node === this.splitter) {
          this.splitter.connect(band.lowpass, 0);
          this.splitter.connect(band.lowpass, 1);
        } else {
          node.connect(band.lowpass);
        }
        node = band.lowpass;
      }
      
      node.connect(band.compressor);
      band.compressor.connect(band.gain);
      band.gain.connect(this.merger, 0, 0);
      band.gain.connect(this.merger, 0, 1);
    });

    this.merger.connect(this.output);
  }

  setBandCompressor(bandIndex: number, params: Partial<CompressorBand>): void {
    if (bandIndex < 0 || bandIndex >= this.bands.length) return;
    
    const band = this.bands[bandIndex];
    
    if (params.threshold !== undefined) {
      band.compressor.threshold.setTargetAtTime(params.threshold, this.ctx.currentTime, 0.01);
    }
    if (params.ratio !== undefined) {
      band.compressor.ratio.setTargetAtTime(params.ratio, this.ctx.currentTime, 0.01);
    }
    if (params.attack !== undefined) {
      band.compressor.attack.setTargetAtTime(params.attack, this.ctx.currentTime, 0.01);
    }
    if (params.release !== undefined) {
      band.compressor.release.setTargetAtTime(params.release, this.ctx.currentTime, 0.01);
    }
    if (params.gain !== undefined) {
      band.gain.gain.setTargetAtTime(params.gain, this.ctx.currentTime, 0.01);
    }
  }

  setCrossovers(low: number, high: number): void {
    this.bands[0].lowpass!.frequency.setTargetAtTime(low, this.ctx.currentTime, 0.01);
    this.bands[1].highpass!.frequency.setTargetAtTime(low, this.ctx.currentTime, 0.01);
    this.bands[1].lowpass!.frequency.setTargetAtTime(high, this.ctx.currentTime, 0.01);
    this.bands[2].highpass!.frequency.setTargetAtTime(high, this.ctx.currentTime, 0.01);
  }

  getInput(): AudioNode { return this.input; }
  getOutput(): AudioNode { return this.output; }

  dispose(): void {
    this.bands.forEach(band => {
      band.highpass?.disconnect();
      band.lowpass?.disconnect();
      band.compressor.disconnect();
      band.gain.disconnect();
    });
    this.splitter.disconnect();
    this.merger.disconnect();
    this.input.disconnect();
    this.output.disconnect();
  }
}
