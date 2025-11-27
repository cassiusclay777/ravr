import { AudioContextManager } from './AudioContextManager';
// Using browser's built-in Web Audio API
type AudioBuffer = globalThis.AudioBuffer;
type GainNode = globalThis.GainNode;
type AudioNode = globalThis.AudioNode;

export class Track {
  public readonly id: string;
  public name: string;
  public gainNode: GainNode;
  public isMuted: boolean = false;
  public isSoloed: boolean = false;
  public isRecording: boolean = false;
  public buffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioContext: AudioContext;
  private audioContextManager: AudioContextManager;
  private outputNode: AudioNode | null = null;
  private volume: number = 0.8;

  constructor(
    id: string,
    name: string,
    audioContextManager: AudioContextManager,
    outputNode: AudioNode
  ) {
    this.id = id;
    this.name = name;
    this.audioContextManager = audioContextManager;
    this.audioContext = audioContextManager.getContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume;
    this.outputNode = outputNode;
    this.gainNode.connect(this.outputNode);
  }

  public async loadBuffer(buffer: AudioBuffer): Promise<void> {
    this.buffer = buffer;
    this.createSource();
  }

  public async loadFromUrl(url: string): Promise<void> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.createSource();
  }

  public play(when: number = 0, offset: number = 0): void {
    if (!this.buffer) return;
    
    this.stop();
    this.createSource();
    
    if (this.sourceNode) {
      this.sourceNode.start(when, offset);
    }
  }

  public stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
        // Node was already stopped
      }
      this.sourceNode = null;
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.gainNode.gain.setTargetAtTime(this.volume, this.audioContext.currentTime, 0.01);
  }

  public mute(): void {
    this.isMuted = true;
    this.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
  }

  public unmute(): void {
    this.isMuted = false;
    this.gainNode.gain.setTargetAtTime(this.volume, this.audioContext.currentTime, 0.01);
  }

  public toggleMute(): void {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  public solo(): void {
    this.isSoloed = true;
    // This will be handled by the Mixer
  }

  public unsolo(): void {
    this.isSoloed = false;
    // This will be handled by the Mixer
  }

  public toggleSolo(): void {
    if (this.isSoloed) {
      this.unsolo();
    } else {
      this.solo();
    }
  }

  public connect(node: AudioNode): void {
    this.gainNode.disconnect();
    this.gainNode.connect(node);
  }

  public disconnect(node?: AudioNode): void {
    this.gainNode.disconnect();
    if (node) {
      this.gainNode.connect(node);
    }
  }

  private createSource(): void {
    if (!this.buffer) return;
    
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.buffer;
    this.sourceNode.connect(this.gainNode);
    
    this.sourceNode.onended = () => {
      this.sourceNode = null;
    };
  }

  public dispose(): void {
    this.stop();
    this.disconnect();
    this.buffer = null;
  }
}

export default Track;
