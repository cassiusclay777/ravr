interface FFTOptions {
  fftSize: number;
  hopSize: number;
  windowType: 'hann' | 'hamming' | 'blackman' | 'rectangular';
  overlapRatio: number;
}

interface SpectralData {
  magnitude: Float32Array;
  phase: Float32Array;
  frequencies: Float32Array;
}

type ProcessingCallback = (spectralData: SpectralData, frameIndex: number) => SpectralData;

export class FFTProcessor {
  private readonly ctx: AudioContext;
  private readonly input: GainNode;
  private readonly output: GainNode;
  private scriptProcessor: ScriptProcessorNode;
  
  private fftSize: number;
  private hopSize: number;
  private overlapRatio: number;
  private windowFunction!: Float32Array;
  private synthesisWindow!: Float32Array;
  
  // Buffers for overlap-add processing
  private inputBuffer!: Float32Array;
  private outputBuffer!: Float32Array;
  private overlapBuffer!: Float32Array;
  private inputWriteIndex = 0;
  private outputReadIndex = 0;
  
  // FFT working arrays
  private realBuffer!: Float32Array;
  private imagBuffer!: Float32Array;
  private magnitudeBuffer!: Float32Array;
  private phaseBuffer!: Float32Array;
  private frequencyBuffer!: Float32Array;
  
  // Processing callback
  private processCallback: ProcessingCallback | null = null;
  private isProcessing = false;
  private frameCounter = 0;

  constructor(ctx: AudioContext, options: Partial<FFTOptions> = {}) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    
    // Set default options
    this.fftSize = options.fftSize || 2048;
    this.overlapRatio = options.overlapRatio || 0.75;
    this.hopSize = options.hopSize || Math.floor(this.fftSize * (1 - this.overlapRatio));
    
    // Create script processor with appropriate buffer size
    const bufferSize = Math.max(256, Math.min(16384, this.hopSize));
    this.scriptProcessor = ctx.createScriptProcessor(bufferSize, 1, 1);
    
