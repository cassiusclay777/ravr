export class PsychoacousticProcessor {
  private audioContext: AudioContext;
  private hrtfConvolver: ConvolverNode;
  private spatializer: PannerNode;
  private roomSimulator: ConvolverNode;

  constructor(context: AudioContext) {
    this.audioContext = context;
    this.hrtfConvolver = context.createConvolver();
    this.spatializer = context.createPanner();
    this.roomSimulator = context.createConvolver();
    
    this.initializeHRTF();
    this.setupSpatializer();
    this.setupRoomSimulation();
  }

  private async initializeHRTF(): Promise<void> {
    // Generate basic HRTF impulse response
    const impulseLength = this.audioContext.sampleRate * 0.1; // 100ms
    const impulse = this.audioContext.createBuffer(2, impulseLength, this.audioContext.sampleRate);
    
    const leftChannel = impulse.getChannelData(0);
    const rightChannel = impulse.getChannelData(1);
    
    // Simple HRTF simulation
    for (let i = 0; i < impulseLength; i++) {
      const t = i / this.audioContext.sampleRate;
      const decay = Math.exp(-t * 10);
      
      // Left ear delay and filtering
      leftChannel[i] = decay * Math.sin(2 * Math.PI * 1000 * t) * 0.5;
      // Right ear with slight delay and different filtering
      rightChannel[i] = decay * Math.sin(2 * Math.PI * 1200 * (t - 0.0006)) * 0.5;
    }
    
    this.hrtfConvolver.buffer = impulse;
  }

  private setupSpatializer(): void {
    this.spatializer.panningModel = 'HRTF';
    this.spatializer.distanceModel = 'inverse';
    this.spatializer.refDistance = 1;
    this.spatializer.maxDistance = 10000;
    this.spatializer.rolloffFactor = 1;
    this.spatializer.coneInnerAngle = 360;
    this.spatializer.coneOuterAngle = 0;
    this.spatializer.coneOuterGain = 0;
  }

  private async setupRoomSimulation(): Promise<void> {
    // Generate room impulse response
    const roomLength = this.audioContext.sampleRate * 2; // 2 second reverb
    const roomImpulse = this.audioContext.createBuffer(2, roomLength, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = roomImpulse.getChannelData(channel);
      
      for (let i = 0; i < roomLength; i++) {
        const t = i / this.audioContext.sampleRate;
        const decay = Math.exp(-t * 2);
        const noise = (Math.random() * 2 - 1) * decay * 0.3;
        
        // Add early reflections
        if (t < 0.05) {
          channelData[i] = noise * 2;
        } else {
          channelData[i] = noise;
        }
      }
    }
    
    this.roomSimulator.buffer = roomImpulse;
  }

  create3DAudioChain(): AudioNode {
    const input = this.audioContext.createGain();
    const output = this.audioContext.createGain();
    const wetGain = this.audioContext.createGain();
    const dryGain = this.audioContext.createGain();
    
    wetGain.gain.value = 0.3;
    dryGain.gain.value = 0.7;
    
    // Dry path
    input.connect(dryGain);
    dryGain.connect(output);
    
    // Wet path with 3D processing
    input.connect(this.spatializer);
    this.spatializer.connect(this.hrtfConvolver);
    this.hrtfConvolver.connect(this.roomSimulator);
    this.roomSimulator.connect(wetGain);
    wetGain.connect(output);
    
    return { input, output } as any;
  }

  setListenerPosition(x: number, y: number, z: number): void {
    if (this.audioContext.listener.positionX) {
      this.audioContext.listener.positionX.value = x;
      this.audioContext.listener.positionY.value = y;
      this.audioContext.listener.positionZ.value = z;
    }
  }

  setSourcePosition(x: number, y: number, z: number): void {
    if (this.spatializer.positionX) {
      this.spatializer.positionX.value = x;
      this.spatializer.positionY.value = y;
      this.spatializer.positionZ.value = z;
    }
  }

  setBinauralMode(enabled: boolean): void {
    if (enabled) {
      this.spatializer.panningModel = 'HRTF';
    } else {
      this.spatializer.panningModel = 'equalpower';
    }
  }

  setRoomSize(size: 'small' | 'medium' | 'large' | 'hall'): void {
    const roomConfigs = {
      small: { decay: 0.5, wetness: 0.1 },
      medium: { decay: 1.0, wetness: 0.2 },
      large: { decay: 2.0, wetness: 0.3 },
      hall: { decay: 4.0, wetness: 0.4 }
    };
    
    const config = roomConfigs[size];
    // Regenerate impulse with new parameters
    this.setupRoomSimulation();
  }
}
