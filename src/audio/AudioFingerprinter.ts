export class AudioFingerprinter {
  private audioContext: AudioContext;

  constructor(context: AudioContext) {
    this.audioContext = context;
  }

  async generateFingerprint(audioBuffer: AudioBuffer): Promise<AudioFingerprint> {
    const features = this.extractFeatures(audioBuffer);
    const hash = this.generateHash(features);
    const peaks = this.findSpectralPeaks(audioBuffer);
    
    return {
      hash,
      duration: audioBuffer.duration,
      peaks,
      features,
      timestamp: Date.now()
    };
  }

  private extractFeatures(buffer: AudioBuffer): FeatureVector {
    const channelData = buffer.getChannelData(0);
    const windowSize = 2048;
    const hopSize = 1024;
    const features: number[] = [];
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      const spectrum = this.computeSpectrum(window);
      const chromaVector = this.computeChroma(spectrum);
      features.push(...chromaVector);
    }
    
    return { vector: features, length: features.length };
  }

  private computeSpectrum(window: Float32Array): Float32Array {
    const fft = new Float32Array(window.length * 2);
    
    for (let k = 0; k < window.length; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < window.length; n++) {
        const angle = -2 * Math.PI * k * n / window.length;
        real += window[n] * Math.cos(angle);
        imag += window[n] * Math.sin(angle);
      }
      fft[k * 2] = real;
      fft[k * 2 + 1] = imag;
    }
    
    return fft;
  }

  private computeChroma(spectrum: Float32Array): number[] {
    const chroma = new Array(12).fill(0);
    const sampleRate = this.audioContext.sampleRate;
    
    for (let i = 0; i < spectrum.length / 2; i++) {
      const magnitude = Math.sqrt(spectrum[i * 2] ** 2 + spectrum[i * 2 + 1] ** 2);
      const frequency = (i * sampleRate) / spectrum.length;
      
      if (frequency > 80 && frequency < 5000) {
        const pitch = 12 * Math.log2(frequency / 440) + 69;
        const chromaIndex = Math.round(pitch) % 12;
        if (chromaIndex >= 0 && chromaIndex < 12) {
          chroma[chromaIndex] += magnitude;
        }
      }
    }
    
    // Normalize
    const sum = chroma.reduce((a, b) => a + b, 0);
    return sum > 0 ? chroma.map(x => x / sum) : chroma;
  }

  private findSpectralPeaks(buffer: AudioBuffer): SpectralPeak[] {
    const channelData = buffer.getChannelData(0);
    const windowSize = 4096;
    const peaks: SpectralPeak[] = [];
    
    for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
      const window = channelData.slice(i, i + windowSize);
      const spectrum = this.computeSpectrum(window);
      const windowPeaks = this.findPeaksInSpectrum(spectrum, i / buffer.sampleRate);
      peaks.push(...windowPeaks);
    }
    
    return peaks.sort((a, b) => b.magnitude - a.magnitude).slice(0, 100);
  }

  private findPeaksInSpectrum(spectrum: Float32Array, timeOffset: number): SpectralPeak[] {
    const peaks: SpectralPeak[] = [];
    const sampleRate = this.audioContext.sampleRate;
    
    for (let i = 2; i < spectrum.length / 2 - 2; i++) {
      const magnitude = Math.sqrt(spectrum[i * 2] ** 2 + spectrum[i * 2 + 1] ** 2);
      const prevMag = Math.sqrt(spectrum[(i-1) * 2] ** 2 + spectrum[(i-1) * 2 + 1] ** 2);
      const nextMag = Math.sqrt(spectrum[(i+1) * 2] ** 2 + spectrum[(i+1) * 2 + 1] ** 2);
      
      if (magnitude > prevMag && magnitude > nextMag && magnitude > 0.01) {
        const frequency = (i * sampleRate) / spectrum.length;
        peaks.push({
          frequency,
          magnitude,
          time: timeOffset,
          bin: i
        });
      }
    }
    
    return peaks;
  }

  private generateHash(features: FeatureVector): string {
    let hash = 0;
    const str = features.vector.map(x => Math.round(x * 1000)).join(',');
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  async identifyTrack(fingerprint: AudioFingerprint): Promise<TrackIdentification | null> {
    // Mock identification - in real app would query database
    const mockDatabase = [
      { hash: fingerprint.hash.substring(0, 6), title: 'Unknown Track', artist: 'Unknown Artist' },
      { hash: 'abc123', title: 'Sample Song', artist: 'Test Artist' },
      { hash: 'def456', title: 'Demo Track', artist: 'Demo Artist' }
    ];
    
    const match = mockDatabase.find(track => 
      fingerprint.hash.startsWith(track.hash) || track.hash.startsWith(fingerprint.hash.substring(0, 6))
    );
    
    if (match) {
      return {
        title: match.title,
        artist: match.artist,
        confidence: 0.85,
        matchedHash: match.hash
      };
    }
    
    return null;
  }
}

interface AudioFingerprint {
  hash: string;
  duration: number;
  peaks: SpectralPeak[];
  features: FeatureVector;
  timestamp: number;
}

interface FeatureVector {
  vector: number[];
  length: number;
}

interface SpectralPeak {
  frequency: number;
  magnitude: number;
  time: number;
  bin: number;
}

interface TrackIdentification {
  title: string;
  artist: string;
  confidence: number;
  matchedHash: string;
}
