declare module 'web-audio-engine' {
  export class AudioNode {
    connect(node: AudioNode): void;
    disconnect(): void;
    // Add other AudioNode methods as needed
  }
  
  // Add other exports from web-audio-engine as needed
}
