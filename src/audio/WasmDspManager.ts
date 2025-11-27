// WASM DSP Manager - handles loading and communication with AudioWorklet
import init, { WasmDspProcessor as WasmDspProcessorClass } from '../../public/wasm/ravr_wasm';
import { GPUAudioProcessor } from './GPUAudioProcessor';

export interface WasmDspConfig {
  eq: {
    low: number;
    mid: number;
    high: number;
  };
  compressor: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
  limiter: {
    threshold: number;
  };
  reverb: {
    mix: number;
  };
}

export class WasmDspManager {
  private audioContext: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private ready: boolean = false;
  private readyPromise: Promise<void>;

  // GPU Hybrid Processing
  private gpuProcessor: GPUAudioProcessor | null = null;
  private useGpuForFFT: boolean = true; // Prefer GPU for FFT
  private useGpuForConvolution: boolean = true; // Prefer GPU for convolution

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;

    this.readyPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load WASM module in main thread first
      await init();

      // Register AudioWorklet processor
      const processorUrl = new URL('/wasm-dsp-processor.js', window.location.origin).href;
      await this.audioContext.audioWorklet.addModule(processorUrl);

      // Create worklet node
      this.workletNode = new AudioWorkletNode(this.audioContext, 'wasm-dsp-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2], // Stereo output
      });

      // Wait for worklet to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WASM processor initialization timeout'));
        }, 5000);

        this.workletNode!.port.onmessage = (event) => {
          if (event.data.type === 'ready') {
            clearTimeout(timeout);
            this.ready = true;
            resolve();
          } else if (event.data.type === 'error') {
            clearTimeout(timeout);
            reject(new Error(event.data.error));
          }
        };

        // Send initialization message with sample rate
        // Note: WASM loading in AudioWorklet is not supported due to import() restrictions
        // For now, the worklet will operate in passthrough mode
        this.workletNode!.port.postMessage({
          type: 'init',
          sampleRate: this.audioContext.sampleRate,
        });
      });

      console.log('✅ WASM DSP Engine initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WASM DSP Engine:', error);
      throw error;
    }
  }

  async waitUntilReady(): Promise<void> {
    await this.readyPromise;
  }

  isReady(): boolean {
    return this.ready;
  }

  getNode(): AudioWorkletNode | null {
    return this.workletNode;
  }

  // DSP Controls
  setEq(low: number, mid: number, high: number): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.postMessage({
      type: 'setEq',
      low,
      mid,
      high,
    });
  }

  setCompressor(threshold: number, ratio: number, attack: number, release: number): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.postMessage({
      type: 'setCompressor',
      threshold,
      ratio,
      attack,
      release,
    });
  }

  setLimiter(threshold: number): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.postMessage({
      type: 'setLimiter',
      threshold,
    });
  }

  setReverb(mix: number): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.postMessage({
      type: 'setReverb',
      mix,
    });
  }

  applyConfig(config: WasmDspConfig): void {
    this.setEq(config.eq.low, config.eq.mid, config.eq.high);
    this.setCompressor(
      config.compressor.threshold,
      config.compressor.ratio,
      config.compressor.attack,
      config.compressor.release
    );
    this.setLimiter(config.limiter.threshold);
    this.setReverb(config.reverb.mix);
  }

  // ========== GPU Hybrid Processing ==========

  /**
   * Set GPU processor for hybrid CPU/GPU processing
   * @param gpuProcessor GPU processor instance from useAudioEngine
   */
  setGpuProcessor(gpuProcessor: GPUAudioProcessor | null): void {
    this.gpuProcessor = gpuProcessor;

    if (gpuProcessor && gpuProcessor.isEnabled()) {
      console.log('🎮 Hybrid CPU/GPU processing enabled in WASM DSP Manager');
    } else {
      console.log('⚙️ CPU-only processing (GPU not available or disabled)');
    }
  }

  /**
   * Enable/disable GPU acceleration for FFT operations
   */
  setGpuFFTEnabled(enabled: boolean): void {
    this.useGpuForFFT = enabled;
    console.log(`FFT: ${enabled ? '🎮 GPU' : '⚙️ CPU'}`);
  }

  /**
   * Enable/disable GPU acceleration for convolution operations
   */
  setGpuConvolutionEnabled(enabled: boolean): void {
    this.useGpuForConvolution = enabled;
    console.log(`Convolution: ${enabled ? '🎮 GPU' : '⚙️ CPU'}`);
  }

  /**
   * Run FFT on audio data (GPU-accelerated if available)
   * @param audioData Input audio samples
   * @returns FFT result (real and imaginary components)
   */
  async runFFT(audioData: Float32Array): Promise<{ real: Float32Array; imag: Float32Array }> {
    // Try GPU first if enabled and available
    if (this.useGpuForFFT && this.gpuProcessor && this.gpuProcessor.isEnabled()) {
      try {
        return await this.gpuProcessor.runFFT(audioData);
      } catch (error) {
        console.warn('GPU FFT failed, falling back to CPU:', error);
      }
    }

    // CPU fallback (WASM implementation would go here)
    // For now, return empty arrays
    return {
      real: new Float32Array(audioData.length),
      imag: new Float32Array(audioData.length),
    };
  }

  /**
   * Run convolution on audio data (GPU-accelerated if available)
   * @param audioData Input audio samples
   * @param impulseResponse Impulse response for convolution
   * @returns Convolved audio
   */
  async runConvolution(
    audioData: Float32Array,
    impulseResponse: Float32Array
  ): Promise<Float32Array> {
    // Try GPU first if enabled and available
    if (this.useGpuForConvolution && this.gpuProcessor && this.gpuProcessor.isEnabled()) {
      try {
        return await this.gpuProcessor.runConvolution(audioData, impulseResponse);
      } catch (error) {
        console.warn('GPU convolution failed, falling back to CPU:', error);
      }
    }

    // CPU fallback (WASM implementation would go here)
    // For now, return original audio
    return audioData;
  }

  /**
   * Process audio buffer with GPU acceleration for specific operations
   * @param audioBuffer Input audio buffer
   * @param operation Operation to perform
   * @param params Operation parameters
   */
  async processWithGPU(
    audioBuffer: AudioBuffer,
    operation: 'fft' | 'convolution' | 'realtime' | 'ai_inference',
    params?: any
  ): Promise<AudioBuffer> {
    if (!this.gpuProcessor || !this.gpuProcessor.isEnabled()) {
      console.warn('GPU not available, skipping GPU processing');
      return audioBuffer;
    }

    try {
      return await this.gpuProcessor.processAudioBuffer(audioBuffer, operation, params);
    } catch (error) {
      console.error('GPU processing error:', error);
      return audioBuffer;
    }
  }

  /**
   * Get hybrid processing status
   */
  getHybridProcessingStatus(): {
    gpuAvailable: boolean;
    gpuForFFT: boolean;
    gpuForConvolution: boolean;
  } {
    return {
      gpuAvailable: this.gpuProcessor?.isEnabled() ?? false,
      gpuForFFT: this.useGpuForFFT && (this.gpuProcessor?.isEnabled() ?? false),
      gpuForConvolution: this.useGpuForConvolution && (this.gpuProcessor?.isEnabled() ?? false),
    };
  }

  // Cleanup
  disconnect(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    this.ready = false;
    this.gpuProcessor = null;
  }
}

// Export WASM module classes for direct use
export { WasmDspProcessorClass };
export { init as initWasm };
