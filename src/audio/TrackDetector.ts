import { FFmpeg } from '@ffmpeg/ffmpeg';
import { IAudioMetadata, parseBuffer } from 'music-metadata';

export interface AudioTrack {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate?: number;
  format: string;
  file: File;
}

export class TrackDetector {
  private static ffmpeg: FFmpeg | null = null;

  static async initialize(): Promise<void> {
    if (!this.ffmpeg) {
      this.ffmpeg = new FFmpeg();
      await this.ffmpeg.load({
        coreURL: '/ffmpeg/ffmpeg-core.js',
        wasmURL: '/ffmpeg/ffmpeg-core.wasm',
      });
      console.log('FFmpeg loaded');
    }
  }

  static async detectTracksFromFile(file: File): Promise<AudioTrack[]> {
    const tracks: AudioTrack[] = [];

    // 1. Zkusit získat metadata
    try {
      const arrayBuffer = await file.arrayBuffer();
      const metadata = await parseBuffer(new Uint8Array(arrayBuffer));
      if (metadata) {
        tracks.push(this.metadataToTrack(metadata, file));
      }
    } catch (e) {
      console.warn('Failed to read metadata:', e);
    }

    // 2. Zkusit FFmpeg analýzu, pokud nejsou metadata
    if (tracks.length === 0) {
      try {
        await this.initialize();
        if (this.ffmpeg) {
          const fileData = await file.arrayBuffer();
          await this.ffmpeg.writeFile('input', new Uint8Array(fileData));
          await this.ffmpeg.exec(['-i', 'input', '-f', 'ffmetadata', 'metadata.txt']);
          const metadataData = await this.ffmpeg.readFile('metadata.txt');
          const metadataText = new TextDecoder().decode(metadataData as Uint8Array);
          const ffmpegTrack = this.parseFFmpegMetadata(metadataText, file);
          if (ffmpegTrack) tracks.push(ffmpegTrack);
        }
      } catch (e) {
        console.error('FFmpeg analysis failed:', e);
      }
    }

    // 3. Pokud stále nic, vytvořit základní stopu
    if (tracks.length === 0) {
      tracks.push(this.createBasicTrack(file));
    }

    return tracks;
  }

  private static metadataToTrack(metadata: IAudioMetadata, file: File): AudioTrack {
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: metadata.common.title || file.name.replace(/\.[^/.]+$/, ''),
      artist: metadata.common.artist,
      album: metadata.common.album,
      duration: metadata.format.duration || 0,
      sampleRate: metadata.format.sampleRate || 44100,
      channels: metadata.format.numberOfChannels || 2,
      bitrate: metadata.format.bitrate,
      format:
        metadata.format.codec?.toUpperCase() ||
        file.name.split('.').pop()?.toUpperCase() ||
        'AUDIO',
      file,
    };
  }

  private static parseFFmpegMetadata(metadataText: string, file: File): AudioTrack | null {
    const lines = metadataText.split('\n');
    const metadata: Record<string, string> = {};

    lines.forEach((line) => {
      const [key, ...value] = line.split('=');
      if (key && value.length > 0) {
        metadata[key.trim()] = value.join('=').trim();
      }
    });

    if (!metadata.Duration) return null;

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
      artist: metadata.artist,
      album: metadata.album,
      duration: this.parseDuration(metadata.Duration),
      sampleRate: parseInt(metadata['Stream #0:0']?.match(/Audio:.*?(\d+) Hz/)?.[1] || '44100'),
      channels: metadata['Stream #0:0']?.includes('stereo') ? 2 : 1,
      format: file.name.split('.').pop()?.toUpperCase() || 'AUDIO',
      file,
    };
  }

  private static parseDuration(duration: string): number {
    const [h, m, s] = duration.split(':').map(parseFloat);
    return h * 3600 + m * 60 + s;
  }

  private static createBasicTrack(file: File): AudioTrack {
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name.replace(/\.[^/.]+$/, ''),
      duration: 0,
      sampleRate: 44100,
      channels: 2,
      format: file.name.split('.').pop()?.toUpperCase() || 'AUDIO',
      file,
    };
  }
}
