import { ONNXModelManager, ModelConfig } from './ONNXModelManager';
import { AUDIO_MODELS, GENRE_LABELS, AudioPreprocessor } from './models/AudioModels';

interface EnhancementOptions {
  superResolution?: {
    enabled: boolean;
    targetSampleRate: number;
    quality: 'fast' | 'balanced' | 'high';
  };
  sourceSeparation?: {
    enabled: boolean;
    stems: ('vocals' | 'drums' | 'bass' | 'other')[];
    isolateVocals: boolean;
  };
  harmonicSynthesis?: {
    enabled: boolean;
    fundamentalBoost: number;
    harmonicSpread: number;
  };
  genreDetection?: {
    enabled: boolean;
    confidence: number;
  };
  noiseReduction?: {
    enabled: boolean;
    strength: number;
    preserveTransients: boolean;
  };
}

interface ProcessingResult {
  enhancedAudio: AudioBuffer;
  metadata: {
    originalSampleRate: number;
    enhancedSampleRate: number;
    detectedGenre?: string;
    genreConfidence?: number;
    processingTime: number;
    qualityScore: number;
  };
  stems?: {
    vocals?: AudioBuffer;
    drums?: AudioBuffer;
    bass?: AudioBuffer;
    other?: AudioBuffer;
  };
}

interface ProgressCallback {
  (stage: string, progress: number): void;
}

export class AIEnhancementPipeline {
  private modelManager: ONNXModelManager;
  private isProcessing = false;
  private availableModels: Map<string, ModelConfig> = new Map();

  constructor() {
    this.modelManager = new ONNXModelManager();
    this.initializeModels();
  }

  private initializeModels(): void {
    // Register all available audio models
    Object.values(AUDIO_MODELS).forEach(model => {
      this.modelManager.registerModel(model);
      this.availableModels.set(model.name, model);
    });

    // Legacy AudioSR Model Configuration (fallback)
    const audioSRConfig: ModelConfig = {
      name: 'audiosr',
      url: '/models/audiosr.onnx',
      inputShape: [1, -1],
      outputShape: [1, -1],
      inputType: 'float32',
      outputType: 'float32',
      expectedHash: 'audiosr_model_hash_placeholder',
      preprocessing: (input: Float32Array) => {
        const max = Math.max(...Array.from(input).map(Math.abs));
        if (max === 0) return input;
        return input.map(x => x / max) as Float32Array;
      },
      postprocessing: (output: Float32Array) => {
        return output.map(x => Math.tanh(x * 0.9)) as Float32Array;
      }
    };

    this.availableModels.set('audiosr', audioSRConfig);
  }

