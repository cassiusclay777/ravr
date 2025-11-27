import { TrackDetector, AudioTrack } from './TrackDetector';

export class AudioPlayer {
  private tracks: AudioTrack[] = [];
  private currentTrackIndex: number = 0;
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async loadFile(file: File): Promise<AudioTrack[]> {
    try {
      // 1. Detekuj stopy
      this.tracks = await TrackDetector.detectTracksFromFile(file);
      console.log('Detected tracks:', this.tracks);
      
      // 2. Načti audio data pro přehrávání
      if (this.tracks.length > 0) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        } catch (e) {
          console.error('Failed to decode audio data:', e);
        }
      }
      
      return this.tracks;
    } catch (error) {
      console.error('Error loading audio file:', error);
      throw error;
    }
  }

  getCurrentTrack(): AudioTrack | null {
    return this.tracks[this.currentTrackIndex] || null;
  }

  getTracks(): AudioTrack[] {
    return [...this.tracks];
  }
  
  setTrack(index: number): boolean {
    if (index >= 0 && index < this.tracks.length) {
      this.currentTrackIndex = index;
      return true;
    }
    return false;
  }
  
  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }
}

export const audioPlayer = new AudioPlayer();
