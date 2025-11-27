/**
 * EUPH Format Codec (Pure TypeScript Implementation)
 * Lossless audio compression with metadata and AI enhancement data
 *
 * Format Specification:
 * - Magic: "EUPH" (4 bytes)
 * - Version: Major.Minor (2 bytes)
 * - Chunk Count: uint32 (4 bytes)
 * - Chunks: Array of {type, size, data, checksum}
 */

import pako from 'pako'; // For gzip compression

export interface EUPHMetadata {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  duration: number;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  encodingProfile: 'lossless' | 'balanced' | 'compact';
  enhancementData?: {
    aiProcessed: boolean;
    genreDetection?: string;
    spatialData?: ArrayBuffer;
    dspSettings?: object;
  };
}

export interface EUPHChunk {
  type: string;
  size: number;
  data: Uint8Array;
  checksum: number;
  compressed: boolean;
}

export interface EncodingOptions {
  profile: 'lossless' | 'balanced' | 'compact';
  compressionLevel: number; // 0-9 (0=none, 9=max)
  includeAIData: boolean;
  includeDSPSettings: boolean;
  enableIntegrityCheck: boolean;
}

export interface ProgressCallback {
  (progress: number, stage: string): void;
}

const EUPH_MAGIC = new TextEncoder().encode('EUPH');
const VERSION_MAJOR = 2;
const VERSION_MINOR = 0;

const ChunkTypes = {
  HEADER: 'HEAD',
  METADATA: 'META',
  AUDIO: 'AUDI',
  AI_DATA: 'AIDE',
  DSP_DATA: 'DSPS',
  CHECKSUM: 'CHKS'
};

export class EUPHCodec {
  private static readonly DEFAULT_OPTIONS: EncodingOptions = {
    profile: 'balanced',
    compressionLevel: 6,
    includeAIData: true,
    includeDSPSettings: true,
    enableIntegrityCheck: true
  };

  /**
   * Encode audio data to EUPH format
   */
  static async encode(
    audioData: ArrayBuffer,
    metadata: EUPHMetadata,
    options: Partial<EncodingOptions> = {},
    progressCallback?: ProgressCallback
  ): Promise<ArrayBuffer> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    progressCallback?.(0, 'Initializing');

    const chunks: EUPHChunk[] = [];

    // 1. Create header chunk
    progressCallback?.(10, 'Creating header');
    const headerData = this.createHeaderChunk(metadata, opts);
    chunks.push(headerData);

    // 2. Create metadata chunk
    progressCallback?.(20, 'Processing metadata');
    const metadataChunk = this.createMetadataChunk(metadata, opts);
    chunks.push(metadataChunk);

    // 3. Create audio chunk
    progressCallback?.(40, 'Compressing audio');
    const audioChunk = await this.createAudioChunk(audioData, opts);
    chunks.push(audioChunk);

    // 4. Add AI data if present
    if (opts.includeAIData && metadata.enhancementData?.spatialData) {
      progressCallback?.(70, 'Adding AI data');
      const aiChunk = this.createAIChunk(metadata.enhancementData.spatialData, opts);
      chunks.push(aiChunk);
    }

    // 5. Add DSP settings if present
    if (opts.includeDSPSettings && metadata.enhancementData?.dspSettings) {
      progressCallback?.(80, 'Adding DSP settings');
      const dspChunk = this.createDSPChunk(metadata.enhancementData.dspSettings, opts);
      chunks.push(dspChunk);
    }

    // 6. Add checksum chunk
    if (opts.enableIntegrityCheck) {
      progressCallback?.(90, 'Computing checksum');
      const checksumChunk = this.createChecksumChunk(chunks);
      chunks.push(checksumChunk);
    }

    // 7. Serialize to binary
    progressCallback?.(95, 'Finalizing');
    const result = this.serializeChunks(chunks);

