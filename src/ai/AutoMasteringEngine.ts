interface MasteringProfile {
  id: string;
  name: string;
  genre: string;
  target: 'streaming' | 'cd' | 'vinyl' | 'broadcast' | 'custom';
  lufsTarget: number;
  peakLimit: number;
  dynamicRange: number;
  stereoWidth: number;
  tiltEq: number;
  settings: {
    eq: { freq: number; gain: number; q: number }[];
    compression: { threshold: number; ratio: number; attack: number; release: number };
    multiband: { bands: number; crossovers: number[] };
    limiting: { ceiling: number; lookahead: number; release: number };
    stereo: { width: number; correlation: number };
  };
}

interface AnalysisResult {
  loudness: { integrated: number; range: number; peak: number };
  spectrum: { tilt: number; balance: number; harshness: number };
  dynamics: { crest: number; punch: number; rms: number };
  stereo: { width: number; correlation: number; balance: number };
  issues: string[];
  recommendations: string[];
}

interface MasteringChain {
  id: string;
  name: string;
  processors: MasteringProcessor[];
  bypassed: boolean[];
  wetDryMix: number[];
}

interface MasteringProcessor {
  type: 'eq' | 'compressor' | 'multiband' | 'exciter' | 'stereo' | 'limiter';
  name: string;
  params: Record<string, number>;
  enabled: boolean;
}

export class AutoMasteringEngine {
  private profiles: Map<string, MasteringProfile> = new Map();
  private chains: Map<string, MasteringChain> = new Map();
  private audioContext: AudioContext;
  private analysisWorker: Worker | null = null;
  
  // Real-time processing nodes
  private inputNode: GainNode;
  private outputNode: GainNode;
  private processingChain: AudioNode[] = [];
  
