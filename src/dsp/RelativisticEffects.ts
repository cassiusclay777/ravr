interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface RelativisticParams {
  velocity: Vector3; // m/s
  acceleration: Vector3; // m/s²
  gravitationalField: number; // m/s² (9.81 for Earth)
  speedOfLight: number; // m/s (299792458)
  speedOfSound: number; // m/s (343 at 20°C)
  observerPosition: Vector3;
  sourcePosition: Vector3;
}

interface DopplerResult {
  frequencyShift: number;
  amplitudeChange: number;
  delayTime: number;
}

export class RelativisticEffects {
  private ctx: AudioContext;
  private input: GainNode;
  private output: GainNode;
  
  // Doppler effect nodes
  private dopplerDelay: DelayNode;
  private dopplerGain: GainNode;
  
  // Time dilation nodes
  private timeDilationGain: GainNode;
  
  // Gravitational effects
  private gravitationalDelay: DelayNode;
  private gravitationalFilter: BiquadFilterNode;
  
  // Analysis nodes
  private analyser: AnalyserNode;
  private frequencyData: Float32Array;
  
  private params: RelativisticParams;
  private isActive = false;
  private animationFrame: number | null = null;
  
  // Physics constants
  private readonly LIGHT_SPEED = 299792458; // m/s
  private readonly SOUND_SPEED = 343; // m/s

  constructor(audioContext: AudioContext) {
    this.ctx = audioContext;
    
    // Initialize default parameters
    this.params = {
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      gravitationalField: 9.81,
      speedOfLight: this.LIGHT_SPEED,
      speedOfSound: this.SOUND_SPEED,
      observerPosition: { x: 0, y: 0, z: 0 },
      sourcePosition: { x: 0, y: 0, z: 10 }
    };
    
    this.createNodes();
    this.connectNodes();
  }

  private createNodes(): void {
    // Core input/output
    this.input = this.ctx.createGain();
    this.output = this.ctx.createGain();
    
    // Doppler effect
    this.dopplerDelay = this.ctx.createDelay(1.0);
    this.dopplerGain = this.ctx.createGain();
    
    // Time dilation
    this.timeDilationGain = this.ctx.createGain();
    
    // Gravitational effects
    this.gravitationalDelay = this.ctx.createDelay(0.1);
    this.gravitationalFilter = this.ctx.createBiquadFilter();
    this.gravitationalFilter.type = 'lowpass';
    this.gravitationalFilter.frequency.value = 20000;
    this.gravitationalFilter.Q.value = 0.7;
    
    // Analysis
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
  }

  private connectNodes(): void {
    // Main signal path
    this.input.connect(this.dopplerDelay);
    this.dopplerDelay.connect(this.dopplerGain);
    this.dopplerGain.connect(this.gravitationalDelay);
    this.gravitationalDelay.connect(this.gravitationalFilter);
    this.gravitationalFilter.connect(this.timeDilationGain);
    this.timeDilationGain.connect(this.output);
    
    // Analysis tap
    this.input.connect(this.analyser);
  }

  setParameters(params: Partial<RelativisticParams>): void {
    this.params = { ...this.params, ...params };
    this.updateEffects();
  }

  private updateEffects(): void {
    if (!this.isActive) return;

    // Calculate relativistic effects
    const dopplerResult = this.calculateDopplerEffect();
    const timeDilation = this.calculateTimeDilation();
    const gravitationalShift = this.calculateGravitationalRedshift();

    // Apply Doppler effect
    this.dopplerDelay.delayTime.setValueAtTime(
      dopplerResult.delayTime,
      this.ctx.currentTime
    );
    this.dopplerGain.gain.setValueAtTime(
      dopplerResult.amplitudeChange,
      this.ctx.currentTime
    );

    // Apply time dilation
    this.timeDilationGain.gain.setValueAtTime(
      timeDilation,
      this.ctx.currentTime
    );

    // Apply gravitational effects
    const gravityDelay = gravitationalShift / this.params.speedOfSound;
    this.gravitationalDelay.delayTime.setValueAtTime(
      Math.min(gravityDelay, 0.1),
      this.ctx.currentTime
    );
    
    const gravityFreqShift = 1 + gravitationalShift / this.params.speedOfSound;
    this.gravitationalFilter.frequency.setValueAtTime(
      Math.min(20000 * gravityFreqShift, 20000),
      this.ctx.currentTime
    );
  }

  private calculateDopplerEffect(): DopplerResult {
    const sourceVel = this.vectorMagnitude(this.params.velocity);
    const distance = this.vectorDistance(this.params.sourcePosition, this.params.observerPosition);
    
    // Relativistic Doppler effect
    const beta = sourceVel / this.params.speedOfLight;
    const gamma = 1 / Math.sqrt(1 - beta * beta);
    
    // Classical Doppler for audio range
    const classicalShift = this.params.speedOfSound / (this.params.speedOfSound - sourceVel);
    
    // Combine classical and relativistic effects
    const frequencyShift = classicalShift * gamma;
    const amplitudeChange = 1 / (distance * distance) * gamma; // Inverse square law + relativistic
    const delayTime = distance / this.params.speedOfSound;

    return {
      frequencyShift: Math.max(0.1, Math.min(10, frequencyShift)),
      amplitudeChange: Math.max(0.01, Math.min(2, amplitudeChange)),
      delayTime: Math.max(0, Math.min(1, delayTime))
    };
  }

  private calculateTimeDilation(): number {
    const velocity = this.vectorMagnitude(this.params.velocity);
    const beta = velocity / this.params.speedOfLight;
    
    // Time dilation factor γ = 1/√(1-v²/c²)
    const gamma = 1 / Math.sqrt(1 - beta * beta);
    
    // For audio, we apply this as a gain modification
    return Math.max(0.1, Math.min(2, 1 / gamma));
  }

  private calculateGravitationalRedshift(): number {
    // Simplified gravitational potential
    const height = this.params.sourcePosition.y - this.params.observerPosition.y;
    const gravitationalPotential = this.params.gravitationalField * height;
    
    // Gravitational redshift Δf/f = gh/c²
    const redshift = gravitationalPotential / (this.params.speedOfLight * this.params.speedOfLight);
    
    return redshift * this.params.speedOfSound;
  }

  private vectorMagnitude(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  private vectorDistance(v1: Vector3, v2: Vector3): number {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    const dz = v1.z - v2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.updateLoop();
  }

  stop(): void {
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private updateLoop(): void {
    if (!this.isActive) return;
    
    this.updateEffects();
    this.animationFrame = requestAnimationFrame(() => this.updateLoop());
  }

  getInputNode(): AudioNode {
    return this.input;
  }

  getOutputNode(): AudioNode {
    return this.output;
  }

  dispose(): void {
    this.stop();
    
    // Disconnect all nodes
    this.input.disconnect();
    this.output.disconnect();
    this.dopplerDelay.disconnect();
    this.dopplerGain.disconnect();
    this.timeDilationGain.disconnect();
    this.gravitationalDelay.disconnect();
    this.gravitationalFilter.disconnect();
    this.analyser.disconnect();
  }
}
