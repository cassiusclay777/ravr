import { AudioContextManager } from '../../../audio/AudioContextManager';

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
}

export interface PlayerEvents {
  onPlayStateChange: (isPlaying: boolean) => void;
  onTimeUpdate: (currentTime: number) => void;
  onVolumeChange: (volume: number) => void;
  onEnded: () => void;
  onError: (error: Error) => void;
}

export class PlayerService {
  private audioContextManager: AudioContextManager;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private animationFrameId: number | null = null;
  
  private state: PlayerState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
  };

  private events: Partial<PlayerEvents> = {};

  constructor(audioContextManager: AudioContextManager) {
    this.audioContextManager = audioContextManager;
    this.gainNode = audioContextManager.context.createGain();
    this.gainNode.connect(audioContextManager.context.destination);
  }

  setAudioBuffer(audioBuffer: AudioBuffer): void {
    this.audioBuffer = audioBuffer;
    this.state.duration = audioBuffer.duration;
    this.state.currentTime = 0;
    this.pauseTime = 0;
    this.stop();
  }

  play(): void {
    if (!this.audioBuffer || !this.audioContextManager.context || !this.gainNode) {
      this.events.onError?.(new Error('Audio not initialized'));
      return;
    }

    if (this.state.isPlaying) {
      return;
    }

    try {
      // Create new source node
      this.sourceNode = this.audioContextManager.context.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.playbackRate.value = this.state.playbackRate;
      
      // Connect to gain node
      this.sourceNode.connect(this.gainNode);
      
      // Set up event handlers
      this.sourceNode.onended = () => {
        this.handleEnded();
      };

      // Start playback
      this.sourceNode.start(0, this.pauseTime);
      this.startTime = this.audioContextManager.context.currentTime - this.pauseTime;
      
      this.state.isPlaying = true;
      this.events.onPlayStateChange?.(true);
      
      // Start time update loop
      this.startTimeUpdateLoop();
    } catch (error) {
      this.events.onError?.(error as Error);
    }
  }

  pause(): void {
    if (!this.state.isPlaying || !this.sourceNode) {
      return;
    }

    try {
      this.sourceNode.stop();
      this.sourceNode = null;
      
      this.pauseTime = this.getCurrentTime();
      this.state.isPlaying = false;
      this.events.onPlayStateChange?.(false);
      
      this.stopTimeUpdateLoop();
    } catch (error) {
      this.events.onError?.(error as Error);
    }
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (error) {
        // Ignore errors when stopping already stopped source
      }
      this.sourceNode = null;
    }
    
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.pauseTime = 0;
    this.events.onPlayStateChange?.(false);
    this.events.onTimeUpdate?.(0);
    
    this.stopTimeUpdateLoop();
  }

  seek(time: number): void {
    if (!this.audioBuffer) return;

    const clampedTime = Math.max(0, Math.min(time, this.audioBuffer.duration));
    this.pauseTime = clampedTime;
    this.state.currentTime = clampedTime;
    this.events.onTimeUpdate?.(clampedTime);

    // If playing, restart from new position
    if (this.state.isPlaying) {
      this.pause();
      this.play();
    }
  }

  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.state.volume = clampedVolume;
    
    if (this.gainNode) {
      this.gainNode.gain.value = clampedVolume;
    }
    
    this.events.onVolumeChange?.(clampedVolume);
  }

  setPlaybackRate(rate: number): void {
    const clampedRate = Math.max(0.25, Math.min(4, rate));
    this.state.playbackRate = clampedRate;
    
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = clampedRate;
    }
  }

  getCurrentTime(): number {
    if (!this.audioContextManager.context || !this.audioBuffer) {
      return this.pauseTime;
    }

    if (this.state.isPlaying) {
      return this.audioContextManager.context.currentTime - this.startTime;
    } else {
      return this.pauseTime;
    }
  }

  getState(): PlayerState {
    return { ...this.state };
  }

  // Event handling
  onPlayStateChange(callback: (isPlaying: boolean) => void): void {
    this.events.onPlayStateChange = callback;
  }

  onTimeUpdate(callback: (currentTime: number) => void): void {
    this.events.onTimeUpdate = callback;
  }

  onVolumeChange(callback: (volume: number) => void): void {
    this.events.onVolumeChange = callback;
  }

  onEnded(callback: () => void): void {
    this.events.onEnded = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.events.onError = callback;
  }

  private startTimeUpdateLoop(): void {
    const updateTime = () => {
      if (this.state.isPlaying) {
        this.state.currentTime = this.getCurrentTime();
        this.events.onTimeUpdate?.(this.state.currentTime);
        this.animationFrameId = requestAnimationFrame(updateTime);
      }
    };
    updateTime();
  }

  private stopTimeUpdateLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private handleEnded(): void {
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.pauseTime = 0;
    this.sourceNode = null;
    
    this.events.onPlayStateChange?.(false);
    this.events.onTimeUpdate?.(0);
    this.events.onEnded?.();
    
    this.stopTimeUpdateLoop();
  }

  dispose(): void {
    this.stop();
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    this.events = {};
  }
}