    progressCallback?.(100, 'Complete');
    return result;
  }

  /**
   * Decode EUPH format to audio data
   */
  static async decode(
    euphData: ArrayBuffer,
    progressCallback?: ProgressCallback
  ): Promise<{
    audioData: ArrayBuffer;
    metadata: EUPHMetadata;
    aiData?: ArrayBuffer;
    dspSettings?: object;
  }> {
    progressCallback?.(0, 'Reading file');

    const view = new DataView(euphData);
    let offset = 0;

    // Verify magic
    const magic = new Uint8Array(euphData, offset, 4);
    if (!this.arraysEqual(magic, EUPH_MAGIC)) {
      throw new Error('Invalid EUPH file: wrong magic number');
    }
    offset += 4;

    // Read version
    const versionMajor = view.getUint8(offset++);
    const versionMinor = view.getUint8(offset++);
    console.log(`EUPH version: ${versionMajor}.${versionMinor}`);

    // Read chunk count
    const chunkCount = view.getUint32(offset, true);
    offset += 4;

    progressCallback?.(10, `Reading ${chunkCount} chunks`);

    // Parse chunks
    const chunks: EUPHChunk[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunk = this.parseChunk(euphData, offset);
      chunks.push(chunk);
      offset += 8 + chunk.size; // type(4) + size(4) + data(size)
      progressCallback?.((10 + (i / chunkCount) * 60), `Chunk ${i + 1}/${chunkCount}`);
    }

    // Extract data from chunks
    let audioData: ArrayBuffer | undefined;
    let metadata: EUPHMetadata | undefined;
    let aiData: ArrayBuffer | undefined;
    let dspSettings: object | undefined;

    for (const chunk of chunks) {
      switch (chunk.type) {
        case ChunkTypes.METADATA:
          progressCallback?.(70, 'Parsing metadata');
          const metadataJson = new TextDecoder().decode(chunk.data);
          metadata = JSON.parse(metadataJson);
          break;

        case ChunkTypes.AUDIO:
          progressCallback?.(80, 'Decompressing audio');
          if (chunk.compressed) {
            audioData = pako.inflate(chunk.data).buffer;
          } else {
            audioData = chunk.data.buffer;
          }
          break;

        case ChunkTypes.AI_DATA:
          progressCallback?.(90, 'Extracting AI data');
          aiData = chunk.data.buffer;
          break;

        case ChunkTypes.DSP_DATA:
          progressCallback?.(95, 'Extracting DSP settings');
          const dspJson = new TextDecoder().decode(chunk.data);
          dspSettings = JSON.parse(dspJson);
          break;
      }
    }

    if (!audioData || !metadata) {
      throw new Error('Invalid EUPH file: missing required chunks');
    }

    progressCallback?.(100, 'Complete');

    return { audioData, metadata, aiData, dspSettings };
  }

  /**
   * Validate EUPH file
   */
  static validate(data: ArrayBuffer): boolean {
    if (data.byteLength < 10) return false;

    const magic = new Uint8Array(data, 0, 4);
    return this.arraysEqual(magic, EUPH_MAGIC);
  }

  /**
   * Get file info without full decode
   */
  static async getInfo(euphData: ArrayBuffer): Promise<{
    version: string;
    chunkCount: number;
    totalSize: number;
    metadata?: EUPHMetadata;
  }> {
    const view = new DataView(euphData);
    let offset = 4; // Skip magic

    const versionMajor = view.getUint8(offset++);
    const versionMinor = view.getUint8(offset++);
    const chunkCount = view.getUint32(offset, true);
    offset += 4;

    // Try to find metadata chunk
    let metadata: EUPHMetadata | undefined;
    for (let i = 0; i < chunkCount; i++) {
      const chunk = this.parseChunk(euphData, offset);
      if (chunk.type === ChunkTypes.METADATA) {
        const metadataJson = new TextDecoder().decode(chunk.data);
        metadata = JSON.parse(metadataJson);
        break;
      }
      offset += 8 + chunk.size;
    }

    return {
      version: `${versionMajor}.${versionMinor}`,
      chunkCount,
      totalSize: euphData.byteLength,
      metadata
    };
  }

  // Private helper methods

  private static createHeaderChunk(metadata: EUPHMetadata, opts: EncodingOptions): EUPHChunk {
    const headerData = new Uint8Array(32);
    const view = new DataView(headerData.buffer);

    view.setUint32(0, metadata.sampleRate, true);
    view.setUint16(4, metadata.channels, true);
    view.setUint16(6, metadata.bitDepth, true);
    view.setUint32(8, Math.floor(metadata.duration * 1000), true); // ms
    view.setUint8(12, opts.compressionLevel);

    return {
      type: ChunkTypes.HEADER,
      size: headerData.length,
      data: headerData,
      checksum: this.crc32(headerData),
      compressed: false
    };
  }

  private static createMetadataChunk(metadata: EUPHMetadata, opts: EncodingOptions): EUPHChunk {
    const metadataJson = JSON.stringify(metadata, null, 2);
    const data = new TextEncoder().encode(metadataJson);

    return {
      type: ChunkTypes.METADATA,
      size: data.length,
      data: data,
      checksum: this.crc32(data),
      compressed: false
    };
  }

  private static async createAudioChunk(audioData: ArrayBuffer, opts: EncodingOptions): Promise<EUPHChunk> {
    const shouldCompress = opts.compressionLevel > 0;
    const inputData = new Uint8Array(audioData);

    let finalData: Uint8Array;
    if (shouldCompress) {
      finalData = pako.deflate(inputData, { level: opts.compressionLevel });
    } else {
      finalData = inputData;
    }

    return {
      type: ChunkTypes.AUDIO,
      size: finalData.length,
      data: finalData,
      checksum: this.crc32(finalData),
      compressed: shouldCompress
    };
  }

  private static createAIChunk(aiData: ArrayBuffer, opts: EncodingOptions): EUPHChunk {
    const data = new Uint8Array(aiData);

    return {
      type: ChunkTypes.AI_DATA,
      size: data.length,
      data: data,
      checksum: this.crc32(data),
      compressed: false
    };
  }

  private static createDSPChunk(dspSettings: object, opts: EncodingOptions): EUPHChunk {
    const dspJson = JSON.stringify(dspSettings);
    const data = new TextEncoder().encode(dspJson);

    return {
      type: ChunkTypes.DSP_DATA,
      size: data.length,
      data: data,
      checksum: this.crc32(data),
      compressed: false
    };
  }

  private static createChecksumChunk(chunks: EUPHChunk[]): EUPHChunk {
    // Compute overall file checksum
    let combinedData = new Uint8Array();
    for (const chunk of chunks) {
      combinedData = this.concatUint8Arrays(combinedData, chunk.data);
    }

    const checksum = this.crc32(combinedData);
    const checksumData = new Uint8Array(4);
    new DataView(checksumData.buffer).setUint32(0, checksum, true);

    return {
      type: ChunkTypes.CHECKSUM,
      size: 4,
      data: checksumData,
      checksum: 0,
      compressed: false
    };
  }

  private static serializeChunks(chunks: EUPHChunk[]): ArrayBuffer {
    // Calculate total size
    let totalSize = 4 + 2 + 4; // magic + version + chunk count
    for (const chunk of chunks) {
      totalSize += 4 + 4 + chunk.size; // type + size + data
    }

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);
    let offset = 0;

    // Write magic
    uint8View.set(EUPH_MAGIC, offset);
    offset += 4;

    // Write version
    view.setUint8(offset++, VERSION_MAJOR);
    view.setUint8(offset++, VERSION_MINOR);

    // Write chunk count
    view.setUint32(offset, chunks.length, true);
    offset += 4;

    // Write chunks
    for (const chunk of chunks) {
      // Write type (4 bytes, padded)
      const typeBytes = new TextEncoder().encode(chunk.type.padEnd(4, '\0'));
      uint8View.set(typeBytes.slice(0, 4), offset);
      offset += 4;

      // Write size
      view.setUint32(offset, chunk.size, true);
      offset += 4;

      // Write data
      uint8View.set(chunk.data, offset);
      offset += chunk.size;
    }

    return buffer;
  }

  private static parseChunk(buffer: ArrayBuffer, offset: number): EUPHChunk {
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);

    // Read type
    const typeBytes = uint8View.slice(offset, offset + 4);
    const type = new TextDecoder().decode(typeBytes).replace(/\0/g, '');
    offset += 4;

    // Read size
    const size = view.getUint32(offset, true);
    offset += 4;

    // Read data
    const data = uint8View.slice(offset, offset + size);

    return {
      type,
      size,
      data,
      checksum: this.crc32(data),
      compressed: false // TODO: detect from flags
    };
  }

  // Utility methods

  private static crc32(data: Uint8Array): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = crc ^ data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  private static arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private static concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
  }
}
