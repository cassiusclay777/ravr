import { Track } from './Track';
import { AudioContextManager } from './AudioContextManager';
// Using browser's built-in Web Audio API
type AudioNode = globalThis.AudioNode;
type GainNode = globalThis.GainNode;
type AudioContext = globalThis.AudioContext;

export class Mixer {
  private tracks: Map<string, Track> = new Map();
  private masterGain: GainNode;
  private audioContextManager: AudioContextManager;
  private outputNode: AudioNode;
  private soloedTracks: Set<string> = new Set();

  constructor() {
    this.audioContextManager = new AudioContextManager();
    const audioContext = this.audioContextManager.getContext();
    this.outputNode = audioContext.destination;
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.outputNode);
  }

  public createTrack(id: string, name: string): Track {
    if (this.tracks.has(id)) {
      throw new Error(`Track with id ${id} already exists`);
    }

    const track = new Track(id, name, this.audioContextManager, this.masterGain);
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
      this.soloedTracks.delete(id);
      this.updateTrackMuting();
    }
  }

  public getTracks(): Track[] {
    return Array.from(this.tracks.values());
  }

  public setMasterVolume(volume: number): void {
    const audioContext = this.audioContextManager.getContext();
    this.masterGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, volume)),
      audioContext.currentTime,
      0.01
    );
  }

  public muteAll(): void {
    this.tracks.forEach(track => track.mute());
  }

  public unmuteAll(): void {
    this.tracks.forEach(track => track.unmute());
  }

  public soloTrack(trackId: string): void {
    this.soloedTracks.add(trackId);
    this.updateTrackMuting();
  }

  public unsoloTrack(trackId: string): void {
    this.soloedTracks.delete(trackId);
    this.updateTrackMuting();
  }

  private updateTrackMuting(): void {
    const hasSoloedTracks = this.soloedTracks.size > 0;
    
    this.tracks.forEach((track, trackId) => {
      if (hasSoloedTracks) {
        // If there are soloed tracks, mute all except soloed ones
        if (this.soloedTracks.has(trackId)) {
          track.unmute();
        } else {
          track.mute();
        }
      } else {
        // If no tracks are soloed, restore original mute state
        if (track.isMuted) {
          track.mute();
        } else {
          track.unmute();
        }
      }
    });
  }

  public connect(node: AudioNode): void {
    this.masterGain.disconnect();
    this.masterGain.connect(node);
  }

  public dispose(): void {
    this.tracks.forEach(track => track.dispose());
    this.tracks.clear();
    this.soloedTracks.clear();
    this.masterGain.disconnect();
  }
}

export default Mixer;
