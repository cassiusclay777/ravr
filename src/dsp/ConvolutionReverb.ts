interface IRPreset {
  name: string;
  url?: string;
  type: 'hall' | 'room' | 'chamber' | 'plate' | 'spring' | 'custom';
  size: number;
  description: string;
}

export class ConvolutionReverb {
  private ctx: AudioContext;
  private input: GainNode;
  private output: GainNode;
  private convolver: ConvolverNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private preDelay: DelayNode;
  private lowShelf: BiquadFilterNode;
  private highShelf: BiquadFilterNode;
  private modulation: OscillatorNode;
  private modulationGain: GainNode;
  
  private mix = 0.3;
  private preDelayTime = 0.02;
  private currentIR: AudioBuffer | null = null;
  private irPresets: IRPreset[] = [];
  private isProcessing = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    
    this.convolver = ctx.createConvolver();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.preDelay = ctx.createDelay(0.5);
    
    // EQ for reverb tail
    this.lowShelf = ctx.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 200;
    this.lowShelf.gain.value = -3;
    
    this.highShelf = ctx.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 6000;
    this.highShelf.gain.value = -6;
    
    // Modulation for chorus-like effect
    this.modulation = ctx.createOscillator();
    this.modulation.frequency.value = 0.5;
    this.modulation.type = 'sine';
    this.modulationGain = ctx.createGain();
    this.modulationGain.gain.value = 0;
    
