import { ModelConfig } from "../ONNXModelManager";

// Pre-trained models for audio enhancement
export const AUDIO_MODELS: Record<string, ModelConfig> = {
  // Noise reduction model
  noiseReduction: {
    name: "noiseReduction",
    url: "/models/noise_reduction.onnx",
    inputShape: [1, 1, 1024], // [batch, channels, samples]
    outputShape: [1, 1, 1024],
    inputType: "float32",
    outputType: "float32",
    preprocessing: (input: Float32Array) => {
      // Normalize to [-1, 1] range
      const max = Math.max(...input.map(Math.abs));
      return max > 0 ? input.map((x) => x / max) : input;
    },
    postprocessing: (output: Float32Array) => {
      // Ensure output is in valid range
      return output.map((x) => Math.max(-1, Math.min(1, x)));
    },
  },

  // Source separation model
  sourceSeparation: {
    name: "sourceSeparation",
    url: "/models/source_separation.onnx",
    inputShape: [1, 2, 4096], // [batch, channels, samples]
    outputShape: [1, 8, 4096], // [batch, stems, samples]
    inputType: "float32",
    outputType: "float32",
    preprocessing: (input: Float32Array) => {
      // Normalize stereo input
      const normalized = input.slice();
      for (let i = 0; i < normalized.length; i += 2) {
        const left = normalized[i];
        const right = normalized[i + 1];
        const max = Math.max(Math.abs(left), Math.abs(right));
        if (max > 0) {
          normalized[i] = left / max;
          normalized[i + 1] = right / max;
        }
      }
      return normalized;
    },
    postprocessing: (output: Float32Array) => {
      // Apply softmax to stem outputs
      const stems = output.length / 4; // 4 stems: vocals, drums, bass, other
      const result = new Float32Array(output.length);

      for (let i = 0; i < stems; i++) {
        const start = i * 4;
        const end = start + 4;
        const stemData = output.slice(start, end);

        // Normalize each stem
        const max = Math.max(...stemData.map(Math.abs));
        if (max > 0) {
          for (let j = start; j < end; j++) {
            result[j] = output[j] / max;
          }
        }
      }

      return result;
    },
  },

  // Genre detection model
  genreDetection: {
    name: "genreDetection",
    url: "/models/genre_detection.onnx",
    inputShape: [1, 1, 2048], // [batch, channels, mel-spectrogram]
    outputShape: [1, 10], // [batch, genres]
    inputType: "float32",
    outputType: "float32",
    preprocessing: (input: Float32Array) => {
      // Convert to mel-spectrogram features
      return this.extractMelSpectrogram(input);
    },
    postprocessing: (output: Float32Array) => {
      // Apply softmax to get probabilities
      const exp = output.map((x) => Math.exp(x));
      const sum = exp.reduce((a, b) => a + b, 0);
      return exp.map((x) => x / sum);
    },
  },

  // Super resolution model
  superResolution: {
    name: "superResolution",
    url: "/models/super_resolution.onnx",
    inputShape: [1, 1, 2048], // [batch, channels, samples]
    outputShape: [1, 1, 4096], // [batch, channels, upsampled_samples]
    inputType: "float32",
    outputType: "float32",
    preprocessing: (input: Float32Array) => {
      // Normalize input
      const max = Math.max(...input.map(Math.abs));
      return max > 0 ? input.map((x) => x / max) : input;
    },
    postprocessing: (output: Float32Array) => {
      // Ensure output quality
      return output.map((x) => Math.max(-1, Math.min(1, x)));
    },
  },

  // Harmonic enhancement model
  harmonicEnhancement: {
    name: "harmonicEnhancement",
    url: "/models/harmonic_enhancement.onnx",
    inputShape: [1, 1, 1024],
    outputShape: [1, 1, 1024],
    inputType: "float32",
    outputType: "float32",
    preprocessing: (input: Float32Array) => {
      // Extract harmonic features
      return this.extractHarmonicFeatures(input);
    },
    postprocessing: (output: Float32Array) => {
      // Enhance harmonics while preserving transients
      return output.map((x) => Math.max(-1, Math.min(1, x)));
    },
  },
};

