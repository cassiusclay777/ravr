/**
 * AI-Enhanced DSP Pipeline Integration
 * Connects AI models with existing DSP chain
 */

import { AudioContextManager } from '../audio/AudioContextManager';

export interface AiDspConfig {
  profile: 'NeutronAI' | 'IndustrialBeast' | 'AmbientSpace' | 'VocalWarmth' | 'Flat';
  audioSrStrength: number;
  demucsEnabled: boolean;
  ddspHarmonics: number;
  genreAdaptive: boolean;
  relativisticEnabled: boolean;
}

export class AiDspPipeline {
  private readonly context: AudioContext;
  private readonly inputNode: GainNode;
  private readonly outputNode: GainNode;

  // AI Processing Nodes (Web Audio Worklets)
  private audioSrNode?: AudioWorkletNode;
  private demucsNode?: AudioWorkletNode;
  private ddspNode?: AudioWorkletNode;
  private genreDetectorNode?: AudioWorkletNode;

  // Existing DSP Chain
  private readonly eqNode: BiquadFilterNode[];
  private readonly compressorNode: DynamicsCompressorNode;
  private readonly limiterNode: DynamicsCompressorNode;

  // Relativistic Effects
  private convolverNode?: ConvolverNode;
  private pannerNode?: PannerNode;
  private delayNode?: DelayNode;

  // Analysis
  private readonly analyzerNode: AnalyserNode;
  private readonly meterNode: AnalyserNode;

  private readonly config: AiDspConfig;
  private readonly isProcessing: boolean = false;

  constructor(contextManager: AudioContextManager) {
    this.context = contextManager.getContext();
    this.inputNode = this.context.createGain();
    this.outputNode = this.context.createGain();

    this.config = {
      profile: 'Flat',
      audioSrStrength: 0.8,
      demucsEnabled: false,
      ddspHarmonics: 0.6,
      genreAdaptive: true,
      relativisticEnabled: false,
    };

    // Initialize DSP nodes
    this.eqNode = this.createEQChain();
    this.compressorNode = this.createCompressor();
    this.limiterNode = this.createLimiter();
    this.analyzerNode = this.context.createAnalyser();
    this.meterNode = this.context.createAnalyser();

    // Load AI worklets (defer async initialization outside constructor call stack)
    queueMicrotask(() => {
      void this.initializeAINodes();
    });

    // Build initial chain
    this.rebuildChain();
  }

  private async initializeAINodes() {
    try {
      // Register AI worklet processors
      await this.context.audioWorklet.addModule('/worklets/audiosr-processor.js');
      await this.context.audioWorklet.addModule('/worklets/demucs-processor.js');
      await this.context.audioWorklet.addModule('/worklets/ddsp-processor.js');
      await this.context.audioWorklet.addModule('/worklets/genre-detector.js');

      // Create worklet nodes
      this.audioSrNode = new AudioWorkletNode(this.context, 'audiosr-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        processorOptions: {
          strength: this.config.audioSrStrength,
        },
      });

