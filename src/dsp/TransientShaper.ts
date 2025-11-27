export class TransientShaper {
  private ctx: AudioContext;
  private input: GainNode;
  private output: GainNode;
  
  private envelope: GainNode;
  private attackGain: GainNode;
  private sustainGain: GainNode;
  private detector: AnalyserNode;
  
  private attack = 0; // -1 to 1
  private sustain = 0; // -1 to 1
  private previousLevel = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    
    this.envelope = ctx.createGain();
    this.attackGain = ctx.createGain();
    this.sustainGain = ctx.createGain();
    this.detector = ctx.createAnalyser();
    this.detector.fftSize = 256;
    
    this.connectNodes();
    this.startProcessing();
  }

  private connectNodes(): void {
    this.input.connect(this.detector);
    this.input.connect(this.attackGain);
    this.input.connect(this.sustainGain);
    
    this.attackGain.connect(this.output);
    this.sustainGain.connect(this.output);
  }

  private startProcessing(): void {
    const buffer = new Float32Array(this.detector.fftSize);
    
    const process = () => {
      this.detector.getFloatTimeDomainData(buffer);
      
      let rms = 0;
      for (let i = 0; i < buffer.length; i++) {
        rms += buffer[i] * buffer[i];
      }
      rms = Math.sqrt(rms / buffer.length);
      
      const currentLevel = rms;
      const delta = currentLevel - this.previousLevel;
      
      // Detect transients (positive delta = attack)
      const isTransient = delta > 0.001;
      
      if (isTransient) {
        // Boost or cut attack
        const attackMult = 1 + this.attack * 2;
        this.attackGain.gain.setTargetAtTime(attackMult, this.ctx.currentTime, 0.0001);
        this.sustainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.0001);
      } else {
        // Apply sustain shaping
        const sustainMult = 1 + this.sustain;
        this.attackGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
        this.sustainGain.gain.setTargetAtTime(sustainMult, this.ctx.currentTime, 0.01);
      }
      
      this.previousLevel = currentLevel * 0.9 + this.previousLevel * 0.1;
      
      requestAnimationFrame(process);
    };
    
    process();
  }

  setAttack(value: number): void {
    this.attack = Math.max(-1, Math.min(1, value));
  }

  setSustain(value: number): void {
    this.sustain = Math.max(-1, Math.min(1, value));
  }

  getInput(): AudioNode { return this.input; }
  getOutput(): AudioNode { return this.output; }

  dispose(): void {
    this.input.disconnect();
    this.detector.disconnect();
    this.attackGain.disconnect();
    this.sustainGain.disconnect();
    this.output.disconnect();
  }
}
