import { IAudioNode, IAudioParam } from 'standardized-audio-context';

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  duration: number;
  format: string;
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    year?: number;
    trackNumber?: number;
    artwork?: string;
  };
}

export interface AudioNodeConnection {
  source: IAudioNode<AudioContext> | IAudioParam;
  destination: IAudioNode<AudioContext> | IAudioParam;
  outputIndex?: number;
  inputIndex?: number;
}

export interface AudioProcessingNode {
  node: IAudioNode<AudioContext>;
  input: IAudioNode<AudioContext> | IAudioParam;
  output: IAudioNode<AudioContext> | IAudioParam;
  dispose: () => void;
}

export interface AudioProcessingChain {
  nodes: AudioProcessingNode[];
  connect: (source: IAudioNode<AudioContext>, destination: IAudioNode<AudioContext>) => void;
  disconnect: () => void;
  dispose: () => void;
}

export enum AudioPlaybackState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  BUFFERING = 'buffering',
  ERROR = 'error',
}

export interface AudioPlaybackInfo {
  currentTime: number;
  duration: number;
  progress: number;
  state: AudioPlaybackState;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isLooping: boolean;
  isShuffled: boolean;
  currentTrackId: string | null;
  queue: string[];
  history: string[];
}
