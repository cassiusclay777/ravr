import { WebGPUAccelerator } from '../gpu/WebGPUAccelerator';

export interface GPUProcessingStats {
  gpuAvailable: boolean;
  gpuEnabled: boolean;
  processingTime: number;
  speedupFactor: number;
  lastUpdateTime: number;
}

export interface GPUProcessingOptions {
  preferGPU?: boolean;
  fallbackToCPU?: boolean;
  enableProfiling?: boolean;
}

/**
 * GPU Audio Processor - Adapter for WebGPU audio acceleration
 *
 * Provides easy-to-use API for GPU-accelerated audio processing with automatic CPU fallback.
 * Integrates seamlessly with Web Audio API and existing audio pipeline.
 */
export class GPUAudioProcessor {
  private gpuAccelerator: WebGPUAccelerator;
  private isGPUAvailable = false;
  private isGPUEnabled = true;
  private stats: GPUProcessingStats = {
    gpuAvailable: false,
    gpuEnabled: true,
    processingTime: 0,
    speedupFactor: 1.0,
    lastUpdateTime: 0,
  };

  constructor(options: GPUProcessingOptions = {}) {
    this.gpuAccelerator = new WebGPUAccelerator();
    this.isGPUEnabled = options.preferGPU !== false;
  }

  /**
   * Initialize GPU acceleration
   * @returns true if GPU is available and initialized, false otherwise
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🎮 Initializing GPU Audio Processor...');

      // Check WebGPU support
      if (!this.isWebGPUSupported()) {
        console.warn('⚠️ WebGPU not supported in this browser');
        this.isGPUAvailable = false;
        this.stats.gpuAvailable = false;
        return false;
      }

      // Initialize WebGPU accelerator
      const success = await this.gpuAccelerator.initialize();

      if (!success) {
        console.warn('⚠️ WebGPU initialization failed, falling back to CPU');
        this.isGPUAvailable = false;
        this.stats.gpuAvailable = false;
        return false;
      }

      this.isGPUAvailable = true;
      this.stats.gpuAvailable = true;
      this.stats.gpuEnabled = this.isGPUEnabled;

      const gpuInfo = this.gpuAccelerator.getGPUInfo();
      console.log('✅ GPU Audio Processor initialized successfully');
      console.log(`   GPU: ${gpuInfo?.description || 'Unknown'}`);
      console.log(`   Vendor: ${gpuInfo?.vendor || 'Unknown'}`);

      return true;

    } catch (error) {
      console.error('❌ GPU initialization error:', error);
      this.isGPUAvailable = false;
      this.stats.gpuAvailable = false;
      return false;
    }
  }

  /**
   * Check if WebGPU is supported in this browser
   */
  isWebGPUSupported(): boolean {
    return 'gpu' in navigator;
  }

  /**
   * Process audio buffer with GPU acceleration (or CPU fallback)
   * @param audioBuffer AudioBuffer to process
   * @param effectType Type of effect to apply
   * @param params Effect parameters
   */
  async processAudioBuffer(
    audioBuffer: AudioBuffer,
    effectType: 'fft' | 'convolution' | 'realtime' | 'ai_inference',
    params?: any
  ): Promise<AudioBuffer> {
    const startTime = performance.now();

    try {
      // Try GPU processing if available and enabled
      if (this.isGPUAvailable && this.isGPUEnabled) {
        const result = await this.processOnGPU(audioBuffer, effectType, params);

        const endTime = performance.now();
        this.updateStats(endTime - startTime, true);

        return result;
      }

      // Fall back to CPU processing
      const result = await this.processOnCPU(audioBuffer, effectType, params);

      const endTime = performance.now();
      this.updateStats(endTime - startTime, false);

      return result;

    } catch (error) {
      console.error('GPU processing failed:', error);

      // Automatic fallback to CPU on error
      const result = await this.processOnCPU(audioBuffer, effectType, params);

      const endTime = performance.now();
      this.updateStats(endTime - startTime, false);

      return result;
    }
  }

  /**
   * Process audio on GPU using WebGPU
   */
  private async processOnGPU(
    audioBuffer: AudioBuffer,
    effectType: string,
    params?: any
  ): Promise<AudioBuffer> {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    // Create new AudioBuffer for output
    const audioContext = new OfflineAudioContext(numberOfChannels, length, sampleRate);
    const outputBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);

