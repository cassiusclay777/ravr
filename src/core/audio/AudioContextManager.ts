import { createContext } from 'react';
import { StandardizedAudioContext, IAudioContext } from 'standardized-audio-context';

export class AudioContextManager {
  private static instance: AudioContextManager;
  private audioContext: IAudioContext | null = null;
  private isSuspended = true;

  private constructor() {
    // Private constructor to enforce singleton
  }

  public static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  public getAudioContext(): IAudioContext {
    if (!this.audioContext) {
      this.audioContext = new StandardizedAudioContext();
      this.audioContext.suspend(); // Start in suspended state
    }
    return this.audioContext;
  }

  public async resumeContext(): Promise<void> {
    if (!this.audioContext) {
      this.getAudioContext();
    }
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        this.isSuspended = false;
      } catch (error) {
        console.error('Failed to resume audio context:', error);
        throw error;
      }
    }
  }

  public async suspendContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      try {
        await this.audioContext.suspend();
        this.isSuspended = true;
      } catch (error) {
        console.error('Failed to suspend audio context:', error);
        throw error;
      }
    }
  }

  public get isContextSuspended(): boolean {
    return this.isSuspended;
  }

  public async closeContext(): Promise<void> {
    if (this.audioContext) {
      try {
        await this.audioContext.close();
        this.audioContext = null;
        this.isSuspended = true;
      } catch (error) {
        console.error('Failed to close audio context:', error);
        throw error;
      }
    }
  }
}

// Create a single instance
export const audioContextManager = AudioContextManager.getInstance();

// React context for audio context
export const AudioContextContext = createContext<IAudioContext | null>(null);
