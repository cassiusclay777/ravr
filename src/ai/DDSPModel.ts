import { ONNXModelManager, ModelConfig } from './ONNXModelManager';

export interface DDSPParameters {
  f0: Float32Array;          // Fundamental frequency
  loudness: Float32Array;     // Loudness contour
  harmonics: Float32Array;    // Harmonic amplitudes
  noise: Float32Array;        // Noise component
}

export interface DDSPOptions {
  hopSize: number;
  frameRate: number;
  nHarmonics: number;
  nNoise: number;
  synthModel: 'additive' | 'subtractive' | 'wavetable';
}

export class DDSPModel {
  private onnxManager: ONNXModelManager;
  private encoderModelName = 'ddsp-encoder';
  private decoderModelName = 'ddsp-decoder';
  private isInitialized = false;
  private audioContext: AudioContext;

  constructor(onnxManager: ONNXModelManager) {
    this.onnxManager = onnxManager;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Encoder model configuration
    const encoderConfig: ModelConfig = {
      name: this.encoderModelName,
      url: '/models/ddsp/encoder.onnx',
      inputShape: [1, 64000], // [batch, samples] - ~1.5 seconds at 44.1kHz
      outputShape: [1, 1000, 65], // [batch, frames, features] - f0 + loudness + harmonics
      inputType: 'float32',
      outputType: 'float32',
      preprocessing: this.preprocessForEncoder.bind(this),
      postprocessing: this.postprocessEncoder.bind(this)
    };

    // Decoder model configuration
    const decoderConfig: ModelConfig = {
      name: this.decoderModelName,
      url: '/models/ddsp/decoder.onnx',
      inputShape: [1, 1000, 65], // [batch, frames, features]
      outputShape: [1, 64000], // [batch, samples]
      inputType: 'float32',
      outputType: 'float32',
      preprocessing: this.preprocessForDecoder.bind(this),
      postprocessing: this.postprocessDecoder.bind(this)
    };

    this.onnxManager.registerModel(encoderConfig);
    this.onnxManager.registerModel(decoderConfig);
    
    try {
      await Promise.all([
        this.onnxManager.loadModel(this.encoderModelName),
        this.onnxManager.loadModel(this.decoderModelName)
      ]);
      this.isInitialized = true;
      console.log('DDSP models initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DDSP models:', error);
      this.isInitialized = false;
    }
  }

  async synthesize(
    parameters: DDSPParameters,
    options: Partial<DDSPOptions> = {}
  ): Promise<AudioBuffer> {
    const opts: DDSPOptions = {
      hopSize: 64,
      frameRate: 250,
      nHarmonics: 60,
      nNoise: 5,
      synthModel: 'additive',
      ...options
    };

    if (!this.isInitialized) {
      console.warn('DDSP models not available, using basic synthesis');
      return this.basicSynthesis(parameters, opts);
    }

    try {
      return await this.synthesizeWithONNX(parameters, opts);
    } catch (error) {
      console.error('DDSP synthesis failed, falling back to basic synthesis:', error);
      return this.basicSynthesis(parameters, opts);
    }
  }

  async analyzeAndResynthesize(
    audioBuffer: AudioBuffer,
    options: Partial<DDSPOptions> = {}
  ): Promise<{ 
    resynthesized: AudioBuffer;
    parameters: DDSPParameters;
  }> {
    if (!this.isInitialized) {
      throw new Error('DDSP models not initialized');
    }

    // Extract audio parameters using encoder
    const parameters = await this.extractParameters(audioBuffer);
    
    // Resynthesize audio using decoder
    const resynthesized = await this.synthesizeWithONNX(parameters, options);

    return { resynthesized, parameters };
  }

  async modifyTimbre(
    audioBuffer: AudioBuffer,
    modifications: {
      f0Scale?: number;
      loudnessScale?: number;
      harmonicShift?: number;
      noiseLevel?: number;
    }
  ): Promise<AudioBuffer> {
    const { parameters } = await this.analyzeAndResynthesize(audioBuffer);

    // Apply modifications
    const modifiedParams = this.applyParameterModifications(parameters, modifications);

    // Resynthesize with modified parameters
    return this.synthesize(modifiedParams);
  }

