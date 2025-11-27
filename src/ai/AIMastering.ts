import { InferenceSession, Tensor } from 'onnxruntime-web';

export type Genre = 'pop' | 'rock' | 'classical' | 'jazz' | 'electronic' | 'hiphop' | 'metal';

// Genre-specific EQ presets (frequency adjustments)
const GENRE_PRESETS: Record<Genre, { lowGain: number; midGain: number; highGain: number; compression: number }> = {
  pop: { lowGain: 0.1, midGain: 0.15, highGain: 0.2, compression: 0.3 },
  rock: { lowGain: 0.2, midGain: 0.1, highGain: 0.15, compression: 0.4 },
  classical: { lowGain: 0.05, midGain: 0.0, highGain: 0.1, compression: 0.1 },
  jazz: { lowGain: 0.1, midGain: 0.05, highGain: 0.15, compression: 0.2 },
  electronic: { lowGain: 0.25, midGain: 0.1, highGain: 0.3, compression: 0.5 },
  hiphop: { lowGain: 0.3, midGain: 0.05, highGain: 0.2, compression: 0.45 },
  metal: { lowGain: 0.25, midGain: 0.15, highGain: 0.2, compression: 0.5 }
};

class AIMastering {
  private session: InferenceSession | null = null;
  private currentGenre: Genre = 'pop';
  private intensity: number = 0.7;
  private isInitialized: boolean = false;
  private useONNX: boolean = false;

  async initialize(genre: Genre = 'pop'): Promise<void> {
    this.currentGenre = genre;
    
    // Try to load ONNX model, fall back to DSP if unavailable
    try {
      this.session = await InferenceSession.create('/models/auto_mastering.onnx', {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      this.useONNX = true;
      this.isInitialized = true;
      console.log('AI Mastering: ONNX model loaded successfully');
    } catch (error) {
      console.warn('AI Mastering: ONNX model unavailable, using DSP fallback');
      this.useONNX = false;
      this.isInitialized = true;
    }
  }

  setIntensity(value: number): void {
    this.intensity = Math.min(1, Math.max(0, value));
  }

  async changeGenre(genre: Genre): Promise<void> {
    this.currentGenre = genre;
    console.log(`AI Mastering: Genre changed to ${genre}`);
  }

  async process(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    if (!this.isInitialized) {
      throw new Error('AI Mastering not initialized');
    }

    console.log(`Processing with ${this.currentGenre} preset, intensity: ${this.intensity}`);

    // Try ONNX first, fall back to DSP
    let processedBuffer: AudioBuffer;
    
    if (this.useONNX && this.session) {
      try {
        processedBuffer = await this.processWithONNX(audioBuffer);
      } catch (error) {
        console.warn('ONNX processing failed, using DSP fallback:', error);
        processedBuffer = this.processWithDSP(audioBuffer);
      }
    } else {
      processedBuffer = this.processWithDSP(audioBuffer);
    }

    // Apply intensity (dry/wet mix)
    if (this.intensity < 1.0) {
      return this.mixBuffers(audioBuffer, processedBuffer, this.intensity);
    }

    return processedBuffer;
  }

  private async processWithONNX(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    if (!this.session) throw new Error('ONNX session not loaded');

    const inputData = audioBuffer.getChannelData(0);
    const inputTensor = new Tensor('float32', inputData, [1, 1, inputData.length]);
    
    const results = await this.session.run({ input: inputTensor });
    const outputData = results.output.data as Float32Array;

    const context = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const outputBuffer = context.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
      outputBuffer.copyToChannel(new Float32Array(outputData), ch);
    }

    return outputBuffer;
  }

  private processWithDSP(audioBuffer: AudioBuffer): AudioBuffer {
    const preset = GENRE_PRESETS[this.currentGenre];
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Create output buffer
    const context = new OfflineAudioContext(numChannels, length, sampleRate);
    const outputBuffer = context.createBuffer(numChannels, length, sampleRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const input = audioBuffer.getChannelData(ch);
      const output = outputBuffer.getChannelData(ch);

      // Copy input to output first
      output.set(input);

      // Apply 3-band EQ
      this.applyEQ(output, sampleRate, preset);

      // Apply soft-knee compression
      this.applyCompression(output, preset.compression);

      // Apply brick-wall limiter
      this.applyLimiter(output, 0.95);

      // Normalize to -14 LUFS (approximate)
      this.normalizeRMS(output, 0.25);
    }

    return outputBuffer;
  }

  private applyEQ(samples: Float32Array, sampleRate: number, preset: { lowGain: number; midGain: number; highGain: number }): void {
    // Simple 3-band shelf EQ using biquad-style filtering
    const lowFreq = 200;
    const highFreq = 4000;
    
    // State variables for filters
    let lowState = 0;
    let highState = 0;
    
    const lowCoef = Math.exp(-2 * Math.PI * lowFreq / sampleRate);
    const highCoef = Math.exp(-2 * Math.PI * highFreq / sampleRate);

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      
      // Low shelf
      lowState = lowState * lowCoef + sample * (1 - lowCoef);
      const low = lowState;
      
      // High shelf  
      highState = highState * highCoef + sample * (1 - highCoef);
      const high = sample - highState;
      
      // Mid is what's left
      const mid = sample - low - high;
      
      // Apply gains
      samples[i] = low * (1 + preset.lowGain) + mid * (1 + preset.midGain) + high * (1 + preset.highGain);
    }
  }

