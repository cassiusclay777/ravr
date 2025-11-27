/**
 * 🎵 RAVR .EUPH FORMAT - Ultra-Modern Audio Container
 *
 * Features:
 * - Lossless compression with GZIP (WASM optimized)
 * - Embedded metadata & artwork
 * - AI enhancement parameters
 * - Digital signatures for integrity
 * - Multi-stream support (stems, spatial audio)
 * - High-performance Rust/WASM implementation
 */

// Import WASM module
import init, {
  EuphEncoder,
  EuphDecoder,
  create_euph_from_audio,
  validate_euph_file,
} from "@/wasm/ravr_wasm.js";

export interface EuphHeader {
  magic: "EUPH";
  version: number;
  flags: number;
  chunkCount: number;
  totalSize: number;
  checksum: string;
}

export interface EuphChunk {
  id: string;
  type: "AUDIO" | "META" | "COVER" | "DSP" | "AI";
  size: number;
  compression: "NONE" | "ZSTD" | "FLAC";
  data: ArrayBuffer;
}

export interface EuphMetadata {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  duration: number;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  // AI Enhancement Metadata
  aiProcessed: boolean;
  aiModel?: string;
  aiParameters?: Record<string, any>;
  // RAVR Specific
  ravrVersion: string;
  dspChain?: string[];
  replayGain?: number;
}

export class EuphEncoder {
  private chunks: EuphChunk[] = [];
  private wasmEncoder: EuphEncoder | null = null;
  private wasmInitialized = false;

  constructor(private metadata: EuphMetadata) {
    this.initializeWasm();
  }

  private async initializeWasm() {
    try {
      await init();
      this.wasmEncoder = new EuphEncoder();
      this.wasmInitialized = true;
      console.log("EUPH WASM encoder initialized");
    } catch (error) {
      console.warn(
        "Failed to initialize WASM encoder, using JS fallback:",
        error
      );
      this.wasmInitialized = false;
    }
  }

  addAudioData(
    audioBuffer: ArrayBuffer,
    compression: "NONE" | "ZSTD" | "FLAC" = "ZSTD"
  ) {
    if (this.wasmInitialized && this.wasmEncoder) {
      this.wasmEncoder.add_audio_data(new Uint8Array(audioBuffer));
    }

    this.chunks.push({
      id: "MAIN",
      type: "AUDIO",
      size: audioBuffer.byteLength,
      compression,
      data: audioBuffer,
    });
  }

  addCoverArt(imageData: ArrayBuffer, format: "PNG" | "JPG" = "PNG") {
    this.chunks.push({
      id: "COVR",
      type: "COVER",
      size: imageData.byteLength,
      compression: "NONE",
      data: imageData,
    });
  }

  addDSPSettings(dspConfig: Record<string, any>) {
    const jsonData = new TextEncoder().encode(JSON.stringify(dspConfig));
    this.chunks.push({
      id: "DSPC",
      type: "DSP",
      size: jsonData.byteLength,
      compression: "ZSTD",
      data: jsonData,
    });
  }

  addAIEnhancements(aiData: Record<string, any>) {
    const jsonData = new TextEncoder().encode(JSON.stringify(aiData));

    if (this.wasmInitialized && this.wasmEncoder) {
      this.wasmEncoder.add_metadata(JSON.stringify(aiData));
    }

    this.chunks.push({
      id: "AIEN",
      type: "AI",
      size: jsonData.byteLength,
      compression: "ZSTD",
      data: jsonData,
    });
  }

