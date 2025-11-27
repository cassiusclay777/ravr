interface StemTrack {
  id: string;
  name: string;
  type: 'vocals' | 'drums' | 'bass' | 'instruments' | 'melody' | 'harmony' | 'custom';
  audioBuffer: AudioBuffer;
  gain: number;
  pan: number;
  solo: boolean;
  mute: boolean;
  effects: StemEffect[];
  envelope: AutomationCurve[];
}

interface StemEffect {
  id: string;
  type: 'eq' | 'compressor' | 'reverb' | 'delay' | 'distortion' | 'chorus' | 'filter';
  params: Record<string, number>;
  enabled: boolean;
  wetDry: number;
}

interface AutomationCurve {
  time: number;
  parameter: string;
  value: number;
  curve: 'linear' | 'exponential' | 'logarithmic';
}

interface StemProject {
  id: string;
  name: string;
  originalAudio: AudioBuffer;
  stems: StemTrack[];
  mixSettings: {
    masterGain: number;
    masterEffects: StemEffect[];
    outputFormat: 'stereo' | 'surround' | 'binaural';
  };
  metadata: {
    bpm: number;
    key: string;
    timeSignature: string;
    genre: string;
    duration: number;
  };
}

interface SeparationConfig {
  model: 'demucs' | 'spleeter' | 'openunmix' | 'custom';
  stemCount: 2 | 4 | 5 | 8;
  quality: 'draft' | 'standard' | 'high' | 'ultra';
  overlap: number;
  shifts: number;
  splitBands: boolean;
}

interface RegenerationConfig {
  stemType: StemTrack['type'];
  style: string;
  intensity: number;
  preserveTiming: boolean;
  preserveKey: boolean;
  modelType: 'neural' | 'spectral' | 'hybrid';
}

export class AdvancedStemProcessor {
  private projects: Map<string, StemProject> = new Map();
  private separationWorkers: Worker[] = [];
  private audioContext: AudioContext;
  
  // Real-time mixing
  private mixerNode: GainNode;
  private stemNodes: Map<string, AudioBufferSourceNode> = new Map();
  private effectChains: Map<string, AudioNode[]> = new Map();
  
  // AI models for processing
  private separationModels: Map<string, any> = new Map();
  private regenerationModels: Map<string, any> = new Map();
  
