import { InferenceSession, Tensor } from 'onnxruntime-web';

export interface ModelConfig {
  name: string;
  url: string;
  inputShape: number[];
  outputShape: number[];
  inputType: 'float32' | 'float64' | 'int32' | 'int64';
  outputType: 'float32' | 'float64' | 'int32' | 'int64';
  preprocessing?: (input: Float32Array) => Float32Array;
  postprocessing?: (output: Float32Array) => Float32Array;
  expectedHash?: string; // SHA-256 (hex)
}

export class ONNXModelManager {
  private sessions: Map<string, InferenceSession> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private loadingPromises: Map<string, Promise<InferenceSession>> = new Map();
  
  // Memory management
  private modelLastUsed: Map<string, number> = new Map();
  private maxCachedModels = 3; // Maximum models to keep in memory
  private memoryCheckInterval: ReturnType<typeof setInterval> | null = null;
  private memoryWarningThreshold = 0.8; // 80% of heap limit

  constructor() {
    this.initializeWebAssembly();
    this.startMemoryManagement();
  }
  
  /**
   * Start automatic memory management
   */
  private startMemoryManagement(): void {
    // Check memory every 30 seconds
    this.memoryCheckInterval = setInterval(() => {
      this.manageMemory();
    }, 30000);
  }
  
  /**
   * Manage memory by unloading least recently used models
   */
  private async manageMemory(): Promise<void> {
    // Check if we're under memory pressure
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      if (usageRatio > this.memoryWarningThreshold) {
        console.warn(`[ONNX] Memory pressure detected: ${(usageRatio * 100).toFixed(1)}%`);
        await this.unloadLeastRecentlyUsed();
      }
    }
    