  private async extractParameters(audioBuffer: AudioBuffer): Promise<DDSPParameters> {
    const monoBuffer = this.convertToMono(audioBuffer);
    const audioData = this.onnxManager.prepareAudioInput(monoBuffer, 44100);

    // Process in chunks
    const chunkSize = 64000;
    const chunks = this.onnxManager.chunkAudio(audioData, chunkSize, 6400);
    
    let allF0: number[] = [];
    let allLoudness: number[] = [];
    let allHarmonics: number[] = [];
    let allNoise: number[] = [];

    for (const chunk of chunks) {
      const encoded = await this.onnxManager.runInference(
        this.encoderModelName,
        chunk,
        'audio'
      );

      const { f0, loudness, harmonics, noise } = this.parseEncoderOutput(encoded);
      allF0.push(...Array.from(f0));
      allLoudness.push(...Array.from(loudness));
      allHarmonics.push(...Array.from(harmonics));
      allNoise.push(...Array.from(noise));
    }

    return {
      f0: new Float32Array(allF0),
      loudness: new Float32Array(allLoudness),
      harmonics: new Float32Array(allHarmonics),
      noise: new Float32Array(allNoise)
    };
  }

  private async synthesizeWithONNX(
    parameters: DDSPParameters,
    options: DDSPOptions
  ): Promise<AudioBuffer> {
    // Prepare parameters for decoder
    const decoderInput = this.prepareDecoderInput(parameters);
    
    // Process in chunks
    const frameChunkSize = 1000;
    const chunks = this.chunkParameters(decoderInput, frameChunkSize);
    
    const synthesizedChunks: Float32Array[] = [];

    for (const chunk of chunks) {
      const synthesized = await this.onnxManager.runInference(
        this.decoderModelName,
        chunk,
        'parameters'
      );
      synthesizedChunks.push(synthesized);
    }

    // Concatenate chunks
    const totalLength = synthesizedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const fullAudio = new Float32Array(totalLength);
    let offset = 0;

    for (const chunk of synthesizedChunks) {
      fullAudio.set(chunk, offset);
      offset += chunk.length;
    }

    // Create audio buffer
    const sampleRate = 44100; // DDSP typically works at 44.1kHz
    const buffer = this.audioContext.createBuffer(1, fullAudio.length, sampleRate);
    buffer.copyToChannel(fullAudio, 0);

    return buffer;
  }

  private basicSynthesis(
    parameters: DDSPParameters,
    options: DDSPOptions
  ): AudioBuffer {
    const sampleRate = 44100;
    const hopSize = options.hopSize;
    const frameRate = options.frameRate;
    
    const framesCount = parameters.f0.length;
    const samplesPerFrame = Math.floor(sampleRate / frameRate);
    const totalSamples = framesCount * samplesPerFrame;
    
    const output = new Float32Array(totalSamples);
    
    let phase = 0;
    
    for (let frame = 0; frame < framesCount; frame++) {
      const f0 = parameters.f0[frame];
      const loudness = parameters.loudness[frame];
      const frameStart = frame * samplesPerFrame;
      
      if (f0 > 0 && loudness > -60) { // Only synthesize if fundamental exists
        // Generate harmonic content
        for (let sample = 0; sample < samplesPerFrame; sample++) {
          const sampleIdx = frameStart + sample;
          if (sampleIdx >= totalSamples) break;
          
          let harmonicSum = 0;
          
          // Generate harmonics
          for (let harmonic = 1; harmonic <= options.nHarmonics; harmonic++) {
            const freq = f0 * harmonic;
            if (freq > sampleRate / 2) break;
            
            const harmonicAmp = this.getHarmonicAmplitude(
              parameters.harmonics,
              frame,
              harmonic,
              options.nHarmonics
            );
            
            harmonicSum += harmonicAmp * Math.sin(phase * harmonic);
          }
          
          // Add noise component
          const noiseAmp = this.getNoiseAmplitude(parameters.noise, frame);
          const noise = (Math.random() - 0.5) * noiseAmp;
          
          // Combine and apply loudness
          const amplitude = Math.pow(10, loudness / 20);
          output[sampleIdx] = (harmonicSum + noise) * amplitude;
          
          // Update phase
          phase += 2 * Math.PI * f0 / sampleRate;
          if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
        }
      }
    }
    
    // Apply smoothing window to reduce clicks
    this.applySmoothingWindow(output, samplesPerFrame);
    
    const buffer = this.audioContext.createBuffer(1, totalSamples, sampleRate);
    buffer.copyToChannel(output, 0);
    
    return buffer;
  }

