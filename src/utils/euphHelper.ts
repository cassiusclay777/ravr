/**
 * EUPH Format Helper Functions
 * Integrates EUPH codec with RAVR Audio Engine
 */

import { EUPHCodec, type EUPHMetadata } from '../formats/EUPHCodec';

/**
 * Check if a file is EUPH format
 */
export function isEuphFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.euph');
}

/**
 * Load EUPH file and return audio data + metadata
 */
export async function loadEuphFile(file: File): Promise<{
  audioBlob: Blob;
  metadata: EUPHMetadata;
  aiData?: ArrayBuffer;
  dspSettings?: any;
}> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Validate EUPH file
  if (!EUPHCodec.validate(arrayBuffer)) {
    throw new Error('Invalid EUPH file format');
  }
  
  // Decode EUPH
  const result = await EUPHCodec.decode(arrayBuffer);
  
  // Convert audio data to Blob for playback
  const audioBlob = new Blob([result.audioData], { type: 'audio/wav' });
  
  return {
    audioBlob,
    metadata: result.metadata,
    aiData: result.aiData,
    dspSettings: result.dspSettings
  };
}

/**
 * Convert audio file to EUPH format
 */
export async function convertToEuph(
  audioFile: File | Blob,
  metadata: Partial<EUPHMetadata>,
  options?: {
    includeAIData?: boolean;
    includeDSPSettings?: boolean;
    aiData?: ArrayBuffer;
    dspSettings?: any;
  }
): Promise<Blob> {
  const audioArrayBuffer = await audioFile.arrayBuffer();
  
  // Get audio properties (you might want to use music-metadata here)
  const defaultMetadata: EUPHMetadata = {
    duration: 0,
    sampleRate: 44100,
    channels: 2,
    bitDepth: 16,
    encodingProfile: 'balanced',
    ...metadata
  };
  
  // Encode to EUPH
  const euphData = await EUPHCodec.encode(
    audioArrayBuffer,
    defaultMetadata,
    {
      profile: defaultMetadata.encodingProfile,
      compressionLevel: 6,
      includeAIData: options?.includeAIData ?? false,
      includeDSPSettings: options?.includeDSPSettings ?? false,
      enableIntegrityCheck: true
    }
  );
  
  return new Blob([euphData], { type: 'application/octet-stream' });
}

/**
 * Download EUPH file
 */
export function downloadEuphFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.euph') ? filename : `${filename}.euph`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get EUPH file info without full decode (fast)
 */
export async function getEuphInfo(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return await EUPHCodec.getInfo(arrayBuffer);
}
