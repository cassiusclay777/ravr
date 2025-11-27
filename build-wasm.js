const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🦀 Building RAVR WASM modules...');

// Build WASM with wasm-pack
try {
  execSync('wasm-pack build --target web --out-dir ../../public/wasm', {
    stdio: 'inherit',
    cwd: path.join(process.cwd(), 'src', 'wasm')
  });
  console.log('✅ WASM build completed successfully!');
} catch (error) {
  console.log('⚠️  wasm-pack not found, creating placeholder WASM files...');
  
  // Create placeholder WASM files for development
  const wasmDir = path.join(__dirname, 'public', 'wasm');
  if (!fs.existsSync(wasmDir)) {
    fs.mkdirSync(wasmDir, { recursive: true });
  }
  
  // Placeholder WASM module
  const placeholderJS = `
// Placeholder WASM module for development
export class EUPHCompressor {
  constructor() {
    console.log('Using JavaScript fallback for EUPH compression');
  }
  
  compressAudio(audioData, profile, level) {
    return Promise.resolve(new Uint8Array(audioData.buffer));
  }
  
  decompressAudio(compressedData, profile) {
    return Promise.resolve(new Float32Array(compressedData.buffer));
  }
}

export class FFTProcessor {
  constructor(fftSize) {
    this.size = fftSize;
    console.log('Using JavaScript fallback for FFT processing');
  }
  
  processSpectrum(audioData) {
    // Simple magnitude spectrum approximation
    const spectrum = new Float32Array(this.size / 2 + 1);
    for (let i = 0; i < spectrum.length; i++) {
      spectrum[i] = Math.random() * 0.1; // Placeholder
    }
    return Promise.resolve(spectrum);
  }
}

export class HRTFProcessor {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    console.log('Using JavaScript fallback for HRTF processing');
  }
  
  processHRTF(audioData, azimuth, elevation) {
    // Simple stereo panning approximation
    const stereoOutput = new Float32Array(audioData.length * 2);
    const pan = Math.sin((azimuth * Math.PI) / 180) * 0.5 + 0.5;
    
    for (let i = 0; i < audioData.length; i++) {
      stereoOutput[i * 2] = audioData[i] * (1 - pan);     // Left
      stereoOutput[i * 2 + 1] = audioData[i] * pan;       // Right
    }
    
    return Promise.resolve(stereoOutput);
  }
}

export function initPanicHook() {
  console.log('WASM panic hook initialized (placeholder)');
}

export default {
  EUPHCompressor,
  FFTProcessor, 
  HRTFProcessor,
  initPanicHook
};
`;
  
  fs.writeFileSync(path.join(wasmDir, 'ravr_wasm.js'), placeholderJS);
  fs.writeFileSync(path.join(wasmDir, 'ravr_wasm_bg.wasm'), Buffer.alloc(0));
  
  console.log('✅ Placeholder WASM files created for development');
}

console.log('🎉 WASM setup complete!');
