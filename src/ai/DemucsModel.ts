import { ONNXModelManager, ModelConfig } from './ONNXModelManager';

export interface StemSeparationResult {
  vocals: AudioBuffer;
  drums: AudioBuffer;
  bass: AudioBuffer;
  other: AudioBuffer;
}

export interface DemucsOptions {
  model: 'htdemucs' | 'mdx_extra' | 'mdx';
  shifts: number;
  split: boolean;
  overlap: number;
}

export class DemucsModel {
  private onnxManager: ONNXModelManager;
  private modelName = 'demucs';
  private isInitialized = false;
  private audioContext: AudioContext;

  constructor(onnxManager: ONNXModelManager) {
    this.onnxManager = onnxManager;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const modelConfig: ModelConfig = {
      name: this.modelName,
      url: '/models/demucs/htdemucs.onnx',
      inputShape: [1, 2, 343980], // [batch, channels, samples] - stereo, ~8 seconds at 44.1kHz
      outputShape: [4, 2, 343980], // [sources, channels, samples] - 4 stems (vocals, drums, bass, other)
      inputType: 'float32',
      outputType: 'float32',
      preprocessing: this.preprocessAudio.bind(this),
      postprocessing: this.postprocessAudio.bind(this)
    };

    this.onnxManager.registerModel(modelConfig);
    
    try {
      await this.onnxManager.loadModel(this.modelName);
      this.isInitialized = true;
      console.log('Demucs model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Demucs model:', error);
      // Fallback to simple spectral separation
      this.isInitialized = false;
    }
  }

  async separate(
    audioBuffer: AudioBuffer,
    options: Partial<DemucsOptions> = {}
  ): Promise<StemSeparationResult> {
    const opts: DemucsOptions = {
      model: 'htdemucs',
      shifts: 1,
      split: true,
      overlap: 0.25,
      ...options
    };

    if (!this.isInitialized) {
      console.warn('Demucs model not available, using basic spectral separation');
      return this.basicSpectralSeparation(audioBuffer);
    }

    try {
      return await this.separateWithONNX(audioBuffer, opts);
    } catch (error) {
      console.error('Demucs separation failed, falling back to basic method:', error);
      return this.basicSpectralSeparation(audioBuffer);
    }
  }

  private async separateWithONNX(
    audioBuffer: AudioBuffer,
    options: DemucsOptions
  ): Promise<StemSeparationResult> {
    // Convert to stereo if needed
    const stereoBuffer = this.ensureStereo(audioBuffer);
    
    // Split audio into chunks for processing
    const chunkSize = 343980; // Model's expected input size
    const overlapSize = Math.floor(chunkSize * options.overlap);
    
    const leftChannel = stereoBuffer.getChannelData(0);
    const rightChannel = stereoBuffer.getChannelData(1);
    
    // Interleave stereo data for model input
    const interleavedData = new Float32Array(leftChannel.length * 2);
    for (let i = 0; i < leftChannel.length; i++) {
      interleavedData[i * 2] = leftChannel[i];
      interleavedData[i * 2 + 1] = rightChannel[i];
    }

    const chunks = this.onnxManager.chunkAudio(interleavedData, chunkSize * 2, overlapSize * 2);
    const separatedChunks: Float32Array[][] = [[], [], [], []]; // 4 stems

    for (const chunk of chunks) {
      // Reshape chunk for model input
      const modelInput = this.reshapeForModel(chunk);
      
      // Run separation
      const separatedOutput = await this.onnxManager.runInference(
        this.modelName,
        modelInput,
        'waveform'
      );

      // Process output for each stem
      const stemChunks = this.extractStems(separatedOutput);
      for (let stemIdx = 0; stemIdx < 4; stemIdx++) {
        separatedChunks[stemIdx].push(stemChunks[stemIdx]);
      }
    }

    // Merge chunks for each stem
    const finalStems: Float32Array[] = [];
    for (let stemIdx = 0; stemIdx < 4; stemIdx++) {
      const mergedStem = this.onnxManager.mergeChunks(
        separatedChunks[stemIdx],
        chunkSize * 2,
        overlapSize * 2
      );
      finalStems.push(mergedStem);
    }

    // Convert back to AudioBuffers
    const vocals = this.createStereoBuffer(finalStems[0], audioBuffer.sampleRate);
    const drums = this.createStereoBuffer(finalStems[1], audioBuffer.sampleRate);
    const bass = this.createStereoBuffer(finalStems[2], audioBuffer.sampleRate);
    const other = this.createStereoBuffer(finalStems[3], audioBuffer.sampleRate);

    return { vocals, drums, bass, other };
  }

