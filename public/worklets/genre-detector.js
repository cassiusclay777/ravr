/**
 * Genre Detection Worklet Processor
 * Analyzes audio features for genre classification
 */

class GenreDetectorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.windowSize = 4096;
    this.hopSize = 2048;
    this.fftBuffer = new Float32Array(this.windowSize);
    this.bufferIndex = 0;
    this.analysisCounter = 0;
    this.analysisInterval = 100; // Analyze every 100 frames
    
    // Feature accumulators
    this.spectralCentroid = 0;
    this.spectralRolloff = 0;
    this.zeroCrossingRate = 0;
    this.energy = 0;
    this.frameCount = 0;
  }

  static get parameterDescriptors() {
    return [{
      name: 'windowSize',
      defaultValue: 4096,
      minValue: 1024,
      maxValue: 8192,
      automationRate: 'k-rate'
    }];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || input.length === 0) {
      return true;
    }

    const inputChannel = input[0];
    
    // Pass through audio
    if (output && output[0]) {
      output[0].set(inputChannel);
    }

    // Accumulate samples for analysis
    for (let i = 0; i < inputChannel.length; i++) {
      this.fftBuffer[this.bufferIndex] = inputChannel[i];
      this.bufferIndex = (this.bufferIndex + 1) % this.windowSize;
      
      if (this.bufferIndex === 0) {
        this.analyzeWindow();
        this.analysisCounter++;
        
        if (this.analysisCounter >= this.analysisInterval) {
          this.classifyGenre();
          this.analysisCounter = 0;
          this.resetAccumulators();
        }
      }
    }

    return true;
  }

  analyzeWindow() {
    // Calculate spectral features
    const spectrum = this.computeFFT(this.fftBuffer);
    
    // Spectral centroid
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < spectrum.length / 2; i++) {
      const magnitude = Math.sqrt(spectrum[i * 2] ** 2 + spectrum[i * 2 + 1] ** 2);
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    
    this.spectralCentroid += magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    
    // Energy
    let energy = 0;
    for (let i = 0; i < this.fftBuffer.length; i++) {
      energy += this.fftBuffer[i] ** 2;
    }
    this.energy += energy / this.fftBuffer.length;
    
    // Zero crossing rate
    let crossings = 0;
    for (let i = 1; i < this.fftBuffer.length; i++) {
      if ((this.fftBuffer[i] >= 0) !== (this.fftBuffer[i - 1] >= 0)) {
        crossings++;
      }
    }
    this.zeroCrossingRate += crossings / this.fftBuffer.length;
    
    this.frameCount++;
  }

  computeFFT(buffer) {
    // Simplified FFT implementation (placeholder)
    // In a real implementation, you'd use a proper FFT library
    const spectrum = new Float32Array(buffer.length * 2);
    
    for (let k = 0; k < buffer.length; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < buffer.length; n++) {
        const angle = -2 * Math.PI * k * n / buffer.length;
        real += buffer[n] * Math.cos(angle);
        imag += buffer[n] * Math.sin(angle);
      }
      
      spectrum[k * 2] = real;
      spectrum[k * 2 + 1] = imag;
    }
    
    return spectrum;
  }

  classifyGenre() {
    if (this.frameCount === 0) return;
    
    // Average the accumulated features
    const avgSpectralCentroid = this.spectralCentroid / this.frameCount;
    const avgEnergy = this.energy / this.frameCount;
    const avgZCR = this.zeroCrossingRate / this.frameCount;
    
    // Simple genre classification heuristics
    let genre = 'unknown';
    let confidence = 0.5;
    
    if (avgSpectralCentroid > 0.6 && avgEnergy > 0.1) {
      if (avgZCR > 0.15) {
        genre = 'electronic';
        confidence = 0.8;
      } else {
        genre = 'rock';
        confidence = 0.7;
      }
    } else if (avgSpectralCentroid < 0.3 && avgEnergy < 0.05) {
      genre = 'ambient';
      confidence = 0.75;
    } else if (avgSpectralCentroid > 0.4 && avgSpectralCentroid < 0.7) {
      genre = 'jazz';
      confidence = 0.6;
    } else if (avgEnergy > 0.15) {
      genre = 'metal';
      confidence = 0.65;
    }
    
    // Send result to main thread
    this.port.postMessage({
      type: 'genre-detected',
      genre: genre,
      confidence: confidence,
      features: {
        spectralCentroid: avgSpectralCentroid,
        energy: avgEnergy,
        zeroCrossingRate: avgZCR
      }
    });
  }

  resetAccumulators() {
    this.spectralCentroid = 0;
    this.spectralRolloff = 0;
    this.zeroCrossingRate = 0;
    this.energy = 0;
    this.frameCount = 0;
  }
}

registerProcessor('genre-detector', GenreDetectorProcessor);
