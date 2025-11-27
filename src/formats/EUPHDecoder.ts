import { EUPHMetadata, EUPHChunk } from './EUPHEncoder';

interface DecodedEUPH {
  audioBuffer: AudioBuffer;
  metadata: EUPHMetadata;
  aiData?: any;
  dspSettings?: object;
  integrity: {
    verified: boolean;
    checksumMatch: boolean;
    corruptedChunks: string[];
  };
}

interface DecodingOptions {
  validateIntegrity: boolean;
  loadAIData: boolean;
  loadDSPSettings: boolean;
  audioContext: AudioContext;
}

export class EUPHDecoder {
  private static readonly EUPH_SIGNATURE = new Uint8Array([0x45, 0x55, 0x50, 0x48]); // "EUPH"
  private static readonly CHUNK_TYPES = {
    HEADER: 'HEAD',
    METADATA: 'META', 
    AUDIO: 'AUDI',
    AI_DATA: 'AIDE',
    DSP_DATA: 'DSPS',
    CHECKSUM: 'CHKS'
  };

  private wasmModule: any = null;
  private isInitialized = false;

  constructor() {
    this.initializeWASM();
  }

  private async initializeWASM(): Promise<void> {
    try {
      // Load RAVR WASM module for DSP processing
      // Use URL import for files in /public directory
      const wasmUrl = '/wasm/ravr_wasm.js?url';
      this.wasmModule = await import(/* @vite-ignore */ wasmUrl);
      this.isInitialized = true;
      console.log('EUPH decoder initialized with WASM');
    } catch (error) {
      console.warn('WASM decoder not available, using JavaScript fallback:', error);
      this.isInitialized = true; // Use JS fallback
    }
  }

  async decodeArrayBuffer(
    data: ArrayBuffer,
    options: Partial<DecodingOptions> = {}
  ): Promise<DecodedEUPH> {
    if (!this.isInitialized) {
      await this.initializeWASM();
    }

    const opts: DecodingOptions = {
      validateIntegrity: options.validateIntegrity ?? true,
      loadAIData: options.loadAIData ?? true,
      loadDSPSettings: options.loadDSPSettings ?? true,
      audioContext: options.audioContext || new AudioContext(),
      ...options
    };

    // Parse file structure
    const chunks = this.parseChunks(data);
    
    // Validate file signature and version
    this.validateHeader(chunks);
    
    // Extract components
    const header = this.parseHeader(chunks);
    const metadata = this.parseMetadata(chunks);
    const audioData = await this.parseAudioData(chunks, header, opts.audioContext);
    
    let aiData: any = undefined;
    let dspSettings: object | undefined = undefined;
    
    if (opts.loadAIData) {
      aiData = this.parseAIData(chunks);
    }
    
    if (opts.loadDSPSettings) {
      dspSettings = this.parseDSPData(chunks);
    }
    
    // Validate integrity if requested
    const integrity = opts.validateIntegrity ? 
      this.validateIntegrity(chunks) : 
      { verified: false, checksumMatch: true, corruptedChunks: [] };

    return {
      audioBuffer: audioData,
      metadata,
      aiData,
      dspSettings,
      integrity
    };
  }

  async decodeFile(file: File, options?: Partial<DecodingOptions>): Promise<DecodedEUPH> {
    const arrayBuffer = await file.arrayBuffer();
    return this.decodeArrayBuffer(arrayBuffer, options);
  }

