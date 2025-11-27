import { InferenceSession, Tensor } from 'onnxruntime-web';

export class ONNXManager {
  private session: InferenceSession | null = null;
  private modelPath: string = '';

  async loadModel(path: string): Promise<void> {
    try {
      this.modelPath = path;
      this.session = await InferenceSession.create(path, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      console.log(`Model loaded from ${path}`);
    } catch (error) {
      console.error('Failed to load ONNX model:', error);
      throw error;
    }
  }

  async processAudioBuffer(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    if (!this.session) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      // Convert AudioBuffer to Float32Array
      const inputData = audioBuffer.getChannelData(0);

      // Prepare input tensor
      const inputTensor = new Tensor('float32', inputData, [1, 1, inputData.length]);

      // Run inference
      const outputMap = await this.session.run({ input: inputTensor });
      const outputTensor = outputMap.output;

      // Create new AudioBuffer with processed data
      const context = new AudioContext();
      const outputBuffer = context.createBuffer(
        audioBuffer.numberOfChannels,
        outputTensor.dims[2],
        audioBuffer.sampleRate,
      );

      // Copy processed data to all channels
      for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
        outputBuffer.copyToChannel(Float32Array.from(outputTensor.data as Float32Array), channel);
      }

      return outputBuffer;
    } catch (error) {
      console.error('Error during audio processing:', error);
      throw error;
    }
  }

  async processBatch(audioBuffers: AudioBuffer[]): Promise<AudioBuffer[]> {
    const results: AudioBuffer[] = [];
    for (const buffer of audioBuffers) {
      const processed = await this.processAudioBuffer(buffer);
      results.push(processed);
    }
    return results;
  }

  dispose(): void {
    if (this.session) {
      this.session.release();
      this.session = null;
    }
  }
}

export default ONNXManager;