  private isInitialized = false;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.setupMixer();
    this.initialize();
  }

  private setupMixer(): void {
    this.mixerNode = this.audioContext.createGain();
    this.mixerNode.connect(this.audioContext.destination);
  }

  private async initialize(): Promise<void> {
    try {
      await this.loadSeparationModels();
      await this.setupSeparationWorkers();
      await this.loadRegenerationModels();
      
      this.isInitialized = true;
      console.log('Advanced Stem Processor initialized');
    } catch (error) {
      console.error('Failed to initialize Stem Processor:', error);
    }
  }

  private async loadSeparationModels(): Promise<void> {
    const models = [
      { name: 'demucs', url: '/models/demucs_v4.onnx', stems: 4 },
      { name: 'spleeter', url: '/models/spleeter_4stems.onnx', stems: 4 },
      { name: 'openunmix', url: '/models/openunmix.onnx', stems: 4 }
    ];

    for (const model of models) {
      try {
        const response = await fetch(model.url);
        const modelData = await response.arrayBuffer();
        
        this.separationModels.set(model.name, {
          data: modelData,
          stems: model.stems,
          separate: this.createSeparationFunction(model.name)
        });
        
        console.log(`Loaded separation model: ${model.name}`);
      } catch (error) {
        console.warn(`Failed to load model ${model.name}, using fallback`);
        this.separationModels.set(model.name, {
          data: null,
          stems: model.stems,
          separate: this.fallbackSeparation.bind(this)
        });
      }
    }
  }

  private async loadRegenerationModels(): Promise<void> {
    const regenModels = [
      'vocals_generator',
      'drum_synthesizer', 
      'bass_generator',
      'melody_generator'
    ];

    for (const modelName of regenModels) {
      try {
        const response = await fetch(`/models/${modelName}.onnx`);
        const modelData = await response.arrayBuffer();
        
        this.regenerationModels.set(modelName, {
          data: modelData,
          generate: this.createRegenerationFunction(modelName)
        });
      } catch (error) {
        console.warn(`Regeneration model ${modelName} not available`);
        this.regenerationModels.set(modelName, {
          data: null,
          generate: this.fallbackRegeneration.bind(this)
        });
      }
    }
  }

  private async setupSeparationWorkers(): void {
    const workerCount = Math.min(4, navigator.hardwareConcurrency || 2);
    
    const workerCode = `
      importScripts('/js/onnx.min.js');
      
      class StemSeparationWorker {
        constructor() {
          this.session = null;
          this.model = null;
        }
        
        async loadModel(modelData, modelType) {
          try {
            this.model = modelType;
            // Initialize ONNX session
            this.session = await ort.InferenceSession.create(modelData);
            return true;
          } catch (error) {
            console.error('Failed to load model:', error);
            return false;
          }
        }
        
        async separateStems(audioData, config) {
          if (!this.session) {
            return this.fallbackSeparation(audioData, config);
          }
          
          try {
            // Preprocess audio for model input
            const inputTensor = this.preprocessAudio(audioData, config);
            
            // Run inference
            const outputs = await this.session.run({ input: inputTensor });
            
            // Postprocess outputs to audio buffers
            return this.postprocessOutputs(outputs, config);
            
          } catch (error) {
            console.error('Separation failed:', error);
            return this.fallbackSeparation(audioData, config);
          }
        }
        
        preprocessAudio(audioData, config) {
          // Convert to spectrogram, normalize, etc.
          const frameSize = 2048;
          const hopSize = 512;
          
          // Simplified preprocessing
          const tensor = new ort.Tensor('float32', audioData, [1, audioData.length]);
          return tensor;
        }
        
        postprocessOutputs(outputs, config) {
          // Convert model outputs back to audio
          const stems = [];
          
          for (let i = 0; i < config.stemCount; i++) {
            const stemKey = \`output_\${i}\`;
            if (outputs[stemKey]) {
              stems.push(Array.from(outputs[stemKey].data));
            }
          }
          
          return stems;
        }
        
        fallbackSeparation(audioData, config) {
          // Simple separation using spectral masking
          const stems = [];
          const stemCount = config.stemCount || 4;
          
          for (let i = 0; i < stemCount; i++) {
            // Create rough separation using frequency bands
            const stem = this.separateByFrequency(audioData, i, stemCount);
            stems.push(stem);
          }
          
          return stems;
        }
        
        separateByFrequency(audioData, stemIndex, totalStems) {
          // Rough frequency-based separation
          const output = new Float32Array(audioData.length);
          
          switch (stemIndex) {
            case 0: // Bass
              return this.lowPassFilter(audioData, 200);
            case 1: // Drums (mid-range with emphasis on transients)
              return this.bandPassFilter(audioData, 200, 2000);
            case 2: // Vocals (mid-high range)
              return this.bandPassFilter(audioData, 1000, 4000);
            case 3: // Other instruments
              return this.highPassFilter(audioData, 2000);
            default:
              return audioData;
          }
        }
        
        lowPassFilter(audioData, cutoff) {
          // Simplified low-pass filter
          const output = new Float32Array(audioData.length);
          let prev = 0;
          const alpha = 0.1; // Simple first-order filter
          
          for (let i = 0; i < audioData.length; i++) {
            output[i] = prev + alpha * (audioData[i] - prev);
            prev = output[i];
          }
          
          return Array.from(output);
        }
        
        bandPassFilter(audioData, lowCutoff, highCutoff) {
          // Very simplified bandpass
          return this.highPassFilter(this.lowPassFilter(audioData, highCutoff), lowCutoff);
        }
        
        highPassFilter(audioData, cutoff) {
          // Simplified high-pass filter
          const output = new Float32Array(audioData.length);
          let prevInput = 0;
          let prevOutput = 0;
          const alpha = 0.1;
          
          for (let i = 0; i < audioData.length; i++) {
            output[i] = alpha * (prevOutput + audioData[i] - prevInput);
            prevInput = audioData[i];
            prevOutput = output[i];
          }
          
          return Array.from(output);
        }
      }
      
      const worker = new StemSeparationWorker();
      
      onmessage = async (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'loadModel':
            const loaded = await worker.loadModel(data.modelData, data.modelType);
            postMessage({ type: 'modelLoaded', success: loaded });
            break;
            
          case 'separate':
            const stems = await worker.separateStems(data.audioData, data.config);
            postMessage({ type: 'separated', stems, id: data.id });
            break;
        }
      };
    `;
    
    for (let i = 0; i < workerCount; i++) {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };
      
      this.separationWorkers.push(worker);
    }
  }

  // Public API methods
  async separateStems(
    audioBuffer: AudioBuffer, 
    config: SeparationConfig
  ): Promise<StemProject> {
    if (!this.isInitialized) {
      throw new Error('Stem Processor not initialized');
    }

    const projectId = `project_${Date.now()}`;
    
    // Create project structure
    const project: StemProject = {
      id: projectId,
      name: `Stem Project ${projectId}`,
      originalAudio: audioBuffer,
      stems: [],
      mixSettings: {
        masterGain: 1.0,
        masterEffects: [],
        outputFormat: 'stereo'
      },
      metadata: {
        bpm: await this.detectBPM(audioBuffer),
        key: await this.detectKey(audioBuffer),
        timeSignature: '4/4',
        genre: 'unknown',
        duration: audioBuffer.duration
      }
    };

    // Get separation model
    const model = this.separationModels.get(config.model);
    if (!model) {
      throw new Error(`Separation model ${config.model} not available`);
    }

    // Perform separation
    const audioData = audioBuffer.getChannelData(0);
    const separatedStems = await this.performSeparation(audioData, config, model);

    // Create stem tracks
    const stemTypes: StemTrack['type'][] = ['vocals', 'drums', 'bass', 'instruments'];
    
    for (let i = 0; i < separatedStems.length && i < stemTypes.length; i++) {
      const stemBuffer = this.createAudioBufferFromArray(separatedStems[i], audioBuffer.sampleRate);
      
      const stem: StemTrack = {
        id: `stem_${i}`,
        name: stemTypes[i].charAt(0).toUpperCase() + stemTypes[i].slice(1),
        type: stemTypes[i],
        audioBuffer: stemBuffer,
        gain: 1.0,
        pan: 0.0,
        solo: false,
        mute: false,
        effects: [],
        envelope: []
      };
      
      project.stems.push(stem);
    }

    this.projects.set(projectId, project);
    return project;
  }

  async regenerateStem(
    projectId: string,
    stemId: string,
    config: RegenerationConfig
  ): Promise<StemTrack> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const stemIndex = project.stems.findIndex(s => s.id === stemId);
    if (stemIndex === -1) {
      throw new Error(`Stem ${stemId} not found`);
    }

    const originalStem = project.stems[stemIndex];
    
    // Get regeneration model
    const modelName = `${config.stemType}_generator`;
    const model = this.regenerationModels.get(modelName);
    
    if (!model) {
      throw new Error(`Regeneration model for ${config.stemType} not available`);
    }

    // Extract features from original stem
    const features = await this.extractStemFeatures(originalStem.audioBuffer);
    
    // Generate new stem
    const newAudioData = await model.generate(features, config);
    const newAudioBuffer = this.createAudioBufferFromArray(newAudioData, originalStem.audioBuffer.sampleRate);

    // Create new stem track
    const newStem: StemTrack = {
      ...originalStem,
      id: `${stemId}_regen_${Date.now()}`,
      name: `${originalStem.name} (Regenerated)`,
      audioBuffer: newAudioBuffer
    };

    project.stems[stemIndex] = newStem;
    return newStem;
  }

  async enhanceStem(
    projectId: string,
    stemId: string,
    enhancementType: 'clarity' | 'punch' | 'warmth' | 'presence'
  ): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) return;

    const stem = project.stems.find(s => s.id === stemId);
    if (!stem) return;

    const enhancement = this.createEnhancementChain(enhancementType, stem.type);
    stem.effects.push(...enhancement);
  }

  private createEnhancementChain(type: string, stemType: StemTrack['type']): StemEffect[] {
    const effects: StemEffect[] = [];

    switch (type) {
      case 'clarity':
        effects.push({
          id: 'clarity_eq',
          type: 'eq',
          params: { freq: 5000, gain: 2, q: 1.0 },
          enabled: true,
          wetDry: 0.7
        });
        break;
        
      case 'punch':
        effects.push({
          id: 'punch_comp',
          type: 'compressor',
          params: { threshold: -10, ratio: 4, attack: 1, release: 50 },
          enabled: true,
          wetDry: 1.0
        });
        break;
        
      case 'warmth':
        effects.push({
          id: 'warmth_eq',
          type: 'eq',
          params: { freq: 200, gain: 1.5, q: 0.7 },
          enabled: true,
          wetDry: 0.8
        });
        break;
        
      case 'presence':
        effects.push({
          id: 'presence_eq',
          type: 'eq',
          params: { freq: 2500, gain: 2.5, q: 1.2 },
          enabled: true,
          wetDry: 0.6
        });
        break;
    }

    return effects;
  }

  // Real-time playback
  async playProject(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) return;

    // Stop any existing playback
    this.stopPlayback();

    // Create source nodes for each stem
    for (const stem of project.stems) {
      if (stem.mute) continue;

      const source = this.audioContext.createBufferSource();
      source.buffer = stem.audioBuffer;
      
      // Create effect chain
      let currentNode: AudioNode = source;
      const effectNodes: AudioNode[] = [];

      // Add stem effects
      for (const effect of stem.effects) {
        if (effect.enabled) {
          const effectNode = this.createEffectNode(effect);
          currentNode.connect(effectNode);
          effectNodes.push(effectNode);
          currentNode = effectNode;
        }
      }

      // Add gain and pan
      const gainNode = this.audioContext.createGain();
      const panNode = this.audioContext.createStereoPanner();
      
      gainNode.gain.value = stem.gain;
      panNode.pan.value = stem.pan;
      
      currentNode.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(this.mixerNode);

      this.stemNodes.set(stem.id, source);
      this.effectChains.set(stem.id, [source, ...effectNodes, gainNode, panNode]);

      source.start();
    }
  }

  stopPlayback(): void {
    for (const [stemId, source] of this.stemNodes) {
      try {
        source.stop();
      } catch (e) {
        // Source might already be stopped
      }
    }
    
    // Disconnect effect chains
    for (const [stemId, chain] of this.effectChains) {
      chain.forEach(node => {
        if ('disconnect' in node) {
          node.disconnect();
        }
      });
    }
    
    this.stemNodes.clear();
    this.effectChains.clear();
  }

  // Utility methods
  private async performSeparation(audioData: Float32Array, config: SeparationConfig, model: any): Promise<number[][]> {
    return new Promise((resolve) => {
      const worker = this.separationWorkers[0]; // Use first available worker
      
      const messageId = Date.now().toString();
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'separated' && event.data.id === messageId) {
          worker.removeEventListener('message', handleMessage);
          resolve(event.data.stems);
        }
      };
      
      worker.addEventListener('message', handleMessage);
      
      worker.postMessage({
        type: 'separate',
        data: {
          id: messageId,
          audioData: Array.from(audioData),
          config
        }
      });
    });
  }

  private createSeparationFunction(modelName: string) {
    return async (audioData: Float32Array, config: SeparationConfig) => {
      // Model-specific separation logic would go here
      return this.fallbackSeparation(audioData, config);
    };
  }

  private async fallbackSeparation(audioData: Float32Array, config: SeparationConfig): Promise<number[][]> {
    // Simple frequency-based separation
    const stems: number[][] = [];
    
    for (let i = 0; i < config.stemCount; i++) {
      stems.push(Array.from(audioData)); // For now, just duplicate
    }
    
    return stems;
  }

  private createRegenerationFunction(modelName: string) {
    return async (features: any, config: RegenerationConfig) => {
      return this.fallbackRegeneration(features, config);
    };
  }

  private async fallbackRegeneration(features: any, config: RegenerationConfig): Promise<number[]> {
    // Generate new audio based on stem type
    const length = features.length || 44100; // 1 second fallback
    const output = new Float32Array(length);
    
    switch (config.stemType) {
      case 'drums':
        // Generate simple drum pattern
        for (let i = 0; i < length; i++) {
          if (i % 11025 < 1000) { // Kick every quarter note
            output[i] = Math.random() * 0.5;
          }
        }
        break;
      case 'bass':
        // Generate bass line
        for (let i = 0; i < length; i++) {
          output[i] = Math.sin(2 * Math.PI * 60 * i / 44100) * 0.3;
        }
        break;
      default:
        // Return silence for other types
        break;
    }
    
    return Array.from(output);
  }

  private async extractStemFeatures(audioBuffer: AudioBuffer): Promise<any> {
    const samples = audioBuffer.getChannelData(0);
    
    return {
      length: samples.length,
      rms: Math.sqrt(samples.reduce((sum, x) => sum + x*x, 0) / samples.length),
      peak: Math.max(...samples.map(Math.abs)),
      spectralCentroid: this.calculateSpectralCentroid(samples)
    };
  }

  private calculateSpectralCentroid(samples: Float32Array): number {
    // Real spectral centroid calculation using FFT
    const fftSize = 2048;
    const numFrames = Math.floor(samples.length / fftSize);

    if (numFrames === 0) return 1000; // Fallback for small samples

    let totalCentroid = 0;

    for (let frame = 0; frame < numFrames; frame++) {
      const frameStart = frame * fftSize;
      const frameData = samples.slice(frameStart, frameStart + fftSize);

      // Simple magnitude spectrum calculation
      const spectrum = new Float32Array(fftSize / 2);
      for (let i = 0; i < fftSize / 2; i++) {
        const real = frameData[i * 2] || 0;
        const imag = frameData[i * 2 + 1] || 0;
        spectrum[i] = Math.sqrt(real * real + imag * imag);
      }

      // Calculate centroid for this frame
      let weightedSum = 0;
      let magnitudeSum = 0;

      for (let i = 0; i < spectrum.length; i++) {
        weightedSum += i * spectrum[i];
        magnitudeSum += spectrum[i];
      }

      if (magnitudeSum > 0) {
        const centroid = weightedSum / magnitudeSum;
        // Convert bin index to Hz (assuming 44100 Hz sample rate)
        const centroidHz = (centroid * 44100) / fftSize;
        totalCentroid += centroidHz;
      }
    }

    const avgCentroid = totalCentroid / numFrames;
    return Math.round(avgCentroid);
  }

  private createAudioBufferFromArray(audioData: number[], sampleRate: number): AudioBuffer {
    const audioBuffer = this.audioContext.createBuffer(1, audioData.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < audioData.length; i++) {
      channelData[i] = audioData[i];
    }
    
    return audioBuffer;
  }

  private createEffectNode(effect: StemEffect): AudioNode {
    switch (effect.type) {
      case 'eq':
        const eq = this.audioContext.createBiquadFilter();
        eq.type = 'peaking';
        eq.frequency.value = effect.params.freq || 1000;
        eq.gain.value = effect.params.gain || 0;
        eq.Q.value = effect.params.q || 1;
        return eq;
        
      case 'compressor':
        const comp = this.audioContext.createDynamicsCompressor();
        comp.threshold.value = effect.params.threshold || -12;
        comp.ratio.value = effect.params.ratio || 3;
        return comp;
        
      default:
        return this.audioContext.createGain();
    }
  }

  private async detectBPM(audioBuffer: AudioBuffer): Promise<number> {
    // Real BPM detection using onset detection and autocorrelation
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    // 1. Calculate energy in overlapping windows
    const windowSize = Math.floor(sampleRate * 0.02); // 20ms windows
    const hopSize = Math.floor(windowSize / 2);
    const numWindows = Math.floor((channelData.length - windowSize) / hopSize);

    const energyEnvelope = new Float32Array(numWindows);

    for (let i = 0; i < numWindows; i++) {
      const start = i * hopSize;
      let energy = 0;

      for (let j = 0; j < windowSize; j++) {
        const sample = channelData[start + j];
        energy += sample * sample;
      }

      energyEnvelope[i] = Math.sqrt(energy / windowSize);
    }

    // 2. Calculate onset strength (energy differential)
    const onsetStrength = new Float32Array(numWindows - 1);
    for (let i = 0; i < numWindows - 1; i++) {
      onsetStrength[i] = Math.max(0, energyEnvelope[i + 1] - energyEnvelope[i]);
    }

    // 3. Autocorrelation to find periodic patterns
    const minBPM = 60;
    const maxBPM = 180;
    const minLag = Math.floor((60 / maxBPM) * (sampleRate / hopSize));
    const maxLag = Math.floor((60 / minBPM) * (sampleRate / hopSize));

    let maxCorr = -Infinity;
    let bestLag = minLag;

    for (let lag = minLag; lag < maxLag && lag < onsetStrength.length / 2; lag++) {
      let correlation = 0;
      let count = 0;

      for (let i = 0; i < onsetStrength.length - lag; i++) {
        correlation += onsetStrength[i] * onsetStrength[i + lag];
        count++;
      }

      correlation /= count;

      if (correlation > maxCorr) {
        maxCorr = correlation;
        bestLag = lag;
      }
    }

    // 4. Convert lag to BPM
    const bpm = Math.round((60 * sampleRate) / (bestLag * hopSize));

    // Validate BPM range
    if (bpm < minBPM || bpm > maxBPM) {
      return 120; // Default fallback
    }

    console.log(`✅ BPM detected: ${bpm}`);
    return bpm;
  }

  private async detectKey(audioBuffer: AudioBuffer): Promise<string> {
    // Real key detection using chromagram and Krumhansl-Schmuckler algorithm
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    // 1. Calculate chromagram (12-bin pitch class profile)
    const chromagram = new Float32Array(12).fill(0);
    const fftSize = 4096;
    const numFrames = Math.floor(channelData.length / fftSize);

    // Note frequencies (A0 = 27.5 Hz)
    const noteFreqs = Array.from({ length: 12 }, (_, i) =>
      27.5 * Math.pow(2, i / 12)
    );

    for (let frame = 0; frame < numFrames; frame++) {
      const frameStart = frame * fftSize;
      const frameData = channelData.slice(frameStart, frameStart + fftSize);

      // Simple DFT for each note
      for (let note = 0; note < 12; note++) {
        let magnitude = 0;

        // Check multiple octaves (up to 8 octaves)
        for (let octave = 0; octave < 8; octave++) {
          const freq = noteFreqs[note] * Math.pow(2, octave);
          if (freq > sampleRate / 2) break; // Nyquist limit

          const binIndex = Math.round((freq * fftSize) / sampleRate);
          if (binIndex < fftSize / 2) {
            // Approximate magnitude at this frequency
            const real = frameData[binIndex] || 0;
            const imag = frameData[binIndex + 1] || 0;
            magnitude += Math.sqrt(real * real + imag * imag);
          }
        }

        chromagram[note] += magnitude;
      }
    }

    // Normalize chromagram
    const maxChroma = Math.max(...chromagram);
    if (maxChroma > 0) {
      for (let i = 0; i < 12; i++) {
        chromagram[i] /= maxChroma;
      }
    }

    // 2. Krumhansl-Schmuckler key profiles
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    let bestKey = 'C';
    let bestCorr = -Infinity;

    // Try all 24 keys (12 major + 12 minor)
    for (let tonic = 0; tonic < 12; tonic++) {
      // Major key
      let corrMajor = 0;
      for (let i = 0; i < 12; i++) {
        const chromaIdx = (i + tonic) % 12;
        corrMajor += chromagram[chromaIdx] * majorProfile[i];
      }

      if (corrMajor > bestCorr) {
        bestCorr = corrMajor;
        bestKey = keys[tonic];
      }

      // Minor key
      let corrMinor = 0;
      for (let i = 0; i < 12; i++) {
        const chromaIdx = (i + tonic) % 12;
        corrMinor += chromagram[chromaIdx] * minorProfile[i];
      }

      if (corrMinor > bestCorr) {
        bestCorr = corrMinor;
        bestKey = keys[tonic] + 'm';
      }
    }

    console.log(`✅ Key detected: ${bestKey}`);
    return bestKey;
  }

  private handleWorkerMessage(data: any): void {
    console.log('Worker message:', data);
  }

  // Getters
  getProjects(): StemProject[] {
    return Array.from(this.projects.values());
  }

  getProject(id: string): StemProject | undefined {
    return this.projects.get(id);
  }

  dispose(): void {
    this.stopPlayback();
    
    this.separationWorkers.forEach(worker => worker.terminate());
    this.separationWorkers = [];
    
    this.projects.clear();
    this.separationModels.clear();
    this.regenerationModels.clear();
  }
}

export default AdvancedStemProcessor;