  // Analysis
  private analyser: AnalyserNode;
  private meteringData = {
    lufs: -23,
    peak: -6,
    rms: -18,
    stereoWidth: 1.0
  };

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.setupAudioGraph();
    this.loadMasteringProfiles();
    this.initializeAnalysis();
  }

  private setupAudioGraph(): void {
    this.inputNode = this.audioContext.createGain();
    this.outputNode = this.audioContext.createGain();
    this.analyser = this.audioContext.createAnalyser();
    
    this.analyser.fftSize = 8192;
    this.analyser.smoothingTimeConstant = 0.8;
    
    // Initial connection
    this.inputNode.connect(this.outputNode);
    this.inputNode.connect(this.analyser);
  }

  private loadMasteringProfiles(): void {
    const profiles = [
      {
        id: 'streaming_pop',
        name: 'Pop/Rock Streaming',
        genre: 'pop',
        target: 'streaming' as const,
        lufsTarget: -14,
        peakLimit: -1,
        dynamicRange: 8,
        stereoWidth: 1.1,
        tiltEq: 0.5
      },
      {
        id: 'cd_master',
        name: 'CD Master',
        genre: 'general',
        target: 'cd' as const,
        lufsTarget: -16,
        peakLimit: -0.1,
        dynamicRange: 12,
        stereoWidth: 1.0,
        tiltEq: 0.0
      }
    ];

    profiles.forEach(profile => {
      const fullProfile: MasteringProfile = {
        ...profile,
        settings: this.generateProfileSettings(profile)
      };
      this.profiles.set(profile.id, fullProfile);
    });
  }

  private generateProfileSettings(profile: any): MasteringProfile['settings'] {
    return {
      eq: [
        { freq: 60, gain: 0, q: 1.0 },
        { freq: 200, gain: 0, q: 1.0 },
        { freq: 2000, gain: profile.tiltEq, q: 0.7 },
        { freq: 8000, gain: profile.tiltEq * 2, q: 1.0 }
      ],
      compression: {
        threshold: -12,
        ratio: 3.0,
        attack: 10,
        release: 100
      },
      multiband: {
        bands: 4,
        crossovers: [200, 1000, 5000]
      },
      limiting: {
        ceiling: profile.peakLimit,
        lookahead: 5,
        release: 50
      },
      stereo: {
        width: profile.stereoWidth,
        correlation: 0.8
      }
    };
  }

  private async initializeAnalysis(): Promise<void> {
    const workerCode = `
      class AudioAnalyzer {
        constructor() {
          this.sampleRate = 44100;
          this.blockSize = 4096;
        }
        
        analyzeAudio(samples, sampleRate) {
          return {
            loudness: this.analyzeLoudness(samples),
            spectrum: this.analyzeSpectrum(samples),
            dynamics: this.analyzeDynamics(samples),
            stereo: this.analyzeStereo(samples)
          };
        }
        
        analyzeLoudness(samples) {
          const rms = Math.sqrt(samples.reduce((sum, x) => sum + x*x, 0) / samples.length);
          const peak = Math.max(...samples.map(Math.abs));
          const lufs = 20 * Math.log10(rms) - 0.691;
          
          return { integrated: lufs, range: 10, peak: 20 * Math.log10(peak) };
        }
        
        analyzeSpectrum(samples) {
          return { tilt: 0, balance: 0, harshness: 0 };
        }
        
        analyzeDynamics(samples) {
          const rms = Math.sqrt(samples.reduce((sum, x) => sum + x*x, 0) / samples.length);
          const peak = Math.max(...samples.map(Math.abs));
          const crest = peak > 0 ? 20 * Math.log10(peak / rms) : 0;
          
          return { crest, punch: 0.5, rms: 20 * Math.log10(rms) };
        }
        
        analyzeStereo(samples) {
          return { width: 1.0, correlation: 0.8, balance: 0.0 };
        }
      }
      
      const analyzer = new AudioAnalyzer();
      
      onmessage = (event) => {
        const { samples, sampleRate } = event.data;
        const result = analyzer.analyzeAudio(samples, sampleRate);
        postMessage(result);
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.analysisWorker = new Worker(URL.createObjectURL(blob));
  }

  async analyzeAudio(audioBuffer: AudioBuffer): Promise<AnalysisResult> {
    const samples = audioBuffer.getChannelData(0);
    
    return new Promise((resolve) => {
      if (!this.analysisWorker) {
        resolve(this.fallbackAnalysis(samples));
        return;
      }
      
      this.analysisWorker.onmessage = (event) => {
        const analysis = event.data;
        resolve({
          ...analysis,
          issues: this.identifyIssues(analysis),
          recommendations: this.generateRecommendations(analysis)
        });
      };
      
      this.analysisWorker.postMessage({
        samples: Array.from(samples),
        sampleRate: audioBuffer.sampleRate
      });
    });
  }

  private fallbackAnalysis(samples: Float32Array): AnalysisResult {
    const rms = Math.sqrt(samples.reduce((sum, x) => sum + x*x, 0) / samples.length);
    const peak = Math.max(...samples.map(Math.abs));
    
    return {
      loudness: {
        integrated: 20 * Math.log10(rms) - 0.691,
        range: 10,
        peak: 20 * Math.log10(peak)
      },
      spectrum: { tilt: 0, balance: 0, harshness: 0 },
      dynamics: { crest: peak > 0 ? 20 * Math.log10(peak/rms) : 0, punch: 0.5, rms: 20 * Math.log10(rms) },
      stereo: { width: 1.0, correlation: 0.8, balance: 0.0 },
      issues: [],
      recommendations: []
    };
  }

  async autoMaster(audioBuffer: AudioBuffer, profileId: string): Promise<AudioBuffer> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    // Analyze input
    const analysis = await this.analyzeAudio(audioBuffer);
    
    // Generate optimal chain
    const chain = this.generateMasteringChain(analysis, profile);
    
    // Apply processing
    return this.processMasteringChain(audioBuffer, chain);
  }

  private generateMasteringChain(analysis: AnalysisResult, profile: MasteringProfile): MasteringChain {
    const processors: MasteringProcessor[] = [];
    
    // High-pass filter if needed
    if (analysis.spectrum.balance < -2) {
      processors.push({
        type: 'eq',
        name: 'High Pass',
        params: { type: 'highpass', freq: 30, q: 0.7, gain: 0 },
        enabled: true
      });
    }

    // Corrective EQ
    processors.push({
      type: 'eq',
      name: 'Corrective EQ',
      params: this.generateCorrectiveEQ(analysis, profile),
      enabled: true
    });

    // Compressor
    processors.push({
      type: 'compressor',
      name: 'Bus Compressor',
      params: {
        threshold: Math.max(-20, analysis.loudness.integrated - 6),
        ratio: profile.dynamicRange < 10 ? 4.0 : 2.0,
        attack: 10,
        release: 100,
        knee: 2
      },
      enabled: true
    });

    // Multiband compressor for complex material
    if (analysis.spectrum.harshness > 0.3) {
      processors.push({
        type: 'multiband',
        name: 'Multiband Compressor',
        params: profile.settings.multiband,
        enabled: true
      });
    }

    // Stereo enhancement
    if (Math.abs(profile.stereoWidth - analysis.stereo.width) > 0.1) {
      processors.push({
        type: 'stereo',
        name: 'Stereo Enhancer',
        params: {
          width: profile.stereoWidth,
          bass_mono: profile.stereoWidth > 1.2 ? 150 : 0
        },
        enabled: true
      });
    }

    // Final limiter
    processors.push({
      type: 'limiter',
      name: 'Brick Wall Limiter',
      params: {
        ceiling: profile.peakLimit,
        lookahead: 5,
        release: this.calculateLimiterRelease(analysis, profile)
      },
      enabled: true
    });

    return {
      id: `chain_${Date.now()}`,
      name: `Auto Chain - ${profile.name}`,
      processors,
      bypassed: new Array(processors.length).fill(false),
      wetDryMix: new Array(processors.length).fill(1.0)
    };
  }

  private generateCorrectiveEQ(analysis: AnalysisResult, profile: MasteringProfile): Record<string, any> {
    const bands = [];
    
    // Low end adjustment
    const lowEnd = analysis.spectrum.balance;
    if (Math.abs(lowEnd) > 1) {
      bands.push({
        freq: 100,
        gain: -lowEnd * 0.5,
        q: 1.0,
        type: 'shelf'
      });
    }
    
    // High end tilt
    const tiltGain = profile.tiltEq - analysis.spectrum.tilt;
    if (Math.abs(tiltGain) > 0.5) {
      bands.push({
        freq: 8000,
        gain: tiltGain,
        q: 0.7,
        type: 'shelf'
      });
    }
    
    return { bands };
  }

  private calculateLimiterRelease(analysis: AnalysisResult, profile: MasteringProfile): number {
    // Faster release for dynamic material, slower for dense material
    const dynamicFactor = Math.max(0.1, Math.min(1.0, analysis.dynamics.crest / 15));
    return 20 + (100 - 20) * (1 - dynamicFactor);
  }

  private async processMasteringChain(audioBuffer: AudioBuffer, chain: MasteringChain): Promise<AudioBuffer> {
    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    let currentNode: AudioNode = source;

    // Build processing chain
    for (let i = 0; i < chain.processors.length; i++) {
      if (!chain.bypassed[i]) {
        const processor = this.createProcessor(chain.processors[i], offlineContext);
        currentNode.connect(processor);
        currentNode = processor;
      }
    }

    currentNode.connect(offlineContext.destination);
    source.start();

    return offlineContext.startRendering();
  }

  private createProcessor(processor: MasteringProcessor, context: OfflineAudioContext): AudioNode {
    switch (processor.type) {
      case 'eq':
        return this.createEQProcessor(processor.params, context);
      case 'compressor':
        return this.createCompressorProcessor(processor.params, context);
      case 'limiter':
        return this.createLimiterProcessor(processor.params, context);
      default:
        return context.createGain();
    }
  }

  private createEQProcessor(params: any, context: OfflineAudioContext): BiquadFilterNode {
    const filter = context.createBiquadFilter();
    filter.type = params.type || 'peaking';
    filter.frequency.value = params.freq || 1000;
    filter.Q.value = params.q || 1.0;
    filter.gain.value = params.gain || 0;
    return filter;
  }

  private createCompressorProcessor(params: any, context: OfflineAudioContext): DynamicsCompressorNode {
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = params.threshold || -12;
    compressor.ratio.value = params.ratio || 3;
    compressor.attack.value = (params.attack || 10) / 1000;
    compressor.release.value = (params.release || 100) / 1000;
    compressor.knee.value = params.knee || 2;
    return compressor;
  }

  private createLimiterProcessor(params: any, context: OfflineAudioContext): GainNode {
    // Simplified limiter using gain node
    const limiter = context.createGain();
    limiter.gain.value = Math.pow(10, (params.ceiling || -1) / 20);
    return limiter;
  }

  private identifyIssues(analysis: AnalysisResult): string[] {
    const issues: string[] = [];
    
    if (analysis.loudness.integrated > -6) {
      issues.push('Audio is too loud - may cause distortion');
    }
    
    if (analysis.loudness.integrated < -30) {
      issues.push('Audio is too quiet - lacks impact');
    }
    
    if (analysis.dynamics.crest < 6) {
      issues.push('Low dynamic range - may sound compressed');
    }
    
    if (analysis.stereo.width < 0.5) {
      issues.push('Narrow stereo image - lacks spaciousness');
    }
    
    if (analysis.stereo.correlation < 0.3) {
      issues.push('Phase issues detected - may cause mono compatibility problems');
    }
    
    return issues;
  }

  private generateRecommendations(analysis: AnalysisResult): string[] {
    const recommendations: string[] = [];
    
    if (analysis.loudness.integrated < -16) {
      recommendations.push('Consider gentle compression to increase perceived loudness');
    }
    
    if (analysis.spectrum.harshness > 0.5) {
      recommendations.push('Apply de-essing or multiband compression in 2-5kHz range');
    }
    
    if (analysis.dynamics.crest > 20) {
      recommendations.push('Very dynamic material - use gentle limiting to control peaks');
    }
    
    return recommendations;
  }

  // Real-time monitoring
  startRealtimeMonitoring(): void {
    const updateMetering = () => {
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      this.analyser.getFloatFrequencyData(dataArray);
      
      // Calculate metering values
      this.meteringData.peak = Math.max(...dataArray);
      
      requestAnimationFrame(updateMetering);
    };
    
    updateMetering();
  }

  getMeteringData(): typeof this.meteringData {
    return { ...this.meteringData };
  }

  getInputNode(): AudioNode {
    return this.inputNode;
  }

  getOutputNode(): AudioNode {
    return this.outputNode;
  }

  dispose(): void {
    if (this.analysisWorker) {
      this.analysisWorker.terminate();
    }
    
    this.processingChain.forEach(node => {
      if ('disconnect' in node) {
        node.disconnect();
      }
    });
  }
}

export default AutoMasteringEngine;