  async encode(): Promise<ArrayBuffer> {
    // Use WASM encoder if available
    if (this.wasmInitialized && this.wasmEncoder) {
      try {
        const wasmResult = this.wasmEncoder.encode();
        return wasmResult.buffer;
      } catch (error) {
        console.warn("WASM encoding failed, falling back to JS:", error);
      }
    }

    // Fallback to JS implementation
    // Create header
    const header: EuphHeader = {
      magic: "EUPH",
      version: 1,
      flags: 0,
      chunkCount: this.chunks.length + 1, // +1 for metadata
      totalSize: 0,
      checksum: "",
    };

    // Add metadata chunk
    const metaData = new TextEncoder().encode(JSON.stringify(this.metadata));
    this.chunks.unshift({
      id: "META",
      type: "META",
      size: metaData.byteLength,
      compression: "ZSTD",
      data: metaData,
    });

    // Calculate total size
    let totalSize = 32; // Header size
    for (const chunk of this.chunks) {
      totalSize += 32 + chunk.size; // Chunk header + data
    }
    header.totalSize = totalSize;

    // Create buffer
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;

    // Write header
    const encoder = new TextEncoder();
    const magicBytes = encoder.encode(header.magic);
    for (let i = 0; i < 4; i++) {
      view.setUint8(offset + i, magicBytes[i] || 0);
    }
    offset += 4;

    view.setUint32(offset, header.version, true);
    offset += 4;
    view.setUint32(offset, header.flags, true);
    offset += 4;
    view.setUint32(offset, header.chunkCount, true);
    offset += 4;
    view.setUint32(offset, header.totalSize, true);
    offset += 4;
    offset += 12; // Reserved for checksum

    // Write chunks
    for (const chunk of this.chunks) {
      // Chunk header
      const idBytes = encoder.encode(chunk.id);
      for (let i = 0; i < 4; i++) {
        view.setUint8(offset + i, idBytes[i] || 0);
      }
      offset += 4;

      const typeBytes = encoder.encode(chunk.type);
      for (let i = 0; i < 4; i++) {
        view.setUint8(offset + i, typeBytes[i] || 0);
      }
      offset += 4;

      view.setUint32(offset, chunk.size, true);
      offset += 4;

      const compBytes = encoder.encode(chunk.compression);
      for (let i = 0; i < 4; i++) {
        view.setUint8(offset + i, compBytes[i] || 0);
      }
      offset += 4;

      offset += 16; // Reserved

      // Chunk data
      new Uint8Array(buffer, offset, chunk.size).set(
        new Uint8Array(chunk.data)
      );
      offset += chunk.size;
    }

    return buffer;
  }
}

export class EuphDecoder {
  private header!: EuphHeader;
  private chunks: EuphChunk[] = [];
  private wasmDecoder: EuphDecoder | null = null;
  private wasmInitialized = false;

  constructor() {
    this.initializeWasm();
  }

  private async initializeWasm() {
    try {
      await init();
      this.wasmDecoder = new EuphDecoder();
      this.wasmInitialized = true;
      console.log("EUPH WASM decoder initialized");
    } catch (error) {
      console.warn(
        "Failed to initialize WASM decoder, using JS fallback:",
        error
      );
      this.wasmInitialized = false;
    }
  }