  async decodeURL(url: string, options?: Partial<DecodingOptions>): Promise<DecodedEUPH> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch EUPH file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return this.decodeArrayBuffer(arrayBuffer, options);
  }

  // Streaming decoder for large files
  async *decodeStream(
    stream: ReadableStream<Uint8Array>,
    options?: Partial<DecodingOptions>
  ): AsyncGenerator<{ chunk: string; data: any; progress: number }> {
    const reader = stream.getReader();
    let buffer = new Uint8Array(0);
    let totalSize = 0;
    let processedSize = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Accumulate data
        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;
        
        // Try to parse complete chunks
        let offset = 0;
        while (offset < buffer.length) {
          if (buffer.length - offset < 8) break; // Need at least chunk header
          
          // Read chunk header
          const typeBytes = buffer.slice(offset, offset + 4);
          const type = new TextDecoder().decode(typeBytes);
          const sizeView = new DataView(buffer.buffer, offset + 4, 4);
          const size = sizeView.getUint32(0, true);
          
          if (buffer.length - offset < 8 + size) break; // Incomplete chunk
          
          // Extract chunk data
          const chunkData = buffer.slice(offset + 8, offset + 8 + size);
          
          // Process chunk based on type
          let processedData: any;
          switch (type) {
            case EUPHDecoder.CHUNK_TYPES.HEADER:
              if (totalSize === 0) {
                const headerInfo = this.parseHeaderData(chunkData.buffer);
                totalSize = headerInfo.totalSamples * headerInfo.channels * 4;
              }
              processedData = this.parseHeaderData(chunkData.buffer);
              break;
              
            case EUPHDecoder.CHUNK_TYPES.METADATA:
              processedData = this.parseMetadataData(chunkData.buffer);
              break;
              
            case EUPHDecoder.CHUNK_TYPES.AUDIO:
              processedData = await this.parseAudioChunkData(chunkData.buffer);
              processedSize += size;
              break;
              
            case EUPHDecoder.CHUNK_TYPES.AI_DATA:
              if (options?.loadAIData !== false) {
                processedData = this.parseAIDataChunk(chunkData.buffer);
              }
              break;
              
            case EUPHDecoder.CHUNK_TYPES.DSP_DATA:
              if (options?.loadDSPSettings !== false) {
                processedData = this.parseDSPDataChunk(chunkData.buffer);
              }
              break;
          }
          
          yield {
            chunk: type,
            data: processedData,
            progress: totalSize > 0 ? (processedSize / totalSize) * 100 : 0
          };
          
          offset += 8 + size;
        }
        
        // Keep remaining incomplete data
        if (offset > 0) {
          buffer = buffer.slice(offset);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private parseChunks(data: ArrayBuffer): EUPHChunk[] {
    const chunks: EUPHChunk[] = [];
    const view = new DataView(data);
    const uint8View = new Uint8Array(data);
    
    let offset = 0;
    
    while (offset < data.byteLength) {
      if (offset + 8 > data.byteLength) break; // Not enough data for chunk header
      
      // Read chunk type (4 bytes)
      const typeBytes = uint8View.slice(offset, offset + 4);
      const type = new TextDecoder().decode(typeBytes);
      offset += 4;
      
      // Read chunk size (4 bytes)
      const size = view.getUint32(offset, true);
      offset += 4;
      
      if (offset + size > data.byteLength) {
        throw new Error(`Corrupted EUPH file: chunk extends beyond file boundary`);
      }
      
      // Read chunk data
      const chunkData = data.slice(offset, offset + size);
      offset += size;
      
      chunks.push({
        type,
        size,
        data: chunkData,
        checksum: this.calculateChecksum(chunkData)
      });
    }
    
    return chunks;
  }

  private validateHeader(chunks: EUPHChunk[]): void {
    const headerChunk = chunks.find(c => c.type === EUPHDecoder.CHUNK_TYPES.HEADER);
    if (!headerChunk) {
      throw new Error('Invalid EUPH file: missing header chunk');
    }
    
    const view = new DataView(headerChunk.data);
    const signature = new Uint8Array(headerChunk.data, 0, 4);
    
    // Check signature
    if (!this.arraysEqual(signature, EUPHDecoder.EUPH_SIGNATURE)) {
      throw new Error('Invalid EUPH file: incorrect signature');
    }
    
    // Check version
    const version = view.getUint16(4, true);
    if (version < 0x0200) {
      console.warn(`EUPH file version ${version.toString(16)} may not be fully supported`);
    }
  }

  private parseHeader(chunks: EUPHChunk[]): any {
    const headerChunk = chunks.find(c => c.type === EUPHDecoder.CHUNK_TYPES.HEADER);
    if (!headerChunk) throw new Error('Header chunk not found');
    
    return this.parseHeaderData(headerChunk.data);
  }

  private parseHeaderData(data: ArrayBuffer): any {
    const view = new DataView(data);
    
    return {
      signature: new Uint8Array(data, 0, 4),
      version: view.getUint16(4, true),
      sampleRate: view.getUint32(6, true),
      channels: view.getUint16(10, true),
      bitDepth: view.getUint16(12, true),
      totalSamples: view.getUint32(14, true),
      profile: this.numberToProfile(view.getUint8(18)),
      compressionLevel: view.getUint8(19),
      flags: view.getUint16(20, true)
    };
  }

  private parseMetadata(chunks: EUPHChunk[]): EUPHMetadata {
    const metadataChunk = chunks.find(c => c.type === EUPHDecoder.CHUNK_TYPES.METADATA);
    if (!metadataChunk) {
      throw new Error('Metadata chunk not found');
    }
    
    return this.parseMetadataData(metadataChunk.data);
  }

  private parseMetadataData(data: ArrayBuffer): EUPHMetadata {
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    return JSON.parse(json);
  }

  private async parseAudioData(
    chunks: EUPHChunk[],
    header: any,
    audioContext: AudioContext
  ): Promise<AudioBuffer> {
    const audioChunks = chunks.filter(c => c.type === EUPHDecoder.CHUNK_TYPES.AUDIO);
    if (audioChunks.length === 0) {
      throw new Error('No audio chunks found');
    }
    
    // Decompress and combine audio chunks
    const decompressedChunks: Float32Array[] = [];
    
    for (const chunk of audioChunks) {
      const decompressed = await this.decompressAudioChunk(chunk.data, header);
      decompressedChunks.push(decompressed);
    }
    
    // Combine chunks into single audio buffer
    const totalSamples = decompressedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedData = new Float32Array(totalSamples);
    
    let offset = 0;
    for (const chunk of decompressedChunks) {
      combinedData.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Convert to AudioBuffer
    return this.createAudioBuffer(combinedData, header, audioContext);
  }

  private async parseAudioChunkData(data: ArrayBuffer): Promise<Float32Array> {
    // This would be used in streaming mode
    if (this.wasmModule && this.wasmModule.decompress_audio) {
      return this.wasmModule.decompress_audio(data);
    } else {
      return this.decompressAudioJS(data);
    }
  }

  private async decompressAudioChunk(data: ArrayBuffer, header: any): Promise<Float32Array> {
    if (this.wasmModule && this.wasmModule.decompress_audio) {
      return this.wasmModule.decompress_audio(data, header.profile, header.compressionLevel);
    } else {
      return this.decompressAudioJS(data, header);
    }
  }

  private decompressAudioJS(data: ArrayBuffer, header?: any): Float32Array {
    // JavaScript fallback decompression
    const profile = header?.profile || 'balanced';
    
    switch (profile) {
      case 'lossless':
        return this.losslessDecompress(data);
      case 'balanced':
      case 'compact':
        return new Float32Array(data); // Already float32 data
      default:
        return new Float32Array(data);
    }
  }

  private losslessDecompress(data: ArrayBuffer): Float32Array {
    // Decompress run-length encoded silence
    const compressed = new Float32Array(data);
    const decompressed: number[] = [];
    
    for (let i = 0; i < compressed.length; i++) {
      if (compressed[i] === -999 && i + 1 < compressed.length) {
        // Silence run
        const count = compressed[i + 1];
        for (let j = 0; j < count; j++) {
          decompressed.push(0);
        }
        i++; // Skip count value
      } else {
        decompressed.push(compressed[i]);
      }
    }
    
    return new Float32Array(decompressed);
  }

  private createAudioBuffer(
    interleavedData: Float32Array,
    header: any,
    audioContext: AudioContext
  ): AudioBuffer {
    const { channels, sampleRate } = header;
    const samplesPerChannel = interleavedData.length / channels;
    
    const audioBuffer = audioContext.createBuffer(channels, samplesPerChannel, sampleRate);
    
    // De-interleave channels
    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < samplesPerChannel; i++) {
        channelData[i] = interleavedData[i * channels + channel];
      }
    }
    
    return audioBuffer;
  }

  private parseAIData(chunks: EUPHChunk[]): any {
    const aiChunk = chunks.find(c => c.type === EUPHDecoder.CHUNK_TYPES.AI_DATA);
    if (!aiChunk) return undefined;
    
    return this.parseAIDataChunk(aiChunk.data);
  }

  private parseAIDataChunk(data: ArrayBuffer): any {
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    return JSON.parse(json);
  }

  private parseDSPData(chunks: EUPHChunk[]): object | undefined {
    const dspChunk = chunks.find(c => c.type === EUPHDecoder.CHUNK_TYPES.DSP_DATA);
    if (!dspChunk) return undefined;
    
    return this.parseDSPDataChunk(dspChunk.data);
  }

  private parseDSPDataChunk(data: ArrayBuffer): object {
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    return JSON.parse(json);
  }

  private validateIntegrity(chunks: EUPHChunk[]): {
    verified: boolean;
    checksumMatch: boolean;
    corruptedChunks: string[];
  } {
    const checksumChunk = chunks.find(c => c.type === EUPHDecoder.CHUNK_TYPES.CHECKSUM);
    const corruptedChunks: string[] = [];
    
    if (!checksumChunk) {
      return { verified: false, checksumMatch: false, corruptedChunks };
    }
    
    // Verify individual chunk checksums
    for (const chunk of chunks) {
      if (chunk.type === EUPHDecoder.CHUNK_TYPES.CHECKSUM) continue;
      
      const calculatedChecksum = this.calculateChecksum(chunk.data);
      if (calculatedChecksum !== chunk.checksum) {
        corruptedChunks.push(chunk.type);
      }
    }
    
    // Verify overall file checksum
    const view = new DataView(checksumChunk.data);
    const storedTotalSize = view.getUint32(0, true);
    const storedChecksumCount = view.getUint32(4, true);
    
    let actualTotalSize = 0;
    for (const chunk of chunks) {
      if (chunk.type !== EUPHDecoder.CHUNK_TYPES.CHECKSUM) {
        actualTotalSize += chunk.size;
      }
    }
    
    const checksumMatch = storedTotalSize === actualTotalSize && 
                         storedChecksumCount === chunks.length - 1; // -1 for checksum chunk itself
    
    return {
      verified: true,
      checksumMatch,
      corruptedChunks
    };
  }

  // Utility methods
  private numberToProfile(num: number): string {
    switch (num) {
      case 0: return 'lossless';
      case 1: return 'balanced';
      case 2: return 'compact';
      default: return 'balanced';
    }
  }

  private arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private calculateChecksum(data: ArrayBuffer): number {
    // Same CRC32 implementation as encoder
    const bytes = new Uint8Array(data);
    let crc = 0xFFFFFFFF;
    
    for (const byte of bytes) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        if (crc & 1) {
          crc = (crc >>> 1) ^ 0xEDB88320;
        } else {
          crc >>>= 1;
        }
      }
    }
    
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // Public API methods
  static async validateFile(data: ArrayBuffer): Promise<boolean> {
    try {
      const decoder = new EUPHDecoder();
      const chunks = decoder.parseChunks(data);
      decoder.validateHeader(chunks);
      return true;
    } catch {
      return false;
    }
  }

  static async getFileInfo(data: ArrayBuffer): Promise<{
    valid: boolean;
    version?: string;
    metadata?: EUPHMetadata;
    hasAIData?: boolean;
    hasDSPData?: boolean;
    integrity?: any;
  }> {
    try {
      const decoder = new EUPHDecoder();
      const chunks = decoder.parseChunks(data);
      
      decoder.validateHeader(chunks);
      const header = decoder.parseHeader(chunks);
      const metadata = decoder.parseMetadata(chunks);
      const integrity = decoder.validateIntegrity(chunks);
      
      return {
        valid: true,
        version: `${(header.version >> 8)}.${(header.version & 0xFF)}`,
        metadata,
        hasAIData: chunks.some(c => c.type === EUPHDecoder.CHUNK_TYPES.AI_DATA),
        hasDSPData: chunks.some(c => c.type === EUPHDecoder.CHUNK_TYPES.DSP_DATA),
        integrity
      };
    } catch (error) {
      return { valid: false };
    }
  }

  dispose(): void {
    if (this.wasmModule && this.wasmModule.cleanup) {
      this.wasmModule.cleanup();
    }
    this.wasmModule = null;
    this.isInitialized = false;
  }
}
