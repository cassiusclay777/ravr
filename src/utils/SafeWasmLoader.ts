/**
 * SafeWasmLoader - Bezpečný načítač WASM modulů s validací
 * Řeší buffer overflow a memory corruption problémy
 */

export interface WasmModule {
  module: WebAssembly.Module | null;
  instance: WebAssembly.Instance | null;
  exports: any;
  isValid: boolean;
  error?: string;
}

export class SafeWasmLoader {
  private static readonly MIN_WASM_SIZE = 8; // Minimální validní WASM soubor
  private static readonly MAX_WASM_SIZE = 50 * 1024 * 1024; // 50MB limit
  private static readonly WASM_MAGIC = new Uint8Array([0x00, 0x61, 0x73, 0x6D]); // "\0asm"
  
  /**
   * Validuje WASM binární data před načtením
   */
  private static validateWasmData(data: ArrayBuffer): boolean {
    if (!data || data.byteLength < this.MIN_WASM_SIZE) {
      console.warn('WASM data too small:', data?.byteLength || 0, 'bytes');
      return false;
    }
    
    if (data.byteLength > this.MAX_WASM_SIZE) {
      console.warn('WASM data too large:', data.byteLength, 'bytes');
      return false;
    }
    
    // Kontrola WASM magic number
    const header = new Uint8Array(data, 0, 4);
    if (!this.WASM_MAGIC.every((byte, index) => byte === header[index])) {
      console.warn('Invalid WASM magic number:', Array.from(header));
      return false;
    }
    
    return true;
  }
  
  /**
   * Bezpečně načte WASM modul z URL
   */
  static async loadFromUrl(url: string, imports: any = {}): Promise<WasmModule> {
    const result: WasmModule = {
      module: null,
      instance: null,
      exports: {},
      isValid: false
    };
    
    try {
      console.log('Loading WASM from:', url);
      
      // Fetch s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Validace dat
      if (!this.validateWasmData(arrayBuffer)) {
        throw new Error('WASM validation failed');
      }
      
      // Kompilace modulu
      const module = await WebAssembly.compile(arrayBuffer);
      const instance = await WebAssembly.instantiate(module, imports);
      
      result.module = module;
      result.instance = instance;
      result.exports = instance.exports;
      result.isValid = true;
      
      console.log('✅ WASM module loaded successfully:', url);
      return result;
      
    } catch (error: any) {
      console.error('❌ WASM loading failed:', error.message);
      result.error = error.message;
      return result;
    }
  }
  
  /**
   * Bezpečně načte WASM modul z ArrayBuffer
   */
  static async loadFromBuffer(buffer: ArrayBuffer, imports: any = {}): Promise<WasmModule> {
    const result: WasmModule = {
      module: null,
      instance: null,
      exports: {},
      isValid: false
    };
    
    try {
      // Validace dat
      if (!this.validateWasmData(buffer)) {
        throw new Error('WASM buffer validation failed');
      }
      
      // Kompilace modulu
      const module = await WebAssembly.compile(buffer);
      const instance = await WebAssembly.instantiate(module, imports);
      
      result.module = module;
      result.instance = instance;
      result.exports = instance.exports;
      result.isValid = true;
      
      console.log('✅ WASM module loaded from buffer');
      return result;
      
    } catch (error: any) {
      console.error('❌ WASM buffer loading failed:', error.message);
      result.error = error.message;
      return result;
    }
  }
  
  /**
   * Zkontroluje dostupnost WASM runtime
   */
  static isWasmSupported(): boolean {
    try {
      return typeof WebAssembly === 'object' &&
             typeof WebAssembly.instantiate === 'function' &&
             typeof WebAssembly.compile === 'function';
    } catch {
      return false;
    }
  }
  
  /**
   * Získá informace o WASM runtime
   */
  static getWasmInfo() {
    if (!this.isWasmSupported()) {
      return { supported: false };
    }
    
    return {
      supported: true,
      streaming: typeof WebAssembly.instantiateStreaming === 'function',
      compileStreaming: typeof WebAssembly.compileStreaming === 'function',
      threads: 'SharedArrayBuffer' in globalThis,
      simd: (() => {
        try {
          return WebAssembly.validate(new Uint8Array([
            0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3,
            2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11
          ]));
        } catch {
          return false;
        }
      })()
    };
  }
}

// Export pro běžné použití
export default SafeWasmLoader;