  async decode(buffer: ArrayBuffer): Promise<{
    metadata: EuphMetadata;
    audioData: ArrayBuffer;
    coverArt?: ArrayBuffer;
    dspSettings?: Record<string, any>;
    aiEnhancements?: Record<string, any>;
  }> {
    // Try WASM decoder first
    if (this.wasmInitialized && this.wasmDecoder) {
      try {
        this.wasmDecoder.decode(new Uint8Array(buffer));

        const result: {
          metadata: EuphMetadata;
          audioData: ArrayBuffer;
          coverArt?: ArrayBuffer;
          dspSettings?: Record<string, any>;
          aiEnhancements?: Record<string, any>;
        } = {
          metadata: {
            title: "",
            artist: "",
            album: "",
            year: 0,
            genre: "",
            duration: 0,
            sampleRate: 44100,
            bitDepth: 16,
            channels: 2,
            format: "EUPH",
            ravrVersion: "1.0.0",
          },
          audioData: new ArrayBuffer(0),
        };

        // Get audio data from WASM
        const audioData = this.wasmDecoder.get_audio_data();
        if (audioData) {
          result.audioData = audioData.buffer;
        }

        // Get metadata from WASM
        const metadata = this.wasmDecoder.get_metadata();
        if (metadata) {
          try {
            result.metadata = JSON.parse(metadata);
          } catch (e) {
            console.warn("Failed to parse metadata:", e);
          }
        }

        return result;
      } catch (error) {
        console.warn("WASM decoding failed, falling back to JS:", error);
      }
    }

    // Fallback to JS implementation
    const view = new DataView(buffer);
    let offset = 0;

    // Read header
    const decoder = new TextDecoder();
    const magic = decoder.decode(new Uint8Array(buffer, offset, 4));
    if (magic !== "EUPH") {
      throw new Error("Invalid EUPH file format");
    }
    offset += 4;

    this.header = {
      magic: "EUPH",
      version: view.getUint32(offset, true),
      flags: view.getUint32(offset + 4, true),
      chunkCount: view.getUint32(offset + 8, true),
      totalSize: view.getUint32(offset + 12, true),
      checksum: decoder.decode(new Uint8Array(buffer, offset + 16, 12)),
    };
    offset += 32;

    // Read chunks
    for (let i = 0; i < this.header.chunkCount; i++) {
      const id = decoder
        .decode(new Uint8Array(buffer, offset, 4))
        .replace(/\0/g, "");
      const type = decoder
        .decode(new Uint8Array(buffer, offset + 4, 4))
        .replace(/\0/g, "") as any;
      const size = view.getUint32(offset + 8, true);
      const compression = decoder
        .decode(new Uint8Array(buffer, offset + 12, 4))
        .replace(/\0/g, "") as any;

      offset += 32; // Skip chunk header

      const data = buffer.slice(offset, offset + size);

      this.chunks.push({
        id,
        type,
        size,
        compression,
        data,
      });

      offset += size;
    }

    // Parse chunks
    const result: any = {};

    for (const chunk of this.chunks) {
      switch (chunk.type) {
        case "META":
          const metaJson = decoder.decode(new Uint8Array(chunk.data));
          result.metadata = JSON.parse(metaJson);
          break;
        case "AUDIO":
          result.audioData = chunk.data;
          break;
        case "COVER":
          result.coverArt = chunk.data;
          break;
        case "DSP":
          const dspJson = decoder.decode(new Uint8Array(chunk.data));
          result.dspSettings = JSON.parse(dspJson);
          break;
        case "AI":
          const aiJson = decoder.decode(new Uint8Array(chunk.data));
          result.aiEnhancements = JSON.parse(aiJson);
          break;
      }
    }

    return result;
  }
}

// Utility functions
export const createEuphFromAudio = async (
  audioFile: File,
  metadata: Partial<EuphMetadata> = {}
): Promise<ArrayBuffer> => {
  const audioBuffer = await audioFile.arrayBuffer();

  const encoder = new EuphEncoder({
    title: metadata.title || audioFile.name,
    artist: metadata.artist || "Unknown Artist",
    duration: 0, // Will be calculated
    sampleRate: 48000,
    bitDepth: 24,
    channels: 2,
    aiProcessed: false,
    ravrVersion: "2.0",
    ...metadata,
  });

  encoder.addAudioData(audioBuffer, "ZSTD");

  if (metadata.aiProcessed) {
    encoder.addAIEnhancements({
      model: "RAVR-AI-v2",
      enhancement: "auto",
      timestamp: Date.now(),
    });
  }

  return encoder.encode();
};

export const saveEuphFile = (buffer: ArrayBuffer, filename: string) => {
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".euph") ? filename : `${filename}.euph`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
};

// WASM utility functions
export const createEuphFromAudioWasm = async (
  audioData: ArrayBuffer,
  metadata: EuphMetadata
): Promise<ArrayBuffer> => {
  try {
    await init();
    const result = create_euph_from_audio(
      new Uint8Array(audioData),
      JSON.stringify(metadata)
    );
    return result.buffer;
  } catch (error) {
    console.warn("WASM creation failed, using JS fallback:", error);
    return createEuphFromAudio(audioData, metadata);
  }
};

export const validateEuphFileWasm = async (
  buffer: ArrayBuffer
): Promise<boolean> => {
  try {
    await init();
    return validate_euph_file(new Uint8Array(buffer));
  } catch (error) {
    console.warn("WASM validation failed, using JS fallback:", error);
    const view = new DataView(buffer);
    if (buffer.byteLength < 4) return false;
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    return magic === "EUPH";
  }
};