    // Also check if we have too many cached models
    if (this.sessions.size > this.maxCachedModels) {
      await this.unloadLeastRecentlyUsed();
    }
  }
  
  /**
   * Unload the least recently used model
   */
  private async unloadLeastRecentlyUsed(): Promise<void> {
    if (this.sessions.size <= 1) return;
    
    let oldestModel: string | null = null;
    let oldestTime = Date.now();
    
    for (const [modelName, lastUsed] of this.modelLastUsed) {
      if (lastUsed < oldestTime && this.sessions.has(modelName)) {
        oldestTime = lastUsed;
        oldestModel = modelName;
      }
    }
    
    if (oldestModel) {
      console.log(`[ONNX] Unloading LRU model: ${oldestModel}`);
      this.unloadModel(oldestModel);
    }
  }

  private async initializeWebAssembly(): Promise<void> {
    try {
      // Configure ONNX Runtime for WebAssembly
      const ort = await import('onnxruntime-web');
      
      // Set execution providers priority
      ort.env.wasm.wasmPaths = '/node_modules/onnxruntime-web/dist/';
      ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
      ort.env.wasm.simd = true;
      ort.env.wasm.proxy = true;
      
      console.log('ONNX Runtime WebAssembly initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ONNX Runtime:', error);
      throw error;
    }
  }

  registerModel(config: ModelConfig): void {
    this.modelConfigs.set(config.name, config);
  }

  async loadModel(modelName: string): Promise<InferenceSession> {
    if (this.sessions.has(modelName)) {
      return this.sessions.get(modelName)!;
    }

    if (this.loadingPromises.has(modelName)) {
      return this.loadingPromises.get(modelName)!;
    }

    const config = this.modelConfigs.get(modelName);
    if (!config) {
      throw new Error(`Model ${modelName} not registered`);
    }

    const loadPromise = this.createSession(config);
    this.loadingPromises.set(modelName, loadPromise);

    try {
      const session = await loadPromise;
      this.sessions.set(modelName, session);
      this.modelLastUsed.set(modelName, Date.now());
      this.loadingPromises.delete(modelName);
      
      // Check memory after loading
      await this.manageMemory();
      
      return session;
    } catch (error) {
      this.loadingPromises.delete(modelName);
      throw error;
    }
  }

  private async createSession(config: ModelConfig): Promise<InferenceSession> {
    try {
      console.log(`Loading model ${config.name} from ${config.url}`);
      
      const response = await fetch(config.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${response.statusText}`);
      }

      const modelArrayBuffer = await response.arrayBuffer();

      // Hash validation
      if (config.expectedHash) {
        const hash = await this.computeSHA256(modelArrayBuffer);
        if (hash !== config.expectedHash) {
          throw new Error(
            `Hash mismatch for model ${config.name}: expected ${config.expectedHash}, got ${hash}`
          );
        }
      }

      const session = await InferenceSession.create(modelArrayBuffer, {
        executionProviders: ['wasm', 'cpu'],
        graphOptimizationLevel: 'all',
        enableMemPattern: true,
        enableCpuMemArena: true,
        executionMode: 'sequential',
        logSeverityLevel: 0
      });

      console.log(`Model ${config.name} loaded successfully`);
      return session;
    } catch (error) {
      console.error(`Failed to load model ${config.name}:`, error);
      throw error;
    }
  }

  // Utility for SHA-256 hash (hex)
  private async computeSHA256(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async runInference(
    modelName: string, 
    inputData: Float32Array, 
    inputName: string = 'input'
  ): Promise<Float32Array> {
    const session = await this.loadModel(modelName);
    const config = this.modelConfigs.get(modelName)!;
    
    // Update last used time
    this.modelLastUsed.set(modelName, Date.now());

    // Preprocess input if needed
    let processedInput = inputData;
    if (config.preprocessing) {
      processedInput = config.preprocessing(inputData);
    }

    // Create input tensor
    const inputTensor = new Tensor(config.inputType, processedInput, config.inputShape);
    
    try {
      // Run inference
      const results = await session.run({ [inputName]: inputTensor });
      
      // Get output tensor
      const outputTensorName = Object.keys(results)[0];
      const outputTensor = results[outputTensorName];
      
      let outputData = outputTensor.data as Float32Array;
      
      // Postprocess output if needed
      if (config.postprocessing) {
        outputData = config.postprocessing(outputData);
      }

      return outputData;
    } catch (error) {
      console.error(`Inference failed for model ${modelName}:`, error);
      throw error;
    }
  }

  async runBatchInference(
    modelName: string,
    batchInputs: Float32Array[],
    inputName: string = 'input'
  ): Promise<Float32Array[]> {
    const results: Float32Array[] = [];
    
    for (const input of batchInputs) {
      const result = await this.runInference(modelName, input, inputName);
      results.push(result);
    }
    
    return results;
  }

  isModelLoaded(modelName: string): boolean {
    return this.sessions.has(modelName);
  }

  getLoadedModels(): string[] {
    return Array.from(this.sessions.keys());
  }

  unloadModel(modelName: string): void {
    const session = this.sessions.get(modelName);
    if (session) {
      session.release();
      this.sessions.delete(modelName);
      this.modelLastUsed.delete(modelName);
      console.log(`[ONNX] Model ${modelName} unloaded`);
      
      // Force garbage collection hint
      if (typeof gc === 'function') {
        try { gc(); } catch (e) { /* ignore */ }
      }
    }
  }

  unloadAllModels(): void {
    for (const [modelName, session] of this.sessions) {
      session.release();
      console.log(`[ONNX] Model ${modelName} unloaded`);
    }
    this.sessions.clear();
    this.loadingPromises.clear();
    this.modelLastUsed.clear();
    
    // Force garbage collection hint
    if (typeof gc === 'function') {
      try { gc(); } catch (e) { /* ignore */ }
    }
  }
  
  /**
   * Set maximum number of cached models
   */
  setMaxCachedModels(max: number): void {
    this.maxCachedModels = max;
  }
  
  /**
   * Get memory usage statistics
   */
  getMemoryStats(): { cachedModels: number; totalModels: number; lastUsedTimes: Record<string, number> } {
    const lastUsedTimes: Record<string, number> = {};
    for (const [name, time] of this.modelLastUsed) {
      lastUsedTimes[name] = time;
    }
    
    return {
      cachedModels: this.sessions.size,
      totalModels: this.modelConfigs.size,
      lastUsedTimes
    };
  }
  
  /**
   * Cleanup resources on dispose
   */
  dispose(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    this.unloadAllModels();
  }

  getModelInfo(modelName: string): ModelConfig | undefined {
    return this.modelConfigs.get(modelName);
  }

  listRegisteredModels(): string[] {
    return Array.from(this.modelConfigs.keys());
  }

  // Utility method to convert audio buffer to the format expected by models
  prepareAudioInput(audioBuffer: AudioBuffer, targetSampleRate: number = 16000): Float32Array {
    const sourceData = audioBuffer.getChannelData(0);
    const sourceSampleRate = audioBuffer.sampleRate;
    
    if (sourceSampleRate === targetSampleRate) {
      return sourceData;
    }

    // Simple resampling using linear interpolation
    const ratio = sourceSampleRate / targetSampleRate;
    const outputLength = Math.floor(sourceData.length / ratio);
    const resampledData = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i * ratio;
      const leftIndex = Math.floor(sourceIndex);
      const rightIndex = Math.min(leftIndex + 1, sourceData.length - 1);
      const fraction = sourceIndex - leftIndex;

      resampledData[i] = sourceData[leftIndex] * (1 - fraction) + 
                        sourceData[rightIndex] * fraction;
    }

    return resampledData;
  }

  // Normalize audio data to [-1, 1] range
  normalizeAudio(data: Float32Array): Float32Array {
    const maxValue = Math.max(...Array.from(data).map(Math.abs));
    if (maxValue === 0) return data;

    const normalized = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      normalized[i] = data[i] / maxValue;
    }
    return normalized;
  }

  // Split audio into overlapping chunks for processing
  chunkAudio(
    data: Float32Array, 
    chunkSize: number, 
    overlapSize: number = 0
  ): Float32Array[] {
    const chunks: Float32Array[] = [];
    const stepSize = chunkSize - overlapSize;

    for (let i = 0; i < data.length - overlapSize; i += stepSize) {
      const end = Math.min(i + chunkSize, data.length);
      const chunk = data.slice(i, end);
      
      // Pad chunk if necessary
      if (chunk.length < chunkSize) {
        const paddedChunk = new Float32Array(chunkSize);
        paddedChunk.set(chunk);
        chunks.push(paddedChunk);
      } else {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  // Merge overlapping audio chunks back together
  mergeChunks(
    chunks: Float32Array[], 
    chunkSize: number, 
    overlapSize: number = 0
  ): Float32Array {
    if (chunks.length === 0) return new Float32Array(0);
    if (chunks.length === 1) return chunks[0];

    const stepSize = chunkSize - overlapSize;
    const totalLength = (chunks.length - 1) * stepSize + chunkSize;
    const result = new Float32Array(totalLength);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const startIdx = i * stepSize;

      if (overlapSize > 0 && i > 0) {
        // Apply fade-in/fade-out for overlap region
        for (let j = 0; j < overlapSize; j++) {
          const fadeIn = j / overlapSize;
          const fadeOut = 1 - fadeIn;
          const overlapIdx = startIdx + j;
          
          if (overlapIdx < result.length) {
            result[overlapIdx] = result[overlapIdx] * fadeOut + chunk[j] * fadeIn;
          }
        }

        // Copy non-overlapping portion
        for (let j = overlapSize; j < chunk.length; j++) {
          const idx = startIdx + j;
          if (idx < result.length) {
            result[idx] = chunk[j];
          }
        }
      } else {
        // No overlap, just copy
        for (let j = 0; j < chunk.length; j++) {
          const idx = startIdx + j;
          if (idx < result.length) {
            result[idx] = chunk[j];
          }
        }
      }
    }

    return result;
  }
}