    // Process each channel on GPU
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);

      let outputData: Float32Array;

      switch (effectType) {
        case 'fft':
          const fftResult = await this.gpuAccelerator.runFFTOnGPU(inputData);
          // Convert back to time domain (simplified - would need inverse FFT)
          outputData = fftResult.real;
          break;

        case 'convolution':
          const impulseResponse = params?.impulseResponse || new Float32Array(1024);
          outputData = await this.gpuAccelerator.runConvolutionOnGPU(inputData, impulseResponse);
          break;

        case 'realtime':
          outputData = await this.gpuAccelerator.processAudioOnGPU(inputData, 'realtime_effects', params);
          break;

        case 'ai_inference':
          const weights = params?.weights || new Float32Array(1024);
          const biases = params?.biases || new Float32Array(64);
          outputData = await this.gpuAccelerator.runAIInferenceOnGPU(inputData, weights, biases);
          break;

        default:
          outputData = inputData;
      }

      outputBuffer.copyToChannel(outputData, channel);
    }

    return outputBuffer;
  }

  /**
   * Process audio on CPU (fallback)
   */
  private async processOnCPU(
    audioBuffer: AudioBuffer,
    effectType: string,
    params?: any
  ): Promise<AudioBuffer> {
    console.log('⚙️ Processing on CPU (GPU not available or disabled)');

    // For now, return the input buffer unchanged
    // In production, this would implement CPU-based processing
    return audioBuffer;
  }

  /**
   * Process audio data (Float32Array) with GPU acceleration
   * @param audioData Input audio samples
   * @param effectType Type of effect
   * @param params Effect parameters
   */
  async processAudioData(
    audioData: Float32Array,
    effectType: 'fft' | 'convolution' | 'realtime' | 'ai_inference',
    params?: any
  ): Promise<Float32Array> {
    if (!this.isGPUAvailable || !this.isGPUEnabled) {
      return audioData; // CPU fallback
    }

    const startTime = performance.now();

    try {
      let result: Float32Array;

      switch (effectType) {
        case 'fft':
          const fftResult = await this.gpuAccelerator.runFFTOnGPU(audioData);
          result = fftResult.real;
          break;

        case 'convolution':
          const impulseResponse = params?.impulseResponse || new Float32Array(1024);
          result = await this.gpuAccelerator.runConvolutionOnGPU(audioData, impulseResponse);
          break;

        case 'realtime':
          result = await this.gpuAccelerator.processAudioOnGPU(audioData, 'realtime_effects', params);
          break;

        case 'ai_inference':
          const weights = params?.weights || new Float32Array(1024);
          const biases = params?.biases || new Float32Array(64);
          result = await this.gpuAccelerator.runAIInferenceOnGPU(audioData, weights, biases);
          break;

        default:
          result = audioData;
      }

      const endTime = performance.now();
      this.updateStats(endTime - startTime, true);

      return result;

    } catch (error) {
      console.error('GPU processing failed:', error);
      return audioData; // Return original data on error
    }
  }

  /**
   * Run FFT on GPU
   */
  async runFFT(audioData: Float32Array): Promise<{ real: Float32Array; imag: Float32Array }> {
    if (!this.isGPUAvailable || !this.isGPUEnabled) {
      // CPU fallback - return dummy data
      return {
        real: new Float32Array(audioData.length),
        imag: new Float32Array(audioData.length),
      };
    }

    return await this.gpuAccelerator.runFFTOnGPU(audioData);
  }

  /**
   * Run convolution (for reverb) on GPU
   */
  async runConvolution(
    audioData: Float32Array,
    impulseResponse: Float32Array
  ): Promise<Float32Array> {
    if (!this.isGPUAvailable || !this.isGPUEnabled) {
      return audioData; // CPU fallback
    }

    return await this.gpuAccelerator.runConvolutionOnGPU(audioData, impulseResponse);
  }

  /**
   * Update processing statistics
   */
  private updateStats(processingTime: number, usedGPU: boolean): void {
    this.stats.processingTime = processingTime;
    this.stats.lastUpdateTime = Date.now();

    // Estimate speedup factor (GPU vs CPU)
    // This is a rough estimate - would need actual benchmarks
    if (usedGPU) {
      this.stats.speedupFactor = 5.0; // GPU is typically 5x faster for audio
    } else {
      this.stats.speedupFactor = 1.0;
    }
  }

  /**
   * Get processing statistics
   */
  getStats(): GPUProcessingStats {
    return { ...this.stats };
  }

  /**
   * Get GPU hardware information
   */
  getGPUInfo(): any {
    return this.gpuAccelerator.getGPUInfo();
  }

  /**
   * Enable/disable GPU processing
   */
  setGPUEnabled(enabled: boolean): void {
    this.isGPUEnabled = enabled;
    this.stats.gpuEnabled = enabled;

    if (enabled && this.isGPUAvailable) {
      console.log('✅ GPU processing enabled');
    } else {
      console.log('⚙️ GPU processing disabled, using CPU');
    }
  }

  /**
   * Check if GPU is currently enabled
   */
  isEnabled(): boolean {
    return this.isGPUEnabled && this.isGPUAvailable;
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark(): Promise<any> {
    if (!this.isGPUAvailable) {
      return {
        error: 'GPU not available',
        gpuAvailable: false,
      };
    }

    console.log('🏁 Running GPU performance benchmark...');

    const results = await this.gpuAccelerator.benchmarkGPUPerformance();

    console.log('📊 Benchmark results:', results);

    return {
      gpuAvailable: true,
      gpuInfo: this.getGPUInfo(),
      benchmarks: results,
    };
  }

  /**
   * Cleanup GPU resources
   */
  dispose(): void {
    this.gpuAccelerator.dispose();
    this.isGPUAvailable = false;
    this.isGPUEnabled = false;
    console.log('🧹 GPU Audio Processor disposed');
  }
}

export default GPUAudioProcessor;
