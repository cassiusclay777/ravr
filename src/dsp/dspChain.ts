import { DSPPresetName } from '../useAudioPlayer';

export class DSPChain {
  private audioContext: AudioContext;
  private analyzer: AnalyserNode;
  private gainNode: GainNode;
  private compressor: DynamicsCompressorNode;
  private limiter: WaveShaperNode;
  private input: GainNode;
  private output: GainNode;
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    
    // Create nodes
    this.input = this.audioContext.createGain();
    this.gainNode = this.audioContext.createGain();
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.limiter = this.createLimiter();
    this.analyzer = this.audioContext.createAnalyser();
    this.output = this.audioContext.createGain();
    
    // Configure analyzer
    this.analyzer.fftSize = 256;
    
    // Configure compressor
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    
    // Connect the chain
    this.input.connect(this.gainNode);
    this.gainNode.connect(this.compressor);
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.analyzer);
    this.analyzer.connect(this.output);
    
    // Connect output to destination by default
    this.output.connect(this.audioContext.destination);
  }
  
  private createLimiter(): WaveShaperNode {
    const limiter = this.audioContext.createWaveShaper();
    const curve = new Float32Array(65536);
    
    // Soft clipping curve
    for (let i = 0; i < 65536; i++) {
      const x = (i - 32768) / 32768;
      curve[i] = (Math.PI + Math.atan(x * 5)) / (Math.PI + Math.atan(5));
    }
    
    limiter.curve = curve;
    return limiter;
  }
  
  public getInput(): AudioNode {
    return this.input;
  }
  
  public getOutput(): AudioNode {
    return this.output;
  }
  
  public getAnalyzer(): AnalyserNode {
    return this.analyzer;
  }
  
  public setGain(value: number) {
    this.gainNode.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
  }
  
  public applyPreset(preset: DSPPresetName) {
    switch (preset) {
      case 'flat':
        this.compressor.threshold.value = -24;
        this.compressor.ratio.value = 12;
        this.compressor.knee.value = 30;
        break;
      case 'neutron':
        this.compressor.threshold.value = -18;
        this.compressor.ratio.value = 8;
        this.compressor.knee.value = 40;
        break;
      case 'ambient':
        this.compressor.threshold.value = -30;
        this.compressor.ratio.value = 4;
        this.compressor.knee.value = 20;
        break;
      case 'voice':
        this.compressor.threshold.value = -15;
        this.compressor.ratio.value = 16;
        this.compressor.knee.value = 15;
        break;
    }
  }
  
  public dispose() {
    this.input.disconnect();
    this.gainNode.disconnect();
    this.compressor.disconnect();
    this.limiter.disconnect();
    this.analyzer.disconnect();
    this.output.disconnect();
  }
}
