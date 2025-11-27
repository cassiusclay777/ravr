interface AudioFeatures {
  spectralCentroid: number;
  zeroCrossingRate: number;
  mfcc: number[];
  tempo: number;
  dynamicRange: number;
  rms: number;
  spectralRolloff: number;
}

interface EnhancementSuggestions {
  eq: { low: number; mid: number; high: number };
  compressor: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    knee: number;
    makeupGain: number;
  };
  stereoWidth: number;
  confidence: number;
  genre: string;
}

export class SmartAudioEnhancer {
  private audioContext: AudioContext;
  private analyzerNode: AnalyserNode;

  constructor(context: AudioContext) {
    this.audioContext = context;
    this.analyzerNode = context.createAnalyser();
    this.analyzerNode.fftSize = 8192;
  }

  async analyzeAndEnhance(audioBuffer: AudioBuffer): Promise<EnhancementSuggestions> {
    const features = this.extractAudioFeatures(audioBuffer);
    const genre = this.classifyGenre(features);
    const suggestions = this.generateEnhancementSuggestions(genre, features);
    
    return suggestions;
  }

  private extractAudioFeatures(buffer: AudioBuffer): AudioFeatures {
    const channelData = buffer.getChannelData(0);
    const spectralCentroid = this.calculateSpectralCentroid(channelData);
    const zeroCrossingRate = this.calculateZeroCrossingRate(channelData);
    const tempo = this.detectTempo(channelData);
    const dynamicRange = this.calculateDynamicRange(channelData);

    return {
      spectralCentroid,
      zeroCrossingRate,
      mfcc: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      tempo,
      dynamicRange,
      rms: this.calculateRMS(channelData),
      spectralRolloff: this.calculateSpectralRolloff(channelData)
    };
  }

  private calculateSpectralCentroid(data: Float32Array): number {
    const fftSize = 1024;
    const fft = new Float32Array(fftSize);
    for (let i = 0; i < Math.min(fftSize, data.length); i++) {
      fft[i] = data[i];
    }
    
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < fftSize / 2; i++) {
      const magnitude = Math.abs(fft[i]);
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateZeroCrossingRate(data: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0) !== (data[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / data.length;
  }

  private detectTempo(data: Float32Array): number {
    const sampleRate = this.audioContext.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms window
    let maxEnergy = 0;
    let beatCount = 0;
    
    for (let i = 0; i < data.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += data[i + j] * data[i + j];
      }
      
      if (energy > maxEnergy * 0.6) {
        beatCount++;
        maxEnergy = Math.max(maxEnergy, energy);
      }
    }
    
    const duration = data.length / sampleRate;
    return beatCount > 0 ? (beatCount / duration) * 60 : 120;
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  private calculateDynamicRange(data: Float32Array): number {
    let min = Infinity;
    let max = -Infinity;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    
    return max - min;
  }

  private calculateSpectralRolloff(data: Float32Array): number {
    const windowSize = 1024;
    let totalEnergy = 0;
    const magnitudes: number[] = [];
    
    for (let i = 0; i < Math.min(windowSize, data.length); i++) {
      const magnitude = Math.abs(data[i]);
      magnitudes.push(magnitude);
      totalEnergy += magnitude;
    }
    
    const threshold = totalEnergy * 0.85;
    let cumulativeEnergy = 0;
    
    for (let i = 0; i < magnitudes.length; i++) {
      cumulativeEnergy += magnitudes[i];
      if (cumulativeEnergy >= threshold) {
        return i / magnitudes.length;
      }
    }
    
    return 1.0;
  }

  private classifyGenre(features: AudioFeatures): string {
    if (features.tempo > 140 && features.spectralCentroid > 0.6) {
      return 'electronic';
    } else if (features.tempo < 90 && features.dynamicRange > 0.5) {
      return 'classical';
    } else if (features.zeroCrossingRate > 0.1 && features.tempo > 120) {
      return 'rock';
    } else if (features.spectralRolloff < 0.3) {
      return 'jazz';
    } else if (features.tempo > 100 && features.tempo < 140) {
      return 'pop';
    }
    return 'unknown';
  }

  private generateEnhancementSuggestions(genre: string, features: AudioFeatures): EnhancementSuggestions {
    const suggestions: EnhancementSuggestions = {
      eq: { low: 0, mid: 0, high: 0 },
      compressor: {
        threshold: -18,
        ratio: 4,
        attack: 0.001,
        release: 0.1,
        knee: 6,
        makeupGain: 0
      },
      stereoWidth: 1.0,
      confidence: 0.8,
      genre
    };

    switch (genre.toLowerCase()) {
      case 'electronic':
        suggestions.eq = { low: 2, mid: -1, high: 3 };
        suggestions.compressor.threshold = -12;
        suggestions.compressor.ratio = 6;
        suggestions.stereoWidth = 1.2;
        break;
      
      case 'rock':
        suggestions.eq = { low: 1, mid: 2, high: 1 };
        suggestions.compressor.threshold = -15;
        suggestions.compressor.ratio = 4;
        suggestions.stereoWidth = 1.1;
        break;
      
      case 'classical':
        suggestions.eq = { low: 0, mid: 1, high: 2 };
        suggestions.compressor.threshold = -24;
        suggestions.compressor.ratio = 2;
        suggestions.stereoWidth = 1.3;
        break;
      
      case 'jazz':
        suggestions.eq = { low: 1, mid: 0, high: 1 };
        suggestions.compressor.threshold = -20;
        suggestions.compressor.ratio = 3;
        suggestions.stereoWidth = 1.2;
        break;
      
      case 'pop':
        suggestions.eq = { low: 1, mid: 1, high: 2 };
        suggestions.compressor.threshold = -16;
        suggestions.compressor.ratio = 4;
        suggestions.stereoWidth = 1.0;
        break;
    }

    // Dynamic adjustments based on features
    if (features.dynamicRange < 0.2) {
      suggestions.compressor.ratio = Math.max(2, suggestions.compressor.ratio - 1);
    }
    
    if (features.rms < 0.1) {
      suggestions.compressor.makeupGain = 3;
    }

    return suggestions;
  }
}