    this.initializeBuffers();
    this.createWindowFunction(options.windowType || 'hann');
    this.setupProcessing();
    this.connectNodes();
  }

  private initializeBuffers(): void {
    // Input buffer holds incoming audio for processing
    this.inputBuffer = new Float32Array(this.fftSize * 4);
    
    // Output buffer holds processed audio for playback
    this.outputBuffer = new Float32Array(this.fftSize * 4);
    
    // Overlap buffer for overlap-add synthesis
    this.overlapBuffer = new Float32Array(this.fftSize);
    
    // FFT working arrays
    this.realBuffer = new Float32Array(this.fftSize);
    this.imagBuffer = new Float32Array(this.fftSize);
    this.magnitudeBuffer = new Float32Array(this.fftSize / 2 + 1);
    this.phaseBuffer = new Float32Array(this.fftSize / 2 + 1);
    this.frequencyBuffer = new Float32Array(this.fftSize / 2 + 1);
    
    // Initialize frequency array
    for (let i = 0; i < this.frequencyBuffer.length; i++) {
      this.frequencyBuffer[i] = (i * this.ctx.sampleRate) / this.fftSize;
    }
  }

  private createWindowFunction(type: 'hann' | 'hamming' | 'blackman' | 'rectangular'): void {
    this.windowFunction = new Float32Array(this.fftSize);
    this.synthesisWindow = new Float32Array(this.fftSize);
    
    for (let i = 0; i < this.fftSize; i++) {
      const n = i / (this.fftSize - 1);
      
      switch (type) {
        case 'hann':
          this.windowFunction[i] = 0.5 * (1 - Math.cos(2 * Math.PI * n));
          break;
        case 'hamming':
          this.windowFunction[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * n);
          break;
        case 'blackman':
          this.windowFunction[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * n) + 0.08 * Math.cos(4 * Math.PI * n);
          break;
        case 'rectangular':
        default:
          this.windowFunction[i] = 1.0;
          break;
      }
    }
    
    // Create synthesis window for perfect reconstruction
    this.createSynthesisWindow();
  }

  private createSynthesisWindow(): void {
    // For perfect reconstruction in overlap-add, we need to ensure
    // that overlapping windows sum to unity
    this.synthesisWindow.set(this.windowFunction);
    
    // Apply window normalization for overlap-add
    const normalizationFactor = this.calculateOverlapNormalization();
    for (let i = 0; i < this.fftSize; i++) {
      this.synthesisWindow[i] /= normalizationFactor;
    }
  }

  private calculateOverlapNormalization(): number {
    // Calculate the sum of overlapping windows to normalize for unity gain
    let sum = 0;
    const numOverlaps = Math.ceil(this.fftSize / this.hopSize);
    
    for (let i = 0; i < this.fftSize; i++) {
      let windowSum = 0;
      for (let j = 0; j < numOverlaps; j++) {
        const index = i - j * this.hopSize;
        if (index >= 0 && index < this.fftSize) {
          windowSum += this.windowFunction[index] * this.windowFunction[index];
        }
      }
      sum += windowSum;
    }
    
    return sum / this.fftSize;
  }

  private setupProcessing(): void {
    this.scriptProcessor.onaudioprocess = (event) => {
      if (!this.isProcessing) return;
      
      const inputData = event.inputBuffer.getChannelData(0);
      const outputData = event.outputBuffer.getChannelData(0);
      
      this.processAudioBlock(inputData, outputData);
    };
  }

  private processAudioBlock(inputData: Float32Array, outputData: Float32Array): void {
    const blockSize = inputData.length;
    
    // Write input data to circular buffer
    for (let i = 0; i < blockSize; i++) {
      this.inputBuffer[this.inputWriteIndex] = inputData[i];
      this.inputWriteIndex = (this.inputWriteIndex + 1) % this.inputBuffer.length;
    }
    
    // Process overlapping frames
    while (this.canProcessFrame()) {
      this.processFrame();
    }
    
    // Read output data from circular buffer
    for (let i = 0; i < blockSize; i++) {
      outputData[i] = this.outputBuffer[this.outputReadIndex];
      this.outputBuffer[this.outputReadIndex] = 0; // Clear after reading
      this.outputReadIndex = (this.outputReadIndex + 1) % this.outputBuffer.length;
    }
  }

  private canProcessFrame(): boolean {
    // Check if we have enough input data for processing
    const availableData = (this.inputWriteIndex - this.outputReadIndex + this.inputBuffer.length) % this.inputBuffer.length;
    return availableData >= this.fftSize;
  }

  private processFrame(): void {
    // Extract frame from input buffer
    this.extractFrame();
    
    // Apply analysis window
    this.applyAnalysisWindow();
    
    // Forward FFT
    this.forwardFFT();
    
    // Convert to magnitude/phase representation
    this.cartesianToPolar();
    
    // Apply spectral processing if callback is set
    if (this.processCallback) {
      const spectralData: SpectralData = {
        magnitude: this.magnitudeBuffer,
        phase: this.phaseBuffer,
        frequencies: this.frequencyBuffer
      };
      
      const processedData = this.processCallback(spectralData, this.frameCounter);
      this.magnitudeBuffer.set(processedData.magnitude);
      this.phaseBuffer.set(processedData.phase);
    }
    
    // Convert back to cartesian
    this.polarToCartesian();
    
    // Inverse FFT
    this.inverseFFT();
    
    // Apply synthesis window
    this.applySynthesisWindow();
    
    // Overlap-add to output buffer
    this.overlapAdd();
    
    this.frameCounter++;
  }

  private extractFrame(): void {
    // Extract a frame from the circular input buffer
    for (let i = 0; i < this.fftSize; i++) {
      const index = (this.outputReadIndex + i) % this.inputBuffer.length;
      this.realBuffer[i] = this.inputBuffer[index];
      this.imagBuffer[i] = 0;
    }
  }

  private applyAnalysisWindow(): void {
    for (let i = 0; i < this.fftSize; i++) {
      this.realBuffer[i] *= this.windowFunction[i];
    }
  }

  private applySynthesisWindow(): void {
    for (let i = 0; i < this.fftSize; i++) {
      this.realBuffer[i] *= this.synthesisWindow[i];
    }
  }

  private forwardFFT(): void {
    // Simplified FFT implementation (Cooley-Tukey algorithm)
    // In production, use a high-performance FFT library like FFTW.js
    this.fft(this.realBuffer, this.imagBuffer, false);
  }

  private inverseFFT(): void {
    // Inverse FFT
    this.fft(this.realBuffer, this.imagBuffer, true);
    
    // Normalize by FFT size
    const scale = 1 / this.fftSize;
    for (let i = 0; i < this.fftSize; i++) {
      this.realBuffer[i] *= scale;
    }
  }

  private fft(real: Float32Array, imag: Float32Array, inverse: boolean): void {
    const n = real.length;
    
    // Bit-reversal permutation
    for (let i = 0; i < n; i++) {
      const j = this.reverseBits(i, Math.log2(n));
      if (j > i) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }
    
    // Cooley-Tukey FFT
    for (let size = 2; size <= n; size *= 2) {
      const halfSize = size / 2;
      const step = 2 * Math.PI / size;
      
      for (let i = 0; i < n; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const angle = (inverse ? step : -step) * j;
          const wr = Math.cos(angle);
          const wi = Math.sin(angle);
          
          const u = real[i + j];
          const v = imag[i + j];
          const s = real[i + j + halfSize];
          const t = imag[i + j + halfSize];
          
          const rs = s * wr - t * wi;
          const it = s * wi + t * wr;
          
          real[i + j] = u + rs;
          imag[i + j] = v + it;
          real[i + j + halfSize] = u - rs;
          imag[i + j + halfSize] = v - it;
        }
      }
    }
  }

  private reverseBits(num: number, bits: number): number {
    let result = 0;
    for (let i = 0; i < bits; i++) {
      result = (result << 1) | (num & 1);
      num >>= 1;
    }
    return result;
  }

  private cartesianToPolar(): void {
    const binCount = this.fftSize / 2 + 1;
    
    for (let i = 0; i < binCount; i++) {
      const real = this.realBuffer[i];
      const imag = this.imagBuffer[i];
      
      this.magnitudeBuffer[i] = Math.sqrt(real * real + imag * imag);
      this.phaseBuffer[i] = Math.atan2(imag, real);
    }
  }

  private polarToCartesian(): void {
    const binCount = this.fftSize / 2 + 1;
    
    for (let i = 0; i < binCount; i++) {
      const magnitude = this.magnitudeBuffer[i];
      const phase = this.phaseBuffer[i];
      
      this.realBuffer[i] = magnitude * Math.cos(phase);
      this.imagBuffer[i] = magnitude * Math.sin(phase);
    }
    
    // Mirror for negative frequencies (real FFT symmetry)
    for (let i = 1; i < this.fftSize / 2; i++) {
      this.realBuffer[this.fftSize - i] = this.realBuffer[i];
      this.imagBuffer[this.fftSize - i] = -this.imagBuffer[i];
    }
  }

  private overlapAdd(): void {
    // Add current frame to overlap buffer
    for (let i = 0; i < this.fftSize; i++) {
      this.overlapBuffer[i] += this.realBuffer[i];
    }
    
    // Copy hop size samples to output buffer
    for (let i = 0; i < this.hopSize; i++) {
      const outputIndex = (this.outputReadIndex + this.fftSize + i) % this.outputBuffer.length;
      this.outputBuffer[outputIndex] += this.overlapBuffer[i];
    }
    
    // Shift overlap buffer
    for (let i = 0; i < this.fftSize - this.hopSize; i++) {
      this.overlapBuffer[i] = this.overlapBuffer[i + this.hopSize];
    }
    
    // Clear the end of overlap buffer
    for (let i = this.fftSize - this.hopSize; i < this.fftSize; i++) {
      this.overlapBuffer[i] = 0;
    }
  }

  // Public API methods
  setProcessingCallback(callback: ProcessingCallback | null): void {
    this.processCallback = callback;
  }

  start(): void {
    this.isProcessing = true;
  }

  stop(): void {
    this.isProcessing = false;
  }

  reset(): void {
    this.inputBuffer.fill(0);
    this.outputBuffer.fill(0);
    this.overlapBuffer.fill(0);
    this.inputWriteIndex = 0;
    this.outputReadIndex = 0;
    this.frameCounter = 0;
  }

  // Utility methods for common spectral processing
  static spectralGate(spectralData: SpectralData, threshold: number): SpectralData {
    const result = {
      magnitude: new Float32Array(spectralData.magnitude.length),
      phase: new Float32Array(spectralData.phase.length),
      frequencies: spectralData.frequencies
    };
    
    for (let i = 0; i < spectralData.magnitude.length; i++) {
      if (spectralData.magnitude[i] > threshold) {
        result.magnitude[i] = spectralData.magnitude[i];
        result.phase[i] = spectralData.phase[i];
      } else {
        result.magnitude[i] = 0;
        result.phase[i] = 0;
      }
    }
    
    return result;
  }

  static spectralFilter(spectralData: SpectralData, filterFunction: (frequency: number, magnitude: number) => number): SpectralData {
    const result = {
      magnitude: new Float32Array(spectralData.magnitude.length),
      phase: new Float32Array(spectralData.phase.length),
      frequencies: spectralData.frequencies
    };
    
    for (let i = 0; i < spectralData.magnitude.length; i++) {
      const gain = filterFunction(spectralData.frequencies[i], spectralData.magnitude[i]);
      result.magnitude[i] = spectralData.magnitude[i] * gain;
      result.phase[i] = spectralData.phase[i];
    }
    
    return result;
  }

  static pitchShift(spectralData: SpectralData, shiftFactor: number): SpectralData {
    const result = {
      magnitude: new Float32Array(spectralData.magnitude.length),
      phase: new Float32Array(spectralData.phase.length),
      frequencies: spectralData.frequencies
    };
    
    for (let i = 0; i < spectralData.magnitude.length; i++) {
      const sourceIndex = Math.round(i / shiftFactor);
      if (sourceIndex >= 0 && sourceIndex < spectralData.magnitude.length) {
        result.magnitude[i] = spectralData.magnitude[sourceIndex];
        result.phase[i] = spectralData.phase[sourceIndex] * shiftFactor;
      }
    }
    
    return result;
  }

  // Node access
  private connectNodes(): void {
    this.input.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.output);
  }

  getInput(): AudioNode { return this.input; }
  getOutput(): AudioNode { return this.output; }

  // Analytics
  getAnalytics(): object {
    return {
      fftSize: this.fftSize,
      hopSize: this.hopSize,
      overlapRatio: this.overlapRatio,
      frameCounter: this.frameCounter,
      isProcessing: this.isProcessing,
      latency: this.fftSize / this.ctx.sampleRate * 1000 // ms
    };
  }

  dispose(): void {
    this.stop();
    this.input.disconnect();
    this.scriptProcessor.disconnect();
    this.output.disconnect();
  }
}
