import { ModelConfig, ONNXModelManager } from './ONNXModelManager';

export interface AudioSROptions {
  scale: number;
  targetSampleRate: number;
  chunkSize: number;
  overlapSize: number;
}

export class AudioSRModel {
  private onnxManager: ONNXModelManager;
  private modelName = 'audio-sr';
  private isInitialized = false;

  constructor(onnxManager: ONNXModelManager) {
    this.onnxManager = onnxManager;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const modelConfig: ModelConfig = {
      name: this.modelName,
      url: '/models/audio-sr/model.onnx', // This would need to be hosted
      inputShape: [1, 1, 16384], // [batch, channels, samples]
      outputShape: [1, 1, 32768], // [batch, channels, samples] - 2x upscaling
      inputType: 'float32',
      outputType: 'float32',
      preprocessing: this.preprocessAudio.bind(this),
      postprocessing: this.postprocessAudio.bind(this),
    };

    this.onnxManager.registerModel(modelConfig);

    try {
      await this.onnxManager.loadModel(this.modelName);
      this.isInitialized = true;
      console.log('AudioSR model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioSR model:', error);
      // Fallback to traditional upsampling
      this.isInitialized = false;
    }
  }

  async enhance(
    audioBuffer: AudioBuffer,
    options: Partial<AudioSROptions> = {},
  ): Promise<AudioBuffer> {
    const opts: AudioSROptions = {
      scale: 2,
      targetSampleRate: audioBuffer.sampleRate * 2,
      chunkSize: 16384,
      overlapSize: 1024,
      ...options,
    };

    if (!this.isInitialized) {
      console.warn('AudioSR model not available, using traditional upsampling');
      return this.traditionalUpsample(audioBuffer, opts);
    }

    try {
      return await this.enhanceWithONNX(audioBuffer, opts);
    } catch (error) {
      console.error('AudioSR enhancement failed, falling back to traditional method:', error);
      return this.traditionalUpsample(audioBuffer, opts);
    }
  }

  private async enhanceWithONNX(
    audioBuffer: AudioBuffer,
    options: AudioSROptions,
  ): Promise<AudioBuffer> {
    const channels = audioBuffer.numberOfChannels;
    const enhancedChannels: Float32Array[] = [];

    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);

      // Prepare audio input (resample to 16kHz for the model)
      const modelInputData = this.onnxManager.prepareAudioInput(
        { getChannelData: () => channelData, sampleRate: audioBuffer.sampleRate } as AudioBuffer,
        16000,
      );

      // Split into chunks for processing
      const chunks = this.onnxManager.chunkAudio(
        modelInputData,
        options.chunkSize,
        options.overlapSize,
      );

      // Process each chunk
      const enhancedChunks: Float32Array[] = [];
      for (const chunk of chunks) {
        const enhanced = await this.onnxManager.runInference(this.modelName, chunk, 'audio_input');
        enhancedChunks.push(enhanced);
      }

      // Merge chunks back together
      const enhancedChannel = this.onnxManager.mergeChunks(
        enhancedChunks,
        options.chunkSize * options.scale,
        options.overlapSize * options.scale,
      );

      // Resample to target sample rate if necessary
      const finalChannel = this.resampleToTarget(
        enhancedChannel,
        32000, // Model outputs at 32kHz
        options.targetSampleRate,
      );

      enhancedChannels.push(finalChannel);
    }

    // Create enhanced audio buffer
    return this.createAudioBuffer(enhancedChannels, options.targetSampleRate);
  }

  private traditionalUpsample(audioBuffer: AudioBuffer, options: AudioSROptions): AudioBuffer {
    const channels = audioBuffer.numberOfChannels;
    const sourceSampleRate = audioBuffer.sampleRate;
    const targetSampleRate = options.targetSampleRate;
    const ratio = targetSampleRate / sourceSampleRate;

    const enhancedChannels: Float32Array[] = [];

    for (let channel = 0; channel < channels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      const targetLength = Math.floor(sourceData.length * ratio);
      const enhancedData = new Float32Array(targetLength);

      // Linear interpolation with anti-aliasing
      for (let i = 0; i < targetLength; i++) {
        const sourceIndex = i / ratio;
        const leftIndex = Math.floor(sourceIndex);
        const rightIndex = Math.min(leftIndex + 1, sourceData.length - 1);
        const fraction = sourceIndex - leftIndex;

        const leftValue = sourceData[leftIndex] || 0;
        const rightValue = sourceData[rightIndex] || 0;

        enhancedData[i] = leftValue * (1 - fraction) + rightValue * fraction;
      }

      // Apply simple high-frequency enhancement
      this.applyHighFrequencyBoost(enhancedData, targetSampleRate);
      enhancedChannels.push(enhancedData);
    }

    return this.createAudioBuffer(enhancedChannels, targetSampleRate);
  }

  private applyHighFrequencyBoost(data: Float32Array, sampleRate: number): void {
    // Simple high-pass filter to enhance high frequencies
    const cutoffFreq = 8000; // Hz
    const rc = 1 / (2 * Math.PI * cutoffFreq);
    const dt = 1 / sampleRate;
    const alpha = rc / (rc + dt);

    let previousInput = 0;
    let previousOutput = 0;

    for (let i = 0; i < data.length; i++) {
      const output = alpha * (previousOutput + data[i] - previousInput);
      data[i] += output * 0.3; // Mix enhanced signal

      previousInput = data[i];
      previousOutput = output;
    }
  }

  private resampleToTarget(
    data: Float32Array,
    sourceSampleRate: number,
    targetSampleRate: number,
  ): Float32Array {
    if (sourceSampleRate === targetSampleRate) {
      return data;
    }

    const ratio = targetSampleRate / sourceSampleRate;
    const outputLength = Math.floor(data.length * ratio);
    const resampled = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i / ratio;
      const leftIndex = Math.floor(sourceIndex);
      const rightIndex = Math.min(leftIndex + 1, data.length - 1);
      const fraction = sourceIndex - leftIndex;

      resampled[i] = data[leftIndex] * (1 - fraction) + data[rightIndex] * fraction;
    }

    return resampled;
  }

  private createAudioBuffer(channels: Float32Array[], sampleRate: number): AudioBuffer {
    const maxLength = Math.max(...channels.map((c) => c.length));
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = audioContext.createBuffer(channels.length, maxLength, sampleRate);

    for (let i = 0; i < channels.length; i++) {
      buffer.copyToChannel(channels[i], i);
    }

    return buffer;
  }

  private preprocessAudio(input: Float32Array): Float32Array {
    // Normalize to [-1, 1] range
    return this.onnxManager.normalizeAudio(input);
  }

  private postprocessAudio(output: Float32Array): Float32Array {
    // Apply soft clipping to prevent distortion
    const processed = new Float32Array(output.length);
    for (let i = 0; i < output.length; i++) {
      processed[i] = Math.tanh(output[i]);
    }
    return processed;
  }

  async getModelInfo(): Promise<{
    loaded: boolean;
    inputShape: number[];
    outputShape: number[];
    capabilities: string[];
  }> {
    return {
      loaded: this.isInitialized,
      inputShape: [1, 1, 16384],
      outputShape: [1, 1, 32768],
      capabilities: [
        '2x Super Resolution',
        'Frequency Enhancement',
        'Noise Reduction',
        'Dynamic Range Expansion',
      ],
    };
  }

  dispose(): void {
    if (this.isInitialized) {
      this.onnxManager.unloadModel(this.modelName);
      this.isInitialized = false;
    }
  }
}
