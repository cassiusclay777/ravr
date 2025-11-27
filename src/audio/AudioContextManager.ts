import { Track } from './Track';
import { EQChain } from '../dsp/EQChain';

export class AudioContextManager {
  public readonly context: AudioContext;
  private tracks: Map<string, Track> = new Map();
  private activeTrackId: string | null = null;
  private masterGain: GainNode;
  private eqChain: EQChain;
  private startTime: number = 0;
  private analyser: AnalyserNode | null = null;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.eqChain = new EQChain(this.context);
    
    // Connect: masterGain -> EQ -> destination
    this.masterGain.connect(this.eqChain.getInputNode());
    this.eqChain.getOutputNode().connect(this.context.destination);

    // Create a default track
    this.createTrack('track-1', 'Track 1');
    this.setActiveTrack('track-1');
  }

  public createTrack(id: string, name: string, options?: { volume?: number }): Track {
    const track = new Track(id, name, this, this.masterGain);
    if (options?.volume !== undefined) {
      track.setVolume(options.volume);
    }
    this.tracks.set(id, track);
    return track;
  }

  public getTrack(id: string): Track | undefined {
    return this.tracks.get(id);
  }

  public removeTrack(id: string): void {
    const track = this.tracks.get(id);
    if (track) {
      track.dispose();
      this.tracks.delete(id);
      if (this.activeTrackId === id) {
        this.activeTrackId = this.tracks.keys().next().value || null;
      }
    }
  }

  public getTracks(): Track[] {
    return Array.from(this.tracks.values());
  }

  public getAnalyser(): AnalyserNode {
    if (!this.analyser) {
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.eqChain.getOutputNode().connect(this.analyser);
    }
    return this.analyser;
  }

  public getEQChain(): EQChain {
    return this.eqChain;
  }

  public getCurrentTime(): number {
    return this.context.currentTime - this.startTime;
  }

  public getDuration(): number {
    // This is a placeholder - you'll need to implement actual duration tracking
    // based on your audio source
    return 0;
  }

  public seek(time: number): void {
    // Implement seeking logic here
    this.startTime = this.context.currentTime - time;
  }

  public cleanup(): void {
    // Clean up resources
    this.tracks.forEach(track => track.dispose());
    this.tracks.clear();
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    this.eqChain.destroy();
    this.masterGain.disconnect();
  }

  public setActiveTrack(id: string): void {
    if (this.tracks.has(id)) {
      this.activeTrackId = id;
    }
  }

  public getActiveTrack(): Track | null {
    return this.activeTrackId ? this.tracks.get(this.activeTrackId) || null : null;
  }

  public getContext(): AudioContext {
    return this.context;
  }

  public async loadAudio(url: string, trackId?: string): Promise<AudioBuffer> {
    const track = trackId ? this.getTrack(trackId) : this.getActiveTrack();
    if (!track) throw new Error('No track available to load audio');

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

      await track.loadBuffer(audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('Error loading audio:', error);
      throw error;
    }
  }

  public async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  public async suspend(): Promise<void> {
    if (this.context.state === 'running') {
      await this.context.suspend();
    }
  }

  public setVolume(level: number, trackId?: string): void {
    const volume = Math.max(0, Math.min(1, level));
    if (trackId) {
      const track = this.getTrack(trackId);
      track?.setVolume(volume);
    } else {
      this.masterGain.gain.setValueAtTime(volume, this.context.currentTime);
    }
  }

  public async dispose(): Promise<void> {
    // Stop and dispose all tracks
    this.tracks.forEach((track) => track.dispose());
    this.tracks.clear();

    // Clean up EQ chain
    this.eqChain.destroy();

    // Disconnect and clean up master gain
    this.masterGain.disconnect();

    // Close the audio context properly
    if (this.context.state !== 'closed') {
      try {
        await this.context.close();
      } catch (e) {
        // Log and swallow errors to prevent unhandled promise rejection
        console.error('Failed to close AudioContext:', e);
      }
    }
  }
}