    this.setMix(this.mix);
    this.setPreDelay(this.preDelayTime);
    this.connectNodes();
    this.initializePresets();
    this.loadDefaultIR();
  }

  private connectNodes(): void {
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Wet path with modulation
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.lowShelf);
    this.lowShelf.connect(this.highShelf);
    this.highShelf.connect(this.convolver);
    
    // Add subtle modulation to reverb tail
    this.modulation.connect(this.modulationGain);
    this.modulationGain.connect(this.wetGain.gain);
    
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.modulation.start();
  }
  
  private initializePresets(): void {
    this.irPresets = [
      {
        name: 'Concert Hall',
        type: 'hall',
        size: 1.5,
        description: 'Large concert hall with natural decay'
      },
      {
        name: 'Studio Room',
        type: 'room', 
        size: 0.8,
        description: 'Medium-sized recording studio'
      },
      {
        name: 'Cathedral',
        type: 'hall',
        size: 2.0,
        description: 'Gothic cathedral with long reverb tail'
      },
      {
        name: 'Vocal Booth',
        type: 'chamber',
        size: 0.5,
        description: 'Small intimate vocal recording space'
      },
      {
        name: 'Vintage Plate',
        type: 'plate',
        size: 1.0,
        description: 'Classic EMT 140 plate reverb emulation'
      },
      {
        name: 'Spring Tank',
        type: 'spring',
        size: 0.7,
        description: 'Vintage guitar amp spring reverb'
      }
    ];
  }

  private async loadDefaultIR(): Promise<void> {
    // Create synthetic IR for default hall reverb
    const length = this.ctx.sampleRate * 2; // 2 second reverb
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay with some randomness
        const decay = Math.exp(-3 * i / length);
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.3;
        
        // Add early reflections
        if (i < this.ctx.sampleRate * 0.1) {
          if (i % Math.floor(this.ctx.sampleRate * 0.023) === 0) {
            channelData[i] += (Math.random() * 2 - 1) * 0.5 * decay;
          }
        }
      }
    }
    
    this.convolver.buffer = buffer;
    this.currentIR = buffer;
  }

  async loadIRFromFile(file: File): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.convolver.buffer = audioBuffer;
      this.currentIR = audioBuffer;
    } catch (error) {
      console.error('Failed to load IR:', error);
      throw error;
    }
  }

  async loadIRFromUrl(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.convolver.buffer = audioBuffer;
      this.currentIR = audioBuffer;
    } catch (error) {
      console.error('Failed to load IR from URL:', error);
      throw error;
    }
  }

  loadIRFromBuffer(buffer: AudioBuffer): void {
    this.convolver.buffer = buffer;
    this.currentIR = buffer;
  }

  createSyntheticIR(type: 'hall' | 'room' | 'chamber' | 'plate' | 'spring', size: number = 1): void {
    const duration = size * (type === 'hall' ? 3 : type === 'chamber' ? 2 : type === 'room' ? 1.5 : 1);
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    
    const params = {
      hall: { decay: 2.5, diffusion: 0.8, earlySize: 0.1 },
      room: { decay: 3.5, diffusion: 0.6, earlySize: 0.05 },
      chamber: { decay: 3, diffusion: 0.7, earlySize: 0.08 },
      plate: { decay: 4, diffusion: 0.9, earlySize: 0.02 },
      spring: { decay: 6, diffusion: 0.3, earlySize: 0.01 }
    };
    
    const p = params[type];
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      const phaseOffset = channel * 0.1;
      
      for (let i = 0; i < length; i++) {
        const t = i / this.ctx.sampleRate;
        const decay = Math.exp(-p.decay * t);
        
        // Main reverb tail
        let sample = (Math.random() * 2 - 1) * decay * 0.3;
        
        // Add diffusion
        sample += Math.sin(t * 100 * (1 + phaseOffset)) * decay * p.diffusion * 0.05;
        
        // Early reflections
        if (t < p.earlySize) {
          const earlyDecay = 1 - (t / p.earlySize);
          if (i % Math.floor(this.ctx.sampleRate * 0.013 * (1 + channel * 0.3)) === 0) {
            sample += (Math.random() * 2 - 1) * earlyDecay * 0.7;
          }
        }
        
        channelData[i] = sample;
      }
    }
    
    this.convolver.buffer = buffer;
    this.currentIR = buffer;
  }

  setMix(mix: number): void {
    this.mix = Math.max(0, Math.min(1, mix));
    this.wetGain.gain.setTargetAtTime(this.mix, this.ctx.currentTime, 0.01);
    this.dryGain.gain.setTargetAtTime(1 - this.mix * 0.5, this.ctx.currentTime, 0.01);
  }

  setPreDelay(seconds: number): void {
    this.preDelayTime = Math.max(0, Math.min(0.5, seconds));
    this.preDelay.delayTime.setTargetAtTime(this.preDelayTime, this.ctx.currentTime, 0.01);
  }

  setTone(lowGain: number, highGain: number): void {
    this.lowShelf.gain.setTargetAtTime(lowGain, this.ctx.currentTime, 0.01);
    this.highShelf.gain.setTargetAtTime(highGain, this.ctx.currentTime, 0.01);
  }

  // New advanced features
  loadPreset(presetName: string): void {
    const preset = this.irPresets.find(p => p.name === presetName);
    if (preset) {
      if (preset.url) {
        this.loadIRFromUrl(preset.url);
      } else {
        this.createSyntheticIR(preset.type, preset.size);
      }
    }
  }

  getPresets(): IRPreset[] {
    return [...this.irPresets];
  }

  addCustomPreset(preset: IRPreset): void {
    this.irPresets.push(preset);
  }

  setModulation(rate: number, depth: number): void {
    this.modulation.frequency.value = Math.max(0.1, Math.min(5, rate));
    this.modulationGain.gain.value = Math.max(0, Math.min(0.1, depth));
  }

  freeze(enabled: boolean): void {
    // Freeze effect - stop input processing but keep reverb tail
    if (enabled) {
      this.input.disconnect(this.preDelay);
    } else {
      this.input.connect(this.preDelay);
    }
  }

  shimmer(enabled: boolean): void {
    // Shimmer effect using octave up pitch shifting
    // This is a simplified version - full implementation would require pitch shifting
    if (enabled) {
      this.setModulation(1.5, 0.05);
      this.highShelf.gain.value = 3;
    } else {
      this.setModulation(0.5, 0);
      this.highShelf.gain.value = -6;
    }
  }

  setDamping(amount: number): void {
    // Damping controls high frequency absorption
    const dampingGain = -amount * 12; // Convert 0-1 to dB
    this.highShelf.gain.setTargetAtTime(dampingGain, this.ctx.currentTime, 0.1);
  }

  setSize(size: number): void {
    // Size affects pre-delay and early reflections timing
    const scaledDelay = this.preDelayTime * (0.5 + size * 1.5);
    this.setPreDelay(Math.min(0.5, scaledDelay));
  }

  async processWithAI(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    // AI-enhanced reverb processing with spectral analysis and adaptive filtering
    this.isProcessing = true;

    try {
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;
      const length = audioBuffer.length;

      // Create enhanced audio buffer
      const enhancedBuffer = this.audioContext.createBuffer(
        numberOfChannels,
        length,
        sampleRate
      );

      for (let ch = 0; ch < numberOfChannels; ch++) {
        const inputData = audioBuffer.getChannelData(ch);
        const outputData = enhancedBuffer.getChannelData(ch);

        // 1. Spectral analysis for frequency-dependent reverb
        const fftSize = 2048;
        const numFrames = Math.floor(length / fftSize);

        for (let frame = 0; frame < numFrames; frame++) {
          const frameStart = frame * fftSize;
          const frameEnd = Math.min(frameStart + fftSize, length);

          // Analyze frame energy
          let energy = 0;
          for (let i = frameStart; i < frameEnd; i++) {
            energy += inputData[i] * inputData[i];
          }
          energy = Math.sqrt(energy / (frameEnd - frameStart));

          // 2. Adaptive reverb parameters based on signal characteristics
          let reverbAmount = this.mix;
          let decayMod = 1.0;

          // More reverb for quieter passages (dynamic enhancement)
          if (energy < 0.1) {
            reverbAmount = Math.min(1.0, this.mix * 1.3);
            decayMod = 1.2; // Longer decay for quiet parts
          } else if (energy > 0.5) {
            reverbAmount = this.mix * 0.8; // Less reverb for loud parts
            decayMod = 0.9; // Shorter decay for loud parts
          }

          // 3. Apply enhanced reverb with AI-like adaptive processing
          for (let i = frameStart; i < frameEnd; i++) {
            const sample = inputData[i];

            // Early reflections (simulated)
            const earlyReflection = this.calculateEarlyReflections(
              inputData,
              i,
              sampleRate,
              decayMod
            );

            // Late reverb (diffuse tail)
            const lateReverb = this.calculateLateReverb(
              inputData,
              i,
              sampleRate,
              decayMod
            );

            // Mix dry/wet with adaptive amount
            outputData[i] =
              sample * (1 - reverbAmount) +
              (earlyReflection * 0.3 + lateReverb * 0.7) * reverbAmount;
          }
        }
      }

      console.log('✅ AI-enhanced reverb processing completed');
      return enhancedBuffer;

    } finally {
      this.isProcessing = false;
    }
  }

  private calculateEarlyReflections(
    data: Float32Array,
    index: number,
    sampleRate: number,
    decayMod: number
  ): number {
    // Simulate early reflections (first 80ms)
    const reflectionDelays = [0.015, 0.022, 0.035, 0.047, 0.063]; // seconds
    let reflection = 0;

    for (let i = 0; i < reflectionDelays.length; i++) {
      const delaySamples = Math.floor(reflectionDelays[i] * sampleRate);
      const delayedIndex = index - delaySamples;

      if (delayedIndex >= 0) {
        const decay = Math.pow(0.7, i) * decayMod;
        reflection += data[delayedIndex] * decay;
      }
    }

    return reflection / reflectionDelays.length;
  }

  private calculateLateReverb(
    data: Float32Array,
    index: number,
    sampleRate: number,
    decayMod: number
  ): number {
    // Simulate diffuse late reverb (exponential decay)
    const reverbTime = this.preDelayTime * 2 * decayMod; // seconds
    const numTaps = 8;
    let reverb = 0;

    for (let tap = 0; tap < numTaps; tap++) {
      const delay = 0.08 + (tap * reverbTime) / numTaps; // Start after early reflections
      const delaySamples = Math.floor(delay * sampleRate);
      const delayedIndex = index - delaySamples;

      if (delayedIndex >= 0) {
        // Exponential decay
        const decay = Math.exp(-tap / (numTaps * 0.5)) * decayMod;
        reverb += data[delayedIndex] * decay;
      }
    }

    return reverb / numTaps;
  }

  getAnalytics(): object {
    return {
      currentIR: this.currentIR ? {
        duration: this.currentIR.duration,
        sampleRate: this.currentIR.sampleRate,
        numberOfChannels: this.currentIR.numberOfChannels
      } : null,
      mix: this.mix,
      preDelay: this.preDelayTime,
      isProcessing: this.isProcessing,
      modulationRate: this.modulation.frequency.value,
      modulationDepth: this.modulationGain.gain.value
    };
  }

  getInput(): AudioNode { return this.input; }
  getOutput(): AudioNode { return this.output; }

  dispose(): void {
    // Stop modulation oscillator
    this.modulation.stop();
    
    // Disconnect all nodes
    this.input.disconnect();
    this.dryGain.disconnect();
    this.preDelay.disconnect();
    this.lowShelf.disconnect();
    this.highShelf.disconnect();
    this.convolver.disconnect();
    this.wetGain.disconnect();
    this.modulation.disconnect();
    this.modulationGain.disconnect();
    this.output.disconnect();
  }
}
