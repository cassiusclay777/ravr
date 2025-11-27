interface ModelInfo {
  name: string;
  url: string;
  size: number; // in bytes
  checksum: string;
  description: string;
  version: string;
  requirements: {
    minRAM: number; // MB
    supportedFormats: string[];
  };
}

interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  eta: number; // seconds
}

type ProgressCallback = (progress: DownloadProgress) => void;

export class ModelDownloader {
  private static readonly MODEL_REGISTRY: Record<string, ModelInfo> = {
    audiosr: {
      name: 'AudioSR',
      url: 'https://huggingface.co/microsoft/speechssr/resolve/main/speechssr.onnx',
      size: 45 * 1024 * 1024, // 45MB
      checksum: 'audiosr_placeholder_hash',
      description: 'Audio Super-Resolution model for upsampling',
      version: '1.0',
      requirements: {
        minRAM: 512,
        supportedFormats: ['wav', 'mp3', 'flac']
      }
    },
    demucs: {
      name: 'Demucs v4',
      url: 'https://dl.fbaipublicfiles.com/demucs/hybrid_transformer/955717e8-8726e21a.th',
      size: 319 * 1024 * 1024, // 319MB
      checksum: 'demucs_placeholder_hash',
      description: 'Source separation model for stems extraction',
      version: '4.0',
      requirements: {
        minRAM: 1024,
        supportedFormats: ['wav', 'mp3', 'flac', 'm4a']
      }
    },
    ddsp: {
      name: 'DDSP Decoder',
      url: 'https://tfhub.dev/google/ddsp/violin_synth/1',
      size: 12 * 1024 * 1024, // 12MB
      checksum: 'ddsp_placeholder_hash',
      description: 'Differentiable Digital Signal Processing for harmonic synthesis',
      version: '1.0',
      requirements: {
        minRAM: 256,
        supportedFormats: ['wav']
      }
    },
    genre_classifier: {
      name: 'Genre Classifier',
      url: 'https://github.com/mdeff/fma/blob/outputs/features.csv',
      size: 8 * 1024 * 1024, // 8MB
      checksum: 'genre_placeholder_hash',
      description: 'Music genre classification based on mel-spectrograms',
      version: '1.0',
      requirements: {
        minRAM: 128,
        supportedFormats: ['wav', 'mp3', 'flac']
      }
    }
  };

  private downloadQueue: string[] = [];
  private isDownloading = false;
  private abortControllers: Map<string, AbortController> = new Map();

  async downloadModel(
    modelName: string,
    progressCallback?: ProgressCallback
  ): Promise<void> {
    const modelInfo = ModelDownloader.MODEL_REGISTRY[modelName];
    if (!modelInfo) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const localPath = `/models/${modelName}.onnx`;
    
    // Check if model already exists
    if (await this.modelExists(localPath)) {
      console.log(`Model ${modelName} already downloaded`);
      return;
    }

    console.log(`Downloading model ${modelName} (${this.formatBytes(modelInfo.size)})...`);

    const abortController = new AbortController();
    this.abortControllers.set(modelName, abortController);

    try {
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      const response = await fetch(modelInfo.url, {
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const total = parseInt(response.headers.get('content-length') || '0') || modelInfo.size;
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        chunks.push(value);
        loaded += value.length;

        // Calculate download speed and ETA
        const currentTime = Date.now();
        const timeDiff = (currentTime - lastTime) / 1000; // seconds
        
        if (timeDiff >= 1) { // Update every second
          const speed = (loaded - lastLoaded) / timeDiff;
          const eta = speed > 0 ? (total - loaded) / speed : 0;
          
          progressCallback?.({
            loaded,
            total,
            percentage: (loaded / total) * 100,
            speed,
            eta
          });
          
          lastLoaded = loaded;
          lastTime = currentTime;
        }
      }

      // Combine chunks
      const modelData = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        modelData.set(chunk, offset);
        offset += chunk.length;
      }

      // Verify checksum
      const actualChecksum = await this.calculateChecksum(modelData.buffer);
      if (modelInfo.checksum !== 'placeholder_hash' && actualChecksum !== modelInfo.checksum) {
        throw new Error(`Checksum mismatch for ${modelName}`);
      }

      // Store model in IndexedDB for persistence
      await this.storeModel(localPath, modelData);

      console.log(`✅ Model ${modelName} downloaded successfully`);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Download of ${modelName} was cancelled`);
      } else {
        console.error(`Failed to download ${modelName}:`, error);
        throw error;
      }
    } finally {
      this.abortControllers.delete(modelName);
    }
  }

  async downloadAllModels(progressCallback?: (modelName: string, progress: DownloadProgress) => void): Promise<void> {
    const modelNames = Object.keys(ModelDownloader.MODEL_REGISTRY);
    
    for (const modelName of modelNames) {
      try {
        await this.downloadModel(modelName, (progress) => {
          progressCallback?.(modelName, progress);
        });
      } catch (error) {
        console.error(`Failed to download ${modelName}:`, error);
        // Continue with other models
      }
    }
  }

  cancelDownload(modelName: string): void {
    const controller = this.abortControllers.get(modelName);
    if (controller) {
      controller.abort();
    }
  }

  cancelAllDownloads(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  async getModelList(): Promise<Array<ModelInfo & { downloaded: boolean; localPath?: string }>> {
    const models = [];
    
    for (const [name, info] of Object.entries(ModelDownloader.MODEL_REGISTRY)) {
      const localPath = `/models/${name}.onnx`;
      const downloaded = await this.modelExists(localPath);
      
      models.push({
        ...info,
        downloaded,
        localPath: downloaded ? localPath : undefined
      });
    }
    
    return models;
  }

  async getModelSize(modelName: string): Promise<number> {
    const info = ModelDownloader.MODEL_REGISTRY[modelName];
    return info?.size || 0;
  }

  async getTotalDownloadSize(): Promise<number> {
    let totalSize = 0;
    for (const info of Object.values(ModelDownloader.MODEL_REGISTRY)) {
      totalSize += info.size;
    }
    return totalSize;
  }

  async getStorageUsage(): Promise<{ used: number; available: number }> {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      };
    } catch {
      return { used: 0, available: 0 };
    }
  }

  private async modelExists(path: string): Promise<boolean> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const result = await new Promise((resolve) => {
        const request = store.get(path);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
      return result !== null;
    } catch {
      return false;
    }
  }

  private async storeModel(path: string, data: Uint8Array): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction(['models'], 'readwrite');
    const store = transaction.objectStore('models');
    
    return new Promise((resolve, reject) => {
      const request = store.put({ path, data, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RAVRModels', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'path' });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async calculateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  dispose(): void {
    this.cancelAllDownloads();
  }
}