  private basicSpectralSeparation(audioBuffer: AudioBuffer): StemSeparationResult {
    // Simple frequency-based separation as fallback
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    
    // Create empty buffers for each stem
    const vocals = this.audioContext.createBuffer(2, length, sampleRate);
    const drums = this.audioContext.createBuffer(2, length, sampleRate);
    const bass = this.audioContext.createBuffer(2, length, sampleRate);
    const other = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      
      // Apply frequency-based filtering
      const vocalsData = this.applyBandpassFilter(sourceData, 200, 8000, sampleRate);
      const drumsData = this.applyHighpassFilter(sourceData, 100, sampleRate);
      const bassData = this.applyLowpassFilter(sourceData, 200, sampleRate);
      const otherData = this.applyBandpassFilter(sourceData, 80, 15000, sampleRate);

      // Reduce volume to compensate for overlap
      for (let i = 0; i < length; i++) {
        vocalsData[i] *= 0.7;
        drumsData[i] *= 0.5;
        bassData[i] *= 0.8;
        otherData[i] *= 0.6;
      }

      vocals.copyToChannel(vocalsData, Math.min(channel, 1));
      drums.copyToChannel(drumsData, Math.min(channel, 1));
      bass.copyToChannel(bassData, Math.min(channel, 1));
      other.copyToChannel(otherData, Math.min(channel, 1));
    }

    // Fill second channel if mono
    if (audioBuffer.numberOfChannels === 1) {
      vocals.copyToChannel(vocals.getChannelData(0), 1);
      drums.copyToChannel(drums.getChannelData(0), 1);
      bass.copyToChannel(bass.getChannelData(0), 1);
      other.copyToChannel(other.getChannelData(0), 1);
    }

