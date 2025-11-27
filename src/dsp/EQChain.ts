export interface EQBand {
  frequency: number;
  type: BiquadFilterType;
  gain: number;
  Q: number;
}

export class EQChain {
  private audioContext: AudioContext;
  private filters: BiquadFilterNode[] = [];
  private inputNode: GainNode;
  private outputNode: GainNode;
  
  private readonly bands: EQBand[] = [
    { frequency: 31, type: 'lowshelf', gain: 0, Q: 1 },
    { frequency: 62, type: 'peaking', gain: 0, Q: 1 },
    { frequency: 125, type: 'peaking', gain: 0, Q: 1 },
    { frequency: 250, type: 'peaking', gain: 0, Q: 1 },
    { frequency: 500, type: 'peaking', gain: 0, Q: 1 },
    { frequency: 1000, type: 'peaking', gain: 0, Q: 1 },
    { frequency: 2000, type: 'peaking', gain: 0, Q: 1 },
    { frequency: 4000, type: 'peaking', gain: 0, Q: 1 },
    { frequency: 8000, type: 'peaking', gain: 0, Q: 1 },
    { frequency: 16000, type: 'highshelf', gain: 0, Q: 1 }
  ];

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.inputNode = audioContext.createGain();
    this.outputNode = audioContext.createGain();
    
    this.initializeFilters();
    this.connectFilters();
  }

  private initializeFilters(): void {
    this.bands.forEach((band, index) => {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.Q;
      
      this.filters.push(filter);
    });
  }

  private connectFilters(): void {
    // Connect input to first filter
    this.inputNode.connect(this.filters[0]);
    
    // Chain filters together
    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1]);
    }
    
    // Connect last filter to output
    this.filters[this.filters.length - 1].connect(this.outputNode);
  }

  public setBandGain(bandIndex: number, gain: number): void {
    if (bandIndex >= 0 && bandIndex < this.filters.length) {
      this.filters[bandIndex].gain.value = gain;
      this.bands[bandIndex].gain = gain;
    }
  }

  public getBandGain(bandIndex: number): number {
    if (bandIndex >= 0 && bandIndex < this.bands.length) {
      return this.bands[bandIndex].gain;
    }
    return 0;
  }

  public getBands(): EQBand[] {
    return [...this.bands];
  }

  public getInputNode(): AudioNode {
    return this.inputNode;
  }

  public getOutputNode(): AudioNode {
    return this.outputNode;
  }

  public reset(): void {
    this.bands.forEach((band, index) => {
      this.setBandGain(index, 0);
    });
  }

  public destroy(): void {
    this.filters.forEach(filter => {
      filter.disconnect();
    });
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.filters = [];
  }
}