  private applyCompression(samples: Float32Array, amount: number): void {
    const threshold = 0.5;
    const ratio = 4;
    const attack = 0.003; // 3ms
    const release = 0.1;  // 100ms
    
    let envelope = 0;
    const attackCoef = Math.exp(-1 / (44100 * attack));
    const releaseCoef = Math.exp(-1 / (44100 * release));

    for (let i = 0; i < samples.length; i++) {
      const input = Math.abs(samples[i]);
      
      // Envelope follower
      if (input > envelope) {
        envelope = attackCoef * envelope + (1 - attackCoef) * input;
      } else {
        envelope = releaseCoef * envelope + (1 - releaseCoef) * input;
      }

      // Gain reduction
      if (envelope > threshold) {
        const overThreshold = envelope - threshold;
        const compressed = threshold + overThreshold / ratio;
        const gain = compressed / envelope;
        samples[i] *= 1 - amount + amount * gain;
      }
    }
  }

  private applyLimiter(samples: Float32Array, ceiling: number): void {
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] > ceiling) samples[i] = ceiling;
      if (samples[i] < -ceiling) samples[i] = -ceiling;
    }
  }

  private normalizeRMS(samples: Float32Array, targetRMS: number): void {
    // Calculate current RMS
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }
    const currentRMS = Math.sqrt(sumSquares / samples.length);

    if (currentRMS > 0.001) {
      const gain = targetRMS / currentRMS;
      // Limit gain to prevent over-amplification
      const safeGain = Math.min(gain, 4);
      for (let i = 0; i < samples.length; i++) {
        samples[i] *= safeGain;
      }
    }
  }

  private mixBuffers(dry: AudioBuffer, wet: AudioBuffer, wetAmount: number): AudioBuffer {
    const context = new OfflineAudioContext(
      dry.numberOfChannels,
      dry.length,
      dry.sampleRate
    );
    
    const output = context.createBuffer(
      dry.numberOfChannels,
      dry.length,
      dry.sampleRate
    );

    for (let ch = 0; ch < output.numberOfChannels; ch++) {
      const dryData = dry.getChannelData(ch);
      const wetData = wet.getChannelData(ch);
      const outData = output.getChannelData(ch);

      for (let i = 0; i < output.length; i++) {
        outData[i] = (1 - wetAmount) * dryData[i] + wetAmount * wetData[i];
      }
    }

    return output;
  }

  dispose(): void {
    if (this.session) {
      this.session.release();
      this.session = null;
    }
    this.isInitialized = false;
  }
}

export default AIMastering;
