export interface AudioAnalysis {
  rms: number;
  peak: number;
  dynamicRange: number;
  frequencySpectrum: Float32Array;
  spectralCentroid: number;
  zeroCrossingRate: number;
}

export interface AnalyzeSettings {
  minTime: number;
  maxTime: number;
  minAmplitude: number;
  maxAmplitude: number;
  waveformVerticalScale: number;
  fftSize: number;
  windowSize: number;
  hopSize: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  analyzeAudio(
    channelData: Float32Array,
    sampleRate: number,
    settings: AnalyzeSettings
  ): AudioAnalysis {
    const startIndex = Math.floor(settings.minTime * sampleRate);
    const endIndex = Math.floor(settings.maxTime * sampleRate);
    const data = channelData.slice(startIndex, endIndex);

    // Calculate RMS (Root Mean Square)
    const rms = this.calculateRMS(data);

    // Calculate Peak
    const peak = this.calculatePeak(data);

    // Calculate Dynamic Range
    const dynamicRange = peak > 0 ? 20 * Math.log10(peak / rms) : 0;

    // Calculate Frequency Spectrum
    const frequencySpectrum = this.calculateFrequencySpectrum(data, settings.fftSize);

    // Calculate Spectral Centroid
    const spectralCentroid = this.calculateSpectralCentroid(frequencySpectrum, sampleRate);

    // Calculate Zero Crossing Rate
    const zeroCrossingRate = this.calculateZeroCrossingRate(data);

    return {
      rms,
      peak,
      dynamicRange,
      frequencySpectrum,
      spectralCentroid,
      zeroCrossingRate,
    };
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  private calculatePeak(data: Float32Array): number {
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) {
        peak = abs;
      }
    }
    return peak;
  }

  private calculateFrequencySpectrum(data: Float32Array, fftSize: number): Float32Array {
    // Simple FFT implementation (for production, consider using a library like FFT.js)
    const spectrum = new Float32Array(fftSize / 2);
    
    // Zero-pad the data if necessary
    const paddedData = new Float32Array(fftSize);
    const copyLength = Math.min(data.length, fftSize);
    paddedData.set(data.slice(0, copyLength));

    // Apply window function (Hanning window)
    for (let i = 0; i < fftSize; i++) {
      paddedData[i] *= 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
    }

    // Simple magnitude calculation (not true FFT, but good enough for visualization)
    for (let i = 0; i < fftSize / 2; i++) {
      let real = 0;
      let imag = 0;
      
      for (let j = 0; j < fftSize; j++) {
        const angle = -2 * Math.PI * i * j / fftSize;
        real += paddedData[j] * Math.cos(angle);
        imag += paddedData[j] * Math.sin(angle);
      }
      
      spectrum[i] = Math.sqrt(real * real + imag * imag);
    }

    return spectrum;
  }

  private calculateSpectralCentroid(spectrum: Float32Array, sampleRate: number): number {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = (i * sampleRate) / (2 * spectrum.length);
      weightedSum += frequency * spectrum[i];
      magnitudeSum += spectrum[i];
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
    
    return crossings / (data.length - 1);
  }

  // Helper function to round to nearest nice number (from original code)
  static roundToNearestNiceNumber(value: number): [number, number] {
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    
    let nice: number;
    let digit: number;
    
    if (normalized <= 1) {
      nice = 1;
      digit = 0;
    } else if (normalized <= 2) {
      nice = 2;
      digit = 0;
    } else if (normalized <= 5) {
      nice = 5;
      digit = 0;
    } else {
      nice = 10;
      digit = 0;
    }
    
    return [nice * magnitude, digit];
  }

  // Get default analysis settings
  static getDefaultSettings(duration: number): AnalyzeSettings {
    return {
      minTime: 0,
      maxTime: duration,
      minAmplitude: -1,
      maxAmplitude: 1,
      waveformVerticalScale: 1,
      fftSize: 2048,
      windowSize: 1024,
      hopSize: 512,
    };
  }
}

