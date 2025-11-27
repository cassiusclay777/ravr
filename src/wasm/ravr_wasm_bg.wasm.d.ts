/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const __wbg_euphencoder_free: (a: number, b: number) => void;
export const __wbg_euphdecoder_free: (a: number, b: number) => void;
export const euphencoder_new: () => number;
export const euphencoder_addAudioData: (a: number, b: number, c: number) => void;
export const euphencoder_addMetadata: (a: number, b: number, c: number) => [number, number];
export const euphencoder_encode: (a: number) => [number, number, number, number];
export const euphdecoder_new: () => number;
export const euphdecoder_decode: (a: number, b: number, c: number) => [number, number];
export const euphdecoder_getAudioData: (a: number) => [number, number];
export const euphdecoder_getMetadata: (a: number) => [number, number];
export const euphdecoder_getChunkCount: (a: number) => number;
export const create_euph_from_audio: (a: number, b: number, c: number, d: number) => [number, number, number, number];
export const validate_euph_file: (a: number, b: number) => number;
export const __wbindgen_export_0: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_start: () => void;
