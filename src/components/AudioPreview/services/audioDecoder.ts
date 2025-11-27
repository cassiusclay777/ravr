import { EuphDecoder } from '../../../formats/EuphFormat';

export interface AudioMetadata {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  duration: number;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  format: string;
}

export interface DecodedAudio {
  audioBuffer: AudioBuffer;
  metadata: AudioMetadata;
  channelData: Float32Array[];
}

export class AudioDecoder {
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async decodeFile(file: File): Promise<DecodedAudio> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    switch (fileExtension) {
      case 'euph':
        return this.decodeEuphFile(file);
      case 'wav':
      case 'mp3':
      case 'ogg':
      case 'flac':
      case 'aac':
      case 'm4a':
        return this.decodeStandardFile(file);
      default:
        throw new Error(`Unsupported audio format: ${fileExtension}`);
    }
  }

  async decodeStandardFile(file: File): Promise<DecodedAudio> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    // Extract channel data
    const channelData: Float32Array[] = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channelData.push(audioBuffer.getChannelData(i));
    }

    // Create metadata
    const metadata: AudioMetadata = {
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Unknown Artist',
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      bitDepth: 16, // Default assumption
      channels: audioBuffer.numberOfChannels,
      format: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
    };

    return {
      audioBuffer,
      metadata,
      channelData,
    };
  }

  async decodeEuphFile(file: File): Promise<DecodedAudio> {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new EuphDecoder();
    
    try {
      const result = await decoder.decode(arrayBuffer);
      
      // Convert ArrayBuffer to AudioBuffer
      const audioBuffer = await this.audioContext.decodeAudioData(result.audioData);
      
      // Extract channel data
      const channelData: Float32Array[] = [];
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channelData.push(audioBuffer.getChannelData(i));
      }

      // Use metadata from EUPH file or create default
      const metadata: AudioMetadata = {
        title: result.metadata.title || file.name.replace(/\.[^/.]+$/, ''),
        artist: result.metadata.artist || 'Unknown Artist',
        album: result.metadata.album,
        year: result.metadata.year,
        genre: result.metadata.genre,
        duration: result.metadata.duration || audioBuffer.duration,
        sampleRate: result.metadata.sampleRate || audioBuffer.sampleRate,
        bitDepth: result.metadata.bitDepth || 24,
        channels: result.metadata.channels || audioBuffer.numberOfChannels,
        format: 'EUPH',
      };

      return {
        audioBuffer,
        metadata,
        channelData,
      };
    } catch (error) {
      console.warn('EUPH decoding failed, falling back to standard decoding:', error);
      return this.decodeStandardFile(file);
    }
  }

  async decodeFromUrl(url: string): Promise<DecodedAudio> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    // Extract channel data
    const channelData: Float32Array[] = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channelData.push(audioBuffer.getChannelData(i));
    }

    // Create metadata from URL
    const fileName = url.split('/').pop() || 'Unknown';
    const metadata: AudioMetadata = {
      title: fileName.replace(/\.[^/.]+$/, ''),
      artist: 'Unknown Artist',
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      bitDepth: 16,
      channels: audioBuffer.numberOfChannels,
      format: fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN',
    };

    return {
      audioBuffer,
      metadata,
      channelData,
    };
  }
}