  private getHarmonicAmplitude(
    harmonics: Float32Array,
    frame: number,
    harmonicIdx: number,
    nHarmonics: number
  ): number {
    const harmonicsPerFrame = nHarmonics;
    const startIdx = frame * harmonicsPerFrame;
    const harmonicDataIdx = startIdx + harmonicIdx - 1;
    
    return harmonicDataIdx < harmonics.length ? harmonics[harmonicDataIdx] : 0;
  }

  private getNoiseAmplitude(noise: Float32Array, frame: number): number {
    return frame < noise.length ? noise[frame] : 0;
  }

  private applySmoothingWindow(audio: Float32Array, windowSize: number): void {
    const windowFunc = (n: number, N: number) => 
      0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1)); // Hamming window
    
    for (let i = 0; i < audio.length; i += windowSize) {
      const end = Math.min(i + windowSize, audio.length);
      const actualWindowSize = end - i;
      
      for (let j = 0; j < actualWindowSize; j++) {
        const window = windowFunc(j, actualWindowSize);
        audio[i + j] *= window;
      }
    }
  }

  private convertToMono(audioBuffer: AudioBuffer): AudioBuffer {
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer;
    }

    const monoBuffer = this.audioContext.createBuffer(
      1,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const monoData = new Float32Array(audioBuffer.length);
    
    for (let i = 0; i < audioBuffer.length; i++) {
      let sum = 0;
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        sum += audioBuffer.getChannelData(channel)[i];
      }
      monoData[i] = sum / audioBuffer.numberOfChannels;
    }

    monoBuffer.copyToChannel(monoData, 0);
    return monoBuffer;
  }

  private parseEncoderOutput(encoded: Float32Array): {
    f0: Float32Array;
    loudness: Float32Array;
    harmonics: Float32Array;
    noise: Float32Array;
  } {
    // Encoder output format: [f0, loudness, 60 harmonics, 3 noise bands]
    const framesCount = encoded.length / 65;
    const f0 = new Float32Array(framesCount);
    const loudness = new Float32Array(framesCount);
    const harmonics = new Float32Array(framesCount * 60);
    const noise = new Float32Array(framesCount * 3);

    for (let frame = 0; frame < framesCount; frame++) {
      const frameOffset = frame * 65;
      
      f0[frame] = encoded[frameOffset];
      loudness[frame] = encoded[frameOffset + 1];
      
      for (let h = 0; h < 60; h++) {
        harmonics[frame * 60 + h] = encoded[frameOffset + 2 + h];
      }
      
      for (let n = 0; n < 3; n++) {
        noise[frame * 3 + n] = encoded[frameOffset + 62 + n];
      }
    }

    return { f0, loudness, harmonics, noise };
  }

  private prepareDecoderInput(parameters: DDSPParameters): Float32Array {
    const framesCount = parameters.f0.length;
    const input = new Float32Array(framesCount * 65);

    for (let frame = 0; frame < framesCount; frame++) {
      const frameOffset = frame * 65;
      
      input[frameOffset] = parameters.f0[frame];
      input[frameOffset + 1] = parameters.loudness[frame];
      
      // Harmonics (60 values)
      for (let h = 0; h < 60; h++) {
        const harmonicIdx = frame * 60 + h;
        input[frameOffset + 2 + h] = harmonicIdx < parameters.harmonics.length ? 
          parameters.harmonics[harmonicIdx] : 0;
      }
      
      // Noise (3 values)
      for (let n = 0; n < 3; n++) {
        const noiseIdx = frame * 3 + n;
        input[frameOffset + 62 + n] = noiseIdx < parameters.noise.length ? 
          parameters.noise[noiseIdx] : 0;
      }
    }

    return input;
  }

  private chunkParameters(data: Float32Array, framesPerChunk: number): Float32Array[] {
    const chunks: Float32Array[] = [];
    const featuresPerFrame = 65;
    const totalFrames = data.length / featuresPerFrame;

    for (let frame = 0; frame < totalFrames; frame += framesPerChunk) {
      const endFrame = Math.min(frame + framesPerChunk, totalFrames);
      const chunkSize = (endFrame - frame) * featuresPerFrame;
      const chunk = new Float32Array(chunkSize);
      
      chunk.set(data.subarray(frame * featuresPerFrame, endFrame * featuresPerFrame));
      chunks.push(chunk);
    }

    return chunks;
  }

  private applyParameterModifications(
    parameters: DDSPParameters,
    modifications: {
      f0Scale?: number;
      loudnessScale?: number;
      harmonicShift?: number;
      noiseLevel?: number;
    }
  ): DDSPParameters {
    const modified: DDSPParameters = {
      f0: new Float32Array(parameters.f0),
      loudness: new Float32Array(parameters.loudness),
      harmonics: new Float32Array(parameters.harmonics),
      noise: new Float32Array(parameters.noise)
    };

    // Apply f0 scaling (pitch shift)
    if (modifications.f0Scale !== undefined) {
      for (let i = 0; i < modified.f0.length; i++) {
        modified.f0[i] *= modifications.f0Scale;
      }
    }

    // Apply loudness scaling
    if (modifications.loudnessScale !== undefined) {
      for (let i = 0; i < modified.loudness.length; i++) {
        modified.loudness[i] *= modifications.loudnessScale;
      }
    }

    // Apply harmonic shifting
    if (modifications.harmonicShift !== undefined) {
      const shift = Math.floor(modifications.harmonicShift);
      if (shift !== 0) {
        const shiftedHarmonics = new Float32Array(modified.harmonics.length);
        const harmonicsPerFrame = 60;
        
        for (let frame = 0; frame < modified.harmonics.length / harmonicsPerFrame; frame++) {
          const frameStart = frame * harmonicsPerFrame;
          
          for (let h = 0; h < harmonicsPerFrame; h++) {
            const newIdx = h + shift;
            if (newIdx >= 0 && newIdx < harmonicsPerFrame) {
              shiftedHarmonics[frameStart + newIdx] = modified.harmonics[frameStart + h];
            }
          }
        }
        
        modified.harmonics = shiftedHarmonics;
      }
    }

    // Apply noise level modification
    if (modifications.noiseLevel !== undefined) {
      for (let i = 0; i < modified.noise.length; i++) {
        modified.noise[i] *= modifications.noiseLevel;
      }
    }

    return modified;
  }

  // Preprocessing and postprocessing methods
  private preprocessForEncoder(input: Float32Array): Float32Array {
    return this.onnxManager.normalizeAudio(input);
  }

  private postprocessEncoder(output: Float32Array): Float32Array {
    return output; // No postprocessing needed for encoder
  }

  private preprocessForDecoder(input: Float32Array): Float32Array {
    return input; // Parameters don't need normalization
  }

  private postprocessDecoder(output: Float32Array): Float32Array {
    // Apply soft limiting to synthesized audio
    const processed = new Float32Array(output.length);
    for (let i = 0; i < output.length; i++) {
      processed[i] = Math.tanh(output[i]);
    }
    return processed;
  }

  async getModelInfo(): Promise<{
    loaded: boolean;
    capabilities: string[];
    parameters: string[];
  }> {
    return {
      loaded: this.isInitialized,
      capabilities: [
        'Harmonic Synthesis',
        'Timbre Transfer',
        'Parameter Extraction',
        'Real-time Resynthesis'
      ],
      parameters: ['f0', 'loudness', 'harmonics', 'noise']
    };
  }

  dispose(): void {
    if (this.isInitialized) {
      this.onnxManager.unloadModel(this.encoderModelName);
      this.onnxManager.unloadModel(this.decoderModelName);
      this.isInitialized = false;
    }
  }
}