      this.demucsNode = new AudioWorkletNode(this.context, 'demucs-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 4, // drums, bass, other, vocals
        processorOptions: {
          profile: 'balanced',
        },
      });

      this.ddspNode = new AudioWorkletNode(this.context, 'ddsp-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        processorOptions: {
          harmonics: this.config.ddspHarmonics,
        },
      });

      this.genreDetectorNode = new AudioWorkletNode(this.context, 'genre-detector', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        processorOptions: {
          windowSize: 4096,
        },
      });

      // Listen for genre detection results
      this.genreDetectorNode.port.onmessage = (event) => {
        if (event.data.type === 'genre-detected') {
          this.applyGenreProfile(event.data.genre, event.data.confidence);
        }
      };
    } catch (error) {
      console.error('Failed to initialize AI nodes:', error);
      // Fallback to standard DSP chain
    }
  }

  private createEQChain(): BiquadFilterNode[] {
    const frequencies = [60, 150, 400, 1000, 2500, 6000, 12000];
    return frequencies.map((freq) => {
      const filter = this.context.createBiquadFilter();
      if (freq === 60) {
        filter.type = 'highshelf';
      } else if (freq === 12000) {
        filter.type = 'lowshelf';
      } else {
        filter.type = 'peaking';
      }
      filter.frequency.value = freq;
      filter.Q.value = 1;
      filter.gain.value = 0;
      return filter;
    });
  }

  private createCompressor(): DynamicsCompressorNode {
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.1;
    return compressor;
  }

  private createLimiter(): DynamicsCompressorNode {
    const limiter = this.context.createDynamicsCompressor();
    limiter.threshold.value = -0.3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.01;
    return limiter;
  }

  public setProfile(profile: AiDspConfig['profile']) {
    this.config.profile = profile;
    this.applyProfile();
    this.rebuildChain();
  }

  private applyProfile() {
    const profiles = {
      NeutronAI: {
        audioSrStrength: 0.8,
        demucsEnabled: false,
        ddspHarmonics: 0.6,
        eq: [2, 1, 0, 1, 2, 3, 2],
        compression: { threshold: -20, ratio: 3 },
      },
      IndustrialBeast: {
        audioSrStrength: 1.0,
        demucsEnabled: true,
        ddspHarmonics: 0.3,
        eq: [6, 3, -1, 0, 2, 4, 5],
        compression: { threshold: -15, ratio: 6 },
      },
      AmbientSpace: {
        audioSrStrength: 0.5,
        demucsEnabled: false,
        ddspHarmonics: 0.8,
        eq: [-2, 0, 1, 1, 2, 3, 4],
        compression: { threshold: -30, ratio: 2 },
      },
      VocalWarmth: {
        audioSrStrength: 0.7,
        demucsEnabled: true,
        ddspHarmonics: 0.4,
        eq: [1, 2, 3, 2, 1, 0, -1],
        compression: { threshold: -25, ratio: 2.5 },
      },
      Flat: {
        audioSrStrength: 0,
        demucsEnabled: false,
        ddspHarmonics: 0,
        eq: [0, 0, 0, 0, 0, 0, 0],
        compression: { threshold: -24, ratio: 3 },
      },
    };

    const settings = profiles[this.config.profile];

    // Update AI node parameters
    if (this.audioSrNode) {
      this.audioSrNode.parameters.get('strength')!.value = settings.audioSrStrength;
    }

    if (this.ddspNode) {
      this.ddspNode.parameters.get('harmonics')!.value = settings.ddspHarmonics;
    }

    // Update EQ
    settings.eq.forEach((gain, i) => {
      if (this.eqNode[i]) {
        this.eqNode[i].gain.setTargetAtTime(gain, this.context.currentTime, 0.1);
      }
    });

    // Update compressor
    this.compressorNode.threshold.setTargetAtTime(
      settings.compression.threshold,
      this.context.currentTime,
      0.1,
    );
    this.compressorNode.ratio.setTargetAtTime(
      settings.compression.ratio,
      this.context.currentTime,
      0.1,
    );
  }

  private applyGenreProfile(genre: string, confidence: number) {
    if (!this.config.genreAdaptive || confidence < 0.6) return;

    const genreProfiles: Record<string, Partial<AiDspConfig>> = {
      electronic: {
        audioSrStrength: 0.9,
        ddspHarmonics: 0.4,
      },
      ambient: {
        audioSrStrength: 0.5,
        ddspHarmonics: 0.8,
        relativisticEnabled: true,
      },
      rock: {
        audioSrStrength: 0.7,
        ddspHarmonics: 0.5,
      },
      jazz: {
        audioSrStrength: 0.6,
        ddspHarmonics: 0.6,
      },
      classical: {
        audioSrStrength: 0.4,
        ddspHarmonics: 0.7,
      },
    };

    const profile = genreProfiles[genre];
    if (profile) {
      Object.assign(this.config, profile);
      this.rebuildChain();
    }
  }

  private rebuildChain() {
    // Disconnect all nodes
    this.disconnectAll();

    let currentNode: AudioNode = this.inputNode;

    // AI Enhancement Stage
    if (this.config.profile !== 'Flat') {
      // Genre detection (parallel)
      if (this.genreDetectorNode && this.config.genreAdaptive) {
        currentNode.connect(this.genreDetectorNode);
      }

      // AudioSR
      if (this.audioSrNode && this.config.audioSrStrength > 0) {
        currentNode.connect(this.audioSrNode);
        currentNode = this.audioSrNode;
      }

      // Demucs separation and remix
      if (this.demucsNode && this.config.demucsEnabled) {
        currentNode.connect(this.demucsNode);
        // Mix stems back together with profile-specific weights
        const stemMixer = this.context.createGain();
        this.demucsNode.connect(stemMixer, 0); // drums
        this.demucsNode.connect(stemMixer, 1); // bass
        this.demucsNode.connect(stemMixer, 2); // other
        this.demucsNode.connect(stemMixer, 3); // vocals
        currentNode = stemMixer;
      }

      // DDSP harmonic enhancement
      if (this.ddspNode && this.config.ddspHarmonics > 0) {
        currentNode.connect(this.ddspNode);
        currentNode = this.ddspNode;
      }
    }

    // Traditional DSP Chain
    // EQ
    for (const eqNode of this.eqNode) {
      currentNode.connect(eqNode);
      currentNode = eqNode;
    }

    // Compression
    currentNode.connect(this.compressorNode);
    currentNode = this.compressorNode;

    // Relativistic Effects
    if (this.config.relativisticEnabled) {
      currentNode = this.applyRelativisticEffects(currentNode);
    }

    // Limiting
    currentNode.connect(this.limiterNode);
    currentNode = this.limiterNode;

    // Analysis (parallel)
    currentNode.connect(this.analyzerNode);
    currentNode.connect(this.meterNode);

    // Output
    currentNode.connect(this.outputNode);
  }

  private applyRelativisticEffects(input: AudioNode): AudioNode {
    // 3D Panner for spatial movement
    if (!this.pannerNode) {
      this.pannerNode = this.context.createPanner();
      this.pannerNode.panningModel = 'HRTF';
      this.pannerNode.distanceModel = 'inverse';
      this.pannerNode.refDistance = 1;
      this.pannerNode.maxDistance = 10000;
      this.pannerNode.rolloffFactor = 1;
      this.pannerNode.coneInnerAngle = 360;
      this.pannerNode.coneOuterAngle = 0;
      this.pannerNode.coneOuterGain = 0;
    }

    // Convolution reverb for space
    if (!this.convolverNode) {
      this.convolverNode = this.context.createConvolver();
      // Load impulse response
      this.loadImpulseResponse('/impulses/large_hall.wav');
    }

    // Delay for time effects
    if (!this.delayNode) {
      this.delayNode = this.context.createDelay(5);
      this.delayNode.delayTime.value = 0.1;
    }

    // Connect relativistic chain
    const wetGain = this.context.createGain();
    const dryGain = this.context.createGain();
    const outputMixer = this.context.createGain();

    wetGain.gain.value = 0.3;
    dryGain.gain.value = 0.7;

    // Dry path
    input.connect(dryGain);
    dryGain.connect(outputMixer);

    // Wet path with effects
    input.connect(this.pannerNode);
    this.pannerNode.connect(this.delayNode);
    this.delayNode.connect(this.convolverNode);
    this.convolverNode.connect(wetGain);
    wetGain.connect(outputMixer);

    // Animate panner position
    this.animateSpatialPosition();

    return outputMixer;
  }

  private animateSpatialPosition() {
    if (!this.pannerNode) return;

    const now = this.context.currentTime;
    const duration = 10; // 10 second cycle

    // Circular motion
    const radius = 2;
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * duration;
      const angle = (i / 100) * 2 * Math.PI;

      this.pannerNode.positionX.setValueAtTime(Math.cos(angle) * radius, now + t);
      this.pannerNode.positionZ.setValueAtTime(Math.sin(angle) * radius, now + t);
    }
  }

  private async loadImpulseResponse(url: string) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      if (this.convolverNode) {
        this.convolverNode.buffer = audioBuffer;
      }
    } catch (error) {
      console.error('Failed to load impulse response:', error);
    }
  }

  private disconnectAll() {
    // Disconnect all nodes to rebuild chain
    [
      this.inputNode,
      this.audioSrNode,
      this.demucsNode,
      this.ddspNode,
      this.genreDetectorNode,
      ...this.eqNode,
      this.compressorNode,
      this.limiterNode,
      this.pannerNode,
      this.convolverNode,
      this.delayNode,
      this.analyzerNode,
      this.meterNode,
    ].forEach((node) => {
      if (node) {
        try {
          node.disconnect();
        } catch (error) {
          // Node might not be connected - this is expected behavior
          console.debug('Node already disconnected:', error);
        }
      }
    });
  }

  public connect(destination: AudioNode) {
    this.outputNode.connect(destination);
  }

  public disconnect() {
    this.outputNode.disconnect();
  }

  public getInputNode(): AudioNode {
    return this.inputNode;
  }

  public getAnalyzerNode(): AnalyserNode {
    return this.analyzerNode;
  }

  public getMeterNode(): AnalyserNode {
    return this.meterNode;
  }

  public getMetrics() {
    const freqData = new Float32Array(this.analyzerNode.frequencyBinCount);
    this.analyzerNode.getFloatFrequencyData(freqData);

    // Calculate quality metrics
    const clarity = this.calculateClarity(freqData);
    const warmth = this.calculateWarmth(freqData);
    const dynamics = this.calculateDynamics();
    const spatial = this.config.relativisticEnabled ? 0.8 : 0.3;

    return { clarity, warmth, dynamics, spatial };
  }

  private calculateClarity(freqData: Float32Array): number {
    // High frequency content relative to total
    const highFreqStart = Math.floor(freqData.length * 0.6);
    let highEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < freqData.length; i++) {
      const magnitude = Math.pow(10, freqData[i] / 20);
      totalEnergy += magnitude;
      if (i >= highFreqStart) {
        highEnergy += magnitude;
      }
    }

    return highEnergy / totalEnergy;
  }

  private calculateWarmth(freqData: Float32Array): number {
    // Low-mid frequency richness
    const lowMidStart = Math.floor(freqData.length * 0.1);
    const lowMidEnd = Math.floor(freqData.length * 0.3);
    let warmthEnergy = 0;

    for (let i = lowMidStart; i < lowMidEnd; i++) {
      warmthEnergy += Math.pow(10, freqData[i] / 20);
    }

    return Math.min((warmthEnergy / (lowMidEnd - lowMidStart)) * 10, 1);
  }

  private calculateDynamics(): number {
    // Simplified dynamics calculation based on compressor reduction
    const reduction = this.compressorNode.reduction;
    return Math.max(0, 1 - Math.abs(reduction) / 20);
  }
}