// Genre labels for classification
export const GENRE_LABELS = [
  "rock",
  "pop",
  "jazz",
  "classical",
  "electronic",
  "hip-hop",
  "country",
  "blues",
  "reggae",
  "folk",
];

// Helper functions for audio preprocessing
export class AudioPreprocessor {
  static extractMelSpectrogram(
    audio: Float32Array,
    sampleRate: number = 44100
  ): Float32Array {
    // Simplified mel-spectrogram extraction
    const frameSize = 2048;
    const hopSize = 512;
    const nFrames = Math.floor((audio.length - frameSize) / hopSize) + 1;
    const melBins = 128;

    const melSpectrogram = new Float32Array(nFrames * melBins);

    for (let i = 0; i < nFrames; i++) {
      const start = i * hopSize;
      const frame = audio.slice(start, start + frameSize);

      // Apply window function (Hanning)
      const windowed = frame.map(
        (sample, idx) =>
          sample * (0.5 - 0.5 * Math.cos((2 * Math.PI * idx) / (frameSize - 1)))
      );

      // Simple FFT approximation for mel-spectrogram
      for (let bin = 0; bin < melBins; bin++) {
        let magnitude = 0;
        for (let k = 0; k < frameSize; k++) {
          magnitude +=
            windowed[k] * Math.cos((2 * Math.PI * k * bin) / frameSize);
        }
        melSpectrogram[i * melBins + bin] = Math.abs(magnitude);
      }
    }

    return melSpectrogram;
  }

  static extractHarmonicFeatures(audio: Float32Array): Float32Array {
    // Extract harmonic content using autocorrelation
    const frameSize = 1024;
    const hopSize = 256;
    const nFrames = Math.floor((audio.length - frameSize) / hopSize) + 1;
    const features = new Float32Array(nFrames * 64); // 64 harmonic features

    for (let i = 0; i < nFrames; i++) {
      const start = i * hopSize;
      const frame = audio.slice(start, start + frameSize);

      // Calculate autocorrelation for fundamental frequency detection
      const autocorr = new Float32Array(frameSize);
      for (let lag = 0; lag < frameSize; lag++) {
        let sum = 0;
        for (let j = 0; j < frameSize - lag; j++) {
          sum += frame[j] * frame[j + lag];
        }
        autocorr[lag] = sum;
      }

      // Extract harmonic features
      for (let h = 1; h <= 64; h++) {
        const harmonicIndex = Math.floor(frameSize / (h * 2));
        features[i * 64 + h - 1] =
          harmonicIndex < frameSize ? autocorr[harmonicIndex] : 0;
      }
    }

    return features;
  }

  static normalizeAudio(
    audio: Float32Array,
    targetRMS: number = 0.1
  ): Float32Array {
    // Calculate current RMS
    const rms = Math.sqrt(
      audio.reduce((sum, sample) => sum + sample * sample, 0) / audio.length
    );

    if (rms === 0) return audio;

    // Normalize to target RMS
    const gain = targetRMS / rms;
    return audio.map((sample) => Math.max(-1, Math.min(1, sample * gain)));
  }

  static applyHighPassFilter(
    audio: Float32Array,
    cutoffFreq: number,
    sampleRate: number
  ): Float32Array {
    // Simple high-pass filter implementation
    const rc = 1 / (2 * Math.PI * cutoffFreq);
    const dt = 1 / sampleRate;
    const alpha = rc / (rc + dt);

    const filtered = new Float32Array(audio.length);
    filtered[0] = audio[0];

    for (let i = 1; i < audio.length; i++) {
      filtered[i] = alpha * (filtered[i - 1] + audio[i] - audio[i - 1]);
    }

    return filtered;
  }
}