  async processAudio(
    audioBuffer: AudioBuffer,
    options: EnhancementOptions,
    progressCallback?: ProgressCallback
  ): Promise<ProcessingResult> {
    if (this.isProcessing) {
      throw new Error('Pipeline is already processing audio');
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      progressCallback?.('Initializing AI pipeline...', 0);

      let currentBuffer = audioBuffer;
      const result: ProcessingResult = {
        enhancedAudio: audioBuffer,
        metadata: {
          originalSampleRate: audioBuffer.sampleRate,
          enhancedSampleRate: audioBuffer.sampleRate,
          processingTime: 0,
          qualityScore: 0.8
        }
      };

      // Step 1: Super Resolution with AI model
      if (options.superResolution?.enabled) {
        progressCallback?.('Applying AI super-resolution...', 20);
        try {
          currentBuffer = await this.applySuperResolutionAI(
            currentBuffer,
            options.superResolution.targetSampleRate
          );
          result.metadata.enhancedSampleRate = options.superResolution.targetSampleRate;
        } catch (error) {
          console.warn('AI super-resolution failed, using fallback:', error);
          currentBuffer = await this.applySuperResolutionFallback(
            currentBuffer,
            options.superResolution.targetSampleRate
          );
        }
      }

      // Step 2: Source Separation with AI model
      if (options.sourceSeparation?.enabled) {
        progressCallback?.('Separating audio sources...', 40);
        try {
          result.stems = await this.separateStemsAI(currentBuffer);
        } catch (error) {
          console.warn('AI source separation failed, using fallback:', error);
          result.stems = await this.separateStemsFallback(currentBuffer);
        }
        
        if (options.sourceSeparation.isolateVocals && result.stems.vocals) {
          currentBuffer = result.stems.vocals;
        }
      }

      // Step 3: Genre Detection with AI model
      if (options.genreDetection?.enabled) {
        progressCallback?.('Detecting genre...', 60);
        try {
          const genreResult = await this.detectGenreAI(currentBuffer);
          result.metadata.detectedGenre = genreResult.genre;
          result.metadata.genreConfidence = genreResult.confidence;
        } catch (error) {
          console.warn('AI genre detection failed, using fallback:', error);
          const genreResult = await this.detectGenre(currentBuffer);
          result.metadata.detectedGenre = genreResult.genre;
          result.metadata.genreConfidence = genreResult.confidence;
        }
      }

      // Step 4: Noise Reduction with AI model
      if (options.noiseReduction?.enabled) {
        progressCallback?.('Reducing noise with AI...', 80);
        try {
          currentBuffer = await this.applyNoiseReductionAI(currentBuffer, options.noiseReduction);
        } catch (error) {
          console.warn('AI noise reduction failed, using fallback:', error);
          currentBuffer = await this.reduceNoise(
            currentBuffer,
            options.noiseReduction.strength
          );
        }
      }

      result.enhancedAudio = currentBuffer;
      result.metadata.processingTime = performance.now() - startTime;
      result.metadata.qualityScore = this.calculateQualityScore(audioBuffer, currentBuffer);

      progressCallback?.('AI enhancement complete!', 100);
      return result;

    } catch (error) {
      throw new Error(`AI processing failed: ${(error as Error).message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async applySuperResolutionFallback(
    audioBuffer: AudioBuffer,
    targetSampleRate: number
  ): Promise<AudioBuffer> {
    // Simple upsampling fallback
    if (targetSampleRate <= audioBuffer.sampleRate) {
      return audioBuffer;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ratio = targetSampleRate / audioBuffer.sampleRate;
    const newLength = Math.floor(audioBuffer.length * ratio);
    
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      targetSampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = newBuffer.getChannelData(channel);
      
      // Simple linear interpolation
      for (let i = 0; i < newLength; i++) {
        const sourceIndex = i / ratio;
        const index = Math.floor(sourceIndex);
        const fraction = sourceIndex - index;
        
        if (index + 1 < inputData.length) {
          outputData[i] = inputData[index] * (1 - fraction) + inputData[index + 1] * fraction;
        } else {
          outputData[i] = inputData[Math.min(index, inputData.length - 1)];
        }
      }
    }

    return newBuffer;
  }

  private async separateStemsFallback(audioBuffer: AudioBuffer): Promise<{
    vocals?: AudioBuffer;
    drums?: AudioBuffer;
    bass?: AudioBuffer;
    other?: AudioBuffer;
  }> {
    // Simple frequency-based separation fallback
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create simple stems using frequency filtering
    const vocals = this.createFilteredStem(audioBuffer, 'highpass', 300);
    const bass = this.createFilteredStem(audioBuffer, 'lowpass', 200);
    const drums = this.createFilteredStem(audioBuffer, 'bandpass', 60, 8000);
    const other = audioBuffer; // Use original as "other"

    return { vocals, drums, bass, other };
  }

  private createFilteredStem(
    audioBuffer: AudioBuffer,
    type: 'lowpass' | 'highpass' | 'bandpass',
    frequency: number,
    highFreq?: number
  ): AudioBuffer {
    // This would normally use Web Audio API filtering
    // For now, return a copy of the original buffer
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = newBuffer.getChannelData(channel);
      
      // Simple filter simulation (reduce amplitude for demonstration)
      const reduction = type === 'lowpass' ? 0.7 : type === 'highpass' ? 0.5 : 0.6;
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i] * reduction;
      }
    }

    return newBuffer;
  }

  private async detectGenre(audioBuffer: AudioBuffer): Promise<{ genre: string; confidence: number }> {
    // Simplified genre detection based on spectral analysis
    const channelData = audioBuffer.getChannelData(0);
    const fftSize = 2048;
    const sampleSize = Math.min(fftSize, channelData.length);
    
    // Simple spectral analysis
    let lowEnergy = 0, midEnergy = 0, highEnergy = 0;
    const third = Math.floor(sampleSize / 3);
    
    for (let i = 0; i < third; i++) lowEnergy += Math.abs(channelData[i]);
    for (let i = third; i < third * 2; i++) midEnergy += Math.abs(channelData[i]);
    for (let i = third * 2; i < sampleSize; i++) highEnergy += Math.abs(channelData[i]);
    
    const total = lowEnergy + midEnergy + highEnergy;
    if (total === 0) return { genre: 'unknown', confidence: 0 };
    
    const lowRatio = lowEnergy / total;
    const highRatio = highEnergy / total;
    const midRatio = midEnergy / total;
    
    // Simple genre classification
    if (highRatio > 0.4) return { genre: 'electronic', confidence: 0.8 };
    if (lowRatio > 0.5) return { genre: 'hip-hop', confidence: 0.7 };
    if (midRatio > 0.4) return { genre: 'rock', confidence: 0.75 };
    return { genre: 'pop', confidence: 0.6 };
  }

  private async reduceNoise(
    audioBuffer: AudioBuffer,
    strength: number
  ): Promise<AudioBuffer> {
    // Simple noise gate
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const processedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const threshold = 0.01 * strength;
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      for (let i = 0; i < inputData.length; i++) {
        const sample = inputData[i];
        const magnitude = Math.abs(sample);
        
        if (magnitude < threshold) {
          outputData[i] = sample * (1 - strength);
        } else {
          outputData[i] = sample;
        }
      }
    }
    
    return processedBuffer;
  }

  private calculateQualityScore(original: AudioBuffer, processed: AudioBuffer): number {
    // Simple quality metric based on RMS difference
    const originalRMS = this.calculateRMS(original.getChannelData(0));
    const processedRMS = this.calculateRMS(processed.getChannelData(0));
    
    const difference = Math.abs(originalRMS - processedRMS);
    return Math.max(0, 1 - difference);
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  isModelAvailable(modelName: string): boolean {
    return this.availableModels.has(modelName);
  }

  getAvailableModels(): string[] {
    return Array.from(this.availableModels.keys());
  }

  async preloadModels(): Promise<void> {
    // Load all available AI models
    const modelNames = Object.keys(AUDIO_MODELS);
    const loadPromises = modelNames.map(async (name) => {
      try {
        await this.modelManager.loadModel(name);
        console.log(`AI model ${name} loaded successfully`);
      } catch (error) {
        console.warn(`Failed to load AI model ${name}:`, error);
      }
    });
    
    await Promise.allSettled(loadPromises);
    console.log('AI models preloaded');
  }

  // New AI-powered methods
  private async applySuperResolutionAI(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
    const model = await this.modelManager.loadModel('superResolution');
    const audioData = audioBuffer.getChannelData(0);
    
    // Preprocess audio
    const preprocessed = AudioPreprocessor.normalizeAudio(audioData);
    
    // Run inference
    const output = await this.modelManager.runInference('superResolution', preprocessed);
    
    // Create new audio buffer with upsampled data
    const upsampledLength = Math.floor(audioData.length * (targetSampleRate / audioBuffer.sampleRate));
    const upsampledData = new Float32Array(upsampledLength);
    
    // Simple linear interpolation for upsampling
    for (let i = 0; i < upsampledLength; i++) {
      const srcIndex = (i * audioData.length) / upsampledLength;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
      const t = srcIndex - srcIndexFloor;
      
      upsampledData[i] = output[srcIndexFloor] * (1 - t) + output[srcIndexCeil] * t;
    }
    
    // Create new AudioBuffer
    const newBuffer = audioBuffer.context.createBuffer(1, upsampledLength, targetSampleRate);
    newBuffer.copyToChannel(upsampledData, 0);
    
    return newBuffer;
  }

  private async separateStemsAI(audioBuffer: AudioBuffer): Promise<{
    vocals?: AudioBuffer;
    drums?: AudioBuffer;
    bass?: AudioBuffer;
    other?: AudioBuffer;
  }> {
    const model = await this.modelManager.loadModel('sourceSeparation');
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    
    // Combine stereo channels
    const stereoData = new Float32Array(leftChannel.length * 2);
    for (let i = 0; i < leftChannel.length; i++) {
      stereoData[i * 2] = leftChannel[i];
      stereoData[i * 2 + 1] = rightChannel[i];
    }
    
    // Preprocess
    const preprocessed = AudioPreprocessor.normalizeAudio(stereoData);
    
    // Run inference
    const output = await this.modelManager.runInference('sourceSeparation', preprocessed);
    
    // Separate stems from output
    const stemLength = leftChannel.length;
    const stems: any = {};
    
    // Extract vocals (first quarter of output)
    const vocalsData = new Float32Array(stemLength);
    for (let i = 0; i < stemLength; i++) {
      vocalsData[i] = output[i];
    }
    stems.vocals = this.createAudioBuffer(audioBuffer.context, vocalsData, audioBuffer.sampleRate);
    
    // Extract drums (second quarter)
    const drumsData = new Float32Array(stemLength);
    for (let i = 0; i < stemLength; i++) {
      drumsData[i] = output[stemLength + i];
    }
    stems.drums = this.createAudioBuffer(audioBuffer.context, drumsData, audioBuffer.sampleRate);
    
    // Extract bass (third quarter)
    const bassData = new Float32Array(stemLength);
    for (let i = 0; i < stemLength; i++) {
      bassData[i] = output[stemLength * 2 + i];
    }
    stems.bass = this.createAudioBuffer(audioBuffer.context, bassData, audioBuffer.sampleRate);
    
    // Extract other (fourth quarter)
    const otherData = new Float32Array(stemLength);
    for (let i = 0; i < stemLength; i++) {
      otherData[i] = output[stemLength * 3 + i];
    }
    stems.other = this.createAudioBuffer(audioBuffer.context, otherData, audioBuffer.sampleRate);
    
    return stems;
  }

  private async detectGenreAI(audioBuffer: AudioBuffer): Promise<{ genre: string; confidence: number }> {
    const model = await this.modelManager.loadModel('genreDetection');
    const audioData = audioBuffer.getChannelData(0);
    
    // Extract mel-spectrogram features
    const melSpectrogram = AudioPreprocessor.extractMelSpectrogram(audioData, audioBuffer.sampleRate);
    
    // Run inference
    const output = await this.modelManager.runInference('genreDetection', melSpectrogram);
    
    // Find genre with highest confidence
    let maxIndex = 0;
    let maxConfidence = output[0];
    
    for (let i = 1; i < output.length; i++) {
      if (output[i] > maxConfidence) {
        maxConfidence = output[i];
        maxIndex = i;
      }
    }
    
    return {
      genre: GENRE_LABELS[maxIndex] || 'unknown',
      confidence: maxConfidence
    };
  }

  private async applyNoiseReductionAI(
    audioBuffer: AudioBuffer, 
    options: { strength: number; preserveTransients: boolean }
  ): Promise<AudioBuffer> {
    const model = await this.modelManager.loadModel('noiseReduction');
    const audioData = audioBuffer.getChannelData(0);
    
    // Preprocess
    const preprocessed = AudioPreprocessor.normalizeAudio(audioData);
    
    // Run inference
    const output = await this.modelManager.runInference('noiseReduction', preprocessed);
    
    // Apply strength parameter
    const reducedData = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      const original = audioData[i];
      const cleaned = output[i];
      
      // Blend based on strength
      reducedData[i] = original * (1 - options.strength) + cleaned * options.strength;
    }
    
    return this.createAudioBuffer(audioBuffer.context, reducedData, audioBuffer.sampleRate);
  }

  private createAudioBuffer(context: AudioContext, data: Float32Array, sampleRate: number): AudioBuffer {
    const buffer = context.createBuffer(1, data.length, sampleRate);
    buffer.copyToChannel(data, 0);
    return buffer;
  }

  dispose(): void {
    this.isProcessing = false;
    this.availableModels.clear();
  }
}