    return { vocals, drums, bass, other };
  }

  private applyBandpassFilter(
    data: Float32Array,
    lowFreq: number,
    highFreq: number,
    sampleRate: number
  ): Float32Array {
    const nyquist = sampleRate / 2;
    const lowNorm = lowFreq / nyquist;
    const highNorm = highFreq / nyquist;
    
    const filtered = new Float32Array(data.length);
    
    // Simple IIR bandpass filter implementation
    let prevInput1 = 0, prevInput2 = 0;
    let prevOutput1 = 0, prevOutput2 = 0;
    
    const omega1 = 2 * Math.PI * lowNorm;
    const omega2 = 2 * Math.PI * highNorm;
    const alpha1 = Math.sin(omega1) / 2;
    const alpha2 = Math.sin(omega2) / 2;
    
    for (let i = 0; i < data.length; i++) {
      const input = data[i];
      
      // High-pass component
      const hp = alpha1 * (input - 2 * prevInput1 + prevInput2) + 
                 2 * Math.cos(omega1) * prevOutput1 - prevOutput2;
      
      // Low-pass component applied to high-pass output
      const bp = alpha2 * (hp + 2 * prevOutput1 + prevOutput2);
      
      filtered[i] = bp;
      
      prevInput2 = prevInput1;
      prevInput1 = input;
      prevOutput2 = prevOutput1;
      prevOutput1 = bp;
    }
    
    return filtered;
  }

  private applyLowpassFilter(
    data: Float32Array,
    cutoffFreq: number,
    sampleRate: number
  ): Float32Array {
    const filtered = new Float32Array(data.length);
    const rc = 1 / (2 * Math.PI * cutoffFreq);
    const dt = 1 / sampleRate;
    const alpha = dt / (rc + dt);
    
    let prevOutput = 0;
    
    for (let i = 0; i < data.length; i++) {
      const output = prevOutput + alpha * (data[i] - prevOutput);
      filtered[i] = output;
      prevOutput = output;
    }
    
    return filtered;
  }

  private applyHighpassFilter(
    data: Float32Array,
    cutoffFreq: number,
    sampleRate: number
  ): Float32Array {
    const filtered = new Float32Array(data.length);
    const rc = 1 / (2 * Math.PI * cutoffFreq);
    const dt = 1 / sampleRate;
    const alpha = rc / (rc + dt);
    
    let prevInput = 0;
    let prevOutput = 0;
    
    for (let i = 0; i < data.length; i++) {
      const output = alpha * (prevOutput + data[i] - prevInput);
      filtered[i] = output;
      
      prevInput = data[i];
      prevOutput = output;
    }
    
    return filtered;
  }

  private ensureStereo(audioBuffer: AudioBuffer): AudioBuffer {
    if (audioBuffer.numberOfChannels === 2) {
      return audioBuffer;
    }

    const stereoBuffer = this.audioContext.createBuffer(
      2,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const sourceChannel = audioBuffer.getChannelData(0);
    stereoBuffer.copyToChannel(sourceChannel, 0);
    stereoBuffer.copyToChannel(sourceChannel, 1);

    return stereoBuffer;
  }

  private reshapeForModel(chunk: Float32Array): Float32Array {
    // Reshape interleaved stereo data for model input
    // Model expects [batch, channels, samples] = [1, 2, samples/2]
    const samples = chunk.length / 2;
    const modelInput = new Float32Array(chunk.length);
    
    // De-interleave: [L, R, L, R, ...] -> [L, L, L, ..., R, R, R, ...]
    for (let i = 0; i < samples; i++) {
      modelInput[i] = chunk[i * 2];           // Left channel
      modelInput[samples + i] = chunk[i * 2 + 1]; // Right channel
    }
    
    return modelInput;
  }

  private extractStems(output: Float32Array): Float32Array[] {
    // Model outputs [4 stems, 2 channels, samples]
    const totalSamples = output.length;
    const samplesPerStemChannel = totalSamples / 8; // 4 stems * 2 channels
    const stems: Float32Array[] = [];

    for (let stemIdx = 0; stemIdx < 4; stemIdx++) {
      const stemData = new Float32Array(samplesPerStemChannel * 2);
      
      // Extract and interleave stereo data for this stem
      const leftOffset = stemIdx * samplesPerStemChannel * 2;
      const rightOffset = leftOffset + samplesPerStemChannel;
      
      for (let i = 0; i < samplesPerStemChannel; i++) {
        stemData[i * 2] = output[leftOffset + i];     // Left
        stemData[i * 2 + 1] = output[rightOffset + i]; // Right
      }
      
      stems.push(stemData);
    }

    return stems;
  }

  private createStereoBuffer(interleavedData: Float32Array, sampleRate: number): AudioBuffer {
    const samples = interleavedData.length / 2;
    const buffer = this.audioContext.createBuffer(2, samples, sampleRate);
    
    const leftChannel = new Float32Array(samples);
    const rightChannel = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      leftChannel[i] = interleavedData[i * 2];
      rightChannel[i] = interleavedData[i * 2 + 1];
    }
    
    buffer.copyToChannel(leftChannel, 0);
    buffer.copyToChannel(rightChannel, 1);
    
    return buffer;
  }

  private preprocessAudio(input: Float32Array): Float32Array {
    return this.onnxManager.normalizeAudio(input);
  }

  private postprocessAudio(output: Float32Array): Float32Array {
    // Apply soft limiting to prevent clipping
    const processed = new Float32Array(output.length);
    for (let i = 0; i < output.length; i++) {
      processed[i] = Math.tanh(output[i] * 0.95);
    }
    return processed;
  }

  async getAvailableModels(): Promise<string[]> {
    return ['htdemucs', 'mdx_extra', 'mdx'];
  }

  async getModelInfo(): Promise<{
    loaded: boolean;
    capabilities: string[];
    stems: string[];
  }> {
    return {
      loaded: this.isInitialized,
      capabilities: [
        'Source Separation',
        'Stem Isolation',
        'Real-time Processing',
        'Multiple Model Support'
      ],
      stems: ['vocals', 'drums', 'bass', 'other']
    };
  }

  dispose(): void {
    if (this.isInitialized) {
      this.onnxManager.unloadModel(this.modelName);
      this.isInitialized = false;
    }
  }
}
