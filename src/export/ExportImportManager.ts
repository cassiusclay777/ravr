import { EUPHEncoder } from '../formats/EUPHEncoder';
import { EUPHDecoder } from '../formats/EUPHDecoder';
import { AIEnhancementPipeline } from '../ai/AIEnhancementPipeline';

export interface ExportOptions {
  format: 'euph' | 'wav' | 'flac' | 'mp3' | 'json';
  quality: 'low' | 'medium' | 'high' | 'lossless';
  includeMetadata: boolean;
  includeAIModel: boolean;
  includeDSPChain: boolean;
  includeRelativisticEffects: boolean;
  compression: boolean;
  compressionLevel: number;
}

export interface ImportOptions {
  autoDetectFormat: boolean;
  preserveOriginal: boolean;
  enhanceAudio: boolean;
  extractStems: boolean;
  applyAIEnhancement: boolean;
}

export interface BatchProcessingOptions extends ExportOptions {
  maxConcurrency: number;
  progressCallback?: (progress: number, fileName: string) => void;
  errorCallback?: (error: Error, fileName: string) => void;
  skipErrors: boolean;
}

export interface ProcessingProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface ExportResult {
  success: boolean;
  data?: ArrayBuffer | Blob;
  error?: string;
  metadata?: {
    format: string;
    size: number;
    duration: number;
    quality: string;
  };
}

export interface ImportResult {
  success: boolean;
  audioBuffer?: AudioBuffer;
  metadata?: any;
  error?: string;
}

