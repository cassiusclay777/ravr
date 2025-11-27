declare module '../../pkg/ravr_wasm' {
  export class WasmEuphProcessor {
    constructor();
    createEuphFile(audioData: Uint8Array | Float32Array, metadataJson: string, compression: boolean): Uint8Array;
    loadEuphFile(data: Uint8Array): any;
    getAudioData(): Uint8Array;
    getMetadata(): string;
  }
  export function detect_audio_format(data: Uint8Array): string;
  const _default: any;
  export default _default;
}