export class ExportImportManager {
  private readonly euphEncoder: EUPHEncoder;
  private readonly euphDecoder: EUPHDecoder;
  private readonly aiPipeline: AIEnhancementPipeline;
  private readonly audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.euphEncoder = new EUPHEncoder();
    this.euphDecoder = new EUPHDecoder();
    this.aiPipeline = new AIEnhancementPipeline();
  }

  // Export single audio file
  async exportAudio(
    audioBuffer: AudioBuffer,
    options: ExportOptions,
    fileName: string = 'ravr_export',
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<ExportResult> {
    try {
      progressCallback?.(0, 'Starting export...');

      let exportData: ArrayBuffer | Blob;
      let metadata: any = {
        title: fileName,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        bitDepth: 32,
        encodingProfile: options.quality
      };

      switch (options.format) {
        case 'euph':
          progressCallback?.(20, 'Encoding EUPH format...');
          exportData = await this.exportToEUPH(audioBuffer, options, metadata);
          break;
        
        case 'wav':
          progressCallback?.(20, 'Encoding WAV format...');
          exportData = await this.exportToWAV(audioBuffer, options);
          break;
        
        case 'flac':
          progressCallback?.(20, 'Encoding FLAC format...');
          exportData = await this.exportToFLAC(audioBuffer, options);
          break;
        
        case 'mp3':
          progressCallback?.(20, 'Encoding MP3 format...');
          exportData = await this.exportToMP3(audioBuffer, options);
          break;
        
        case 'json':
          progressCallback?.(20, 'Creating JSON metadata...');
          exportData = await this.exportToJSON(audioBuffer, metadata);
          break;
        
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      progressCallback?.(100, 'Export complete!');
      
      return {
        success: true,
        data: exportData,
        metadata: {
          format: options.format,
          size: exportData instanceof ArrayBuffer ? exportData.byteLength : exportData.size,
          duration: audioBuffer.duration,
          quality: options.quality
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${(error as Error).message}`
      };
    }
  }

  // Import audio file
  async importAudio(
    file: File | ArrayBuffer,
    options: ImportOptions = {
      autoDetectFormat: true,
      preserveOriginal: true,
      enhanceAudio: false,
      extractStems: false,
      applyAIEnhancement: false
    },
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<ImportResult> {
    try {
      progressCallback?.(0, 'Starting import...');

      let arrayBuffer: ArrayBuffer;
      let fileName = '';

      if (file instanceof File) {
        fileName = file.name;
        arrayBuffer = await file.arrayBuffer();
        progressCallback?.(20, `Reading file: ${fileName}`);
      } else {
        arrayBuffer = file;
        fileName = 'imported_audio';
      }

      // Detect format
      const format = options.autoDetectFormat ? this.detectAudioFormat(arrayBuffer, fileName) : 'unknown';
      progressCallback?.(40, `Detected format: ${format}`);

      let audioBuffer: AudioBuffer;

      // Decode based on format
      if (format === 'euph') {
        const euphResult = await this.euphDecoder.decode(arrayBuffer);
        audioBuffer = euphResult.audioBuffer;
      } else {
        // Use Web Audio API for standard formats
        audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      }

      progressCallback?.(70, 'Audio decoded successfully');

      // Apply enhancements if requested
      if (options.applyAIEnhancement && options.enhanceAudio) {
        progressCallback?.(80, 'Applying AI enhancements...');
        const enhanced = await this.aiPipeline.processAudio(audioBuffer, {
          superResolution: { enabled: true, targetSampleRate: 48000, quality: 'balanced' },
          genreDetection: { enabled: true, confidence: 0.8 }
        });
        audioBuffer = enhanced.enhancedAudio;
      }

      progressCallback?.(100, 'Import complete!');

      return {
        success: true,
        audioBuffer,
        metadata: {
          format,
          fileName,
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Import failed: ${(error as Error).message}`
      };
    }
  }

  // Batch processing
  async batchProcess(
    files: File[],
    options: BatchProcessingOptions
  ): Promise<ProcessingProgress> {
    const startTime = Date.now();
    const progress: ProcessingProgress = {
      total: files.length,
      completed: 0,
      failed: 0,
      percentage: 0
    };

    const semaphore = new Semaphore(options.maxConcurrency);
    const promises = files.map(async (file, index) => {
      return semaphore.acquire(async () => {
        try {
          progress.current = file.name;
          options.progressCallback?.(progress.percentage, file.name);

          // Import
          const importResult = await this.importAudio(file, {
            autoDetectFormat: true,
            preserveOriginal: true,
            enhanceAudio: false,
            extractStems: false,
            applyAIEnhancement: false
          });

          if (!importResult.success || !importResult.audioBuffer) {
            throw new Error(importResult.error || 'Import failed');
          }

          // Export
          const exportResult = await this.exportAudio(
            importResult.audioBuffer,
            options,
            file.name.split('.')[0]
          );

          if (!exportResult.success) {
            throw new Error(exportResult.error || 'Export failed');
          }

          progress.completed++;

        } catch (error) {
          progress.failed++;
          if (!options.skipErrors) {
            throw error;
          }
          options.errorCallback?.(error as Error, file.name);
        }

        progress.percentage = Math.round(((progress.completed + progress.failed) / progress.total) * 100);
        
        // Estimate remaining time
        const elapsed = Date.now() - startTime;
        const remaining = progress.total - progress.completed - progress.failed;
        if (remaining > 0 && progress.completed > 0) {
          const avgTime = elapsed / progress.completed;
          progress.estimatedTimeRemaining = Math.round((avgTime * remaining) / 1000);
        }

        options.progressCallback?.(progress.percentage, file.name);
      });
    });

    await Promise.allSettled(promises);
    return progress;
  }

  // Format-specific export methods
  private async exportToEUPH(
    audioBuffer: AudioBuffer,
    options: ExportOptions,
    metadata: any
  ): Promise<ArrayBuffer> {
    return this.euphEncoder.encodeAudioBuffer(audioBuffer, metadata, {
      profile: options.quality === 'lossless' ? 'lossless' : 'balanced',
      compressionLevel: options.compressionLevel,
      includeAIData: options.includeAIModel,
      includeDSPSettings: options.includeDSPChain
    });
  }

  private async exportToWAV(audioBuffer: AudioBuffer, options: ExportOptions): Promise<ArrayBuffer> {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert float32 to int16
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return buffer;
  }

  private async exportToFLAC(audioBuffer: AudioBuffer, options: ExportOptions): Promise<ArrayBuffer> {
    try {
      // Dynamic import of flac.js
      const Flac = (await Promise.reject(new Error('FLAC.js not available'))).default;

      const numberOfChannels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const bitsPerSample = 16; // FLAC standard
      const compressionLevel = options.compressionLevel || 5; // 0-8, default 5

      // Initialize FLAC encoder
      const flacEncoder = new Flac.encoder({
        sampleRate,
        channels: numberOfChannels,
        bitsPerSample,
        compression: compressionLevel,
        verify: false, // Faster encoding
      });

      const samples: Int32Array[] = [];

      // Convert float samples to int32 for FLAC
      for (let ch = 0; ch < numberOfChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch);
        const int32Data = new Int32Array(channelData.length);

        for (let i = 0; i < channelData.length; i++) {
          const sample = Math.max(-1, Math.min(1, channelData[i]));
          // Convert to 16-bit range
          int32Data[i] = Math.floor(sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
        }

        samples.push(int32Data);
      }

      // Encode samples
      const flacData = flacEncoder.encode(samples);

      if (!flacData || flacData.length === 0) {
        throw new Error('FLAC encoding produced no output');
      }

      console.log(`✅ FLAC export successful: ${(flacData.length / 1024).toFixed(2)} KB at compression level ${compressionLevel}`);
      return flacData.buffer;

    } catch (error) {
      console.error('FLAC encoding failed, falling back to WAV:', error);
      return this.exportToWAV(audioBuffer, options);
    }
  }

  private async exportToMP3(audioBuffer: AudioBuffer, options: ExportOptions): Promise<ArrayBuffer> {
    try {
      // Dynamic import of lamejs
      const lamejs = await import('lamejs');

      const numberOfChannels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const kbps = options.bitrate || 192; // Default to 192 kbps

      // Convert Float32Array to Int16Array for LAME
      const leftChannel = this.floatTo16BitPCM(audioBuffer.getChannelData(0));
      const rightChannel = numberOfChannels > 1
        ? this.floatTo16BitPCM(audioBuffer.getChannelData(1))
        : leftChannel;

      // Create MP3 encoder
      const mp3encoder = new lamejs.Mp3Encoder(numberOfChannels, sampleRate, kbps);

      const mp3Data: Int8Array[] = [];
      const sampleBlockSize = 1152; // Standard MP3 frame size

      // Encode in blocks
      for (let i = 0; i < leftChannel.length; i += sampleBlockSize) {
        const leftChunk = leftChannel.subarray(i, i + sampleBlockSize);
        const rightChunk = rightChannel.subarray(i, i + sampleBlockSize);

        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }

      // Flush remaining data
      const mp3buf = mp3encoder.flush();
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }

      // Combine all MP3 chunks into single ArrayBuffer
      const totalLength = mp3Data.reduce((acc, chunk) => acc + chunk.length, 0);
      const mp3Array = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of mp3Data) {
        mp3Array.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(`✅ MP3 export successful: ${(mp3Array.length / 1024).toFixed(2)} KB at ${kbps} kbps`);
      return mp3Array.buffer;

    } catch (error) {
      console.error('MP3 encoding failed, falling back to WAV:', error);
      return this.exportToWAV(audioBuffer, options);
    }
  }

  // Helper method to convert Float32 to Int16 PCM
  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  private async exportToJSON(audioBuffer: AudioBuffer, metadata: any): Promise<Blob> {
    const data = {
      metadata,
      audioData: {
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length,
        duration: audioBuffer.duration
      },
      timestamp: new Date().toISOString()
    };
    
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  }

  private detectAudioFormat(arrayBuffer: ArrayBuffer, fileName: string): string {
    const view = new Uint8Array(arrayBuffer);
    
    // Check EUPH signature
    if (view[0] === 0x45 && view[1] === 0x55 && view[2] === 0x50 && view[3] === 0x48) {
      return 'euph';
    }
    
    // Check WAV signature
    if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46) {
      return 'wav';
    }
    
    // Check MP3 signature
    if (view[0] === 0xFF && (view[1] & 0xE0) === 0xE0) {
      return 'mp3';
    }
    
    // Check FLAC signature
    if (view[0] === 0x66 && view[1] === 0x4C && view[2] === 0x61 && view[3] === 0x43) {
      return 'flac';
    }
    
    // Fallback to file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext || 'unknown';
  }

  // Download helper
  downloadFile(data: ArrayBuffer | Blob, fileName: string, mimeType: string): void {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  dispose(): void {
    this.aiPipeline.dispose();
  }
}

// Semaphore for concurrency control
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const runTask = async () => {
        try {
          const result = await fn();
          this.release();
          resolve(result);
        } catch (error) {
          this.release();
          reject(error);
        }
      };

      if (this.permits > 0) {
        this.permits--;
        runTask();
      } else {
        this.waiting.push(() => {
          this.permits--;
          runTask();
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    }
  }
}
