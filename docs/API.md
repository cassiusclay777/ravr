# RAVR Audio Engine API Documentation

## Overview

RAVR Audio Engine provides a comprehensive API for advanced audio processing, AI enhancement, and format handling. This document covers all major APIs and their usage.

## Table of Contents

- [Audio Engine Core](#audio-engine-core)
- [AI Enhancement Pipeline](#ai-enhancement-pipeline)
- [DSP Processing](#dsp-processing)
- [Export/Import System](#exportimport-system)
- [Settings Management](#settings-management)
- [EUPH Format](#euph-format-1)
- [Relativistic Effects](#relativistic-effects)

## Audio Engine Core

### AudioContextManager

Central manager for Web Audio API contexts and audio processing.

```typescript
import { AudioContextManager } from '@/audio/AudioContextManager';

// Initialize audio context
const audioManager = new AudioContextManager();
await audioManager.initialize();

// Get audio context
const audioContext = audioManager.getContext();

// Set sample rate and buffer size
await audioManager.setSampleRate(48000);
await audioManager.setBufferSize(512);
```

### AutoPlayer

Advanced audio player with gapless playback and crossfading.

```typescript
import { AutoPlayer } from '@/audio/AutoPlayer';

const player = new AutoPlayer(audioContext);

// Load and play audio
await player.loadAudio('/path/to/audio.mp3');
player.play();

// Control playback
player.pause();
player.stop();
player.seek(30); // Seek to 30 seconds

// Set volume and crossfade
player.setVolume(0.8);
player.setCrossfadeDuration(3000); // 3 seconds
```

## AI Enhancement Pipeline

### ONNXModelManager

Manages ONNX models for AI audio processing.

```typescript
import { ONNXModelManager, ModelConfig } from '@/ai/ONNXModelManager';

const modelManager = new ONNXModelManager();

// Register a model
const modelConfig: ModelConfig = {
  name: 'audio-enhancer',
  url: '/models/enhancer.onnx',
  inputShape: [1, 1, 16384],
  outputShape: [1, 1, 16384],
  inputType: 'float32',
  outputType: 'float32'
};

modelManager.registerModel(modelConfig);

// Load and use model
await modelManager.loadModel('audio-enhancer');
const inputData = new Float32Array(16384);
const enhanced = await modelManager.runInference('audio-enhancer', inputData);
```

### AudioSR Model

Super-resolution audio enhancement using AI.

```typescript
import { AudioSRModel } from '@/ai/AudioSRModel';

const audioSR = new AudioSRModel(modelManager);
await audioSR.initialize();

// Enhance audio quality
const enhancedBuffer = await audioSR.enhance(originalAudioBuffer, {
  scale: 2,
  targetSampleRate: 88200
});
```

### Demucs Model

Source separation for isolating stems (vocals, drums, bass, other).

```typescript
import { DemucsModel } from '@/ai/DemucsModel';

const demucs = new DemucsModel(modelManager);
await demucs.initialize();

// Separate audio into stems
const stems = await demucs.separate(audioBuffer);
console.log(stems.vocals, stems.drums, stems.bass, stems.other);
```

### DDSP Model

Differentiable Digital Signal Processing for harmonic synthesis.

```typescript
import { DDSPModel } from '@/ai/DDSPModel';

const ddsp = new DDSPModel(modelManager);
await ddsp.initialize();

// Analyze and resynthesize audio
const { resynthesized, parameters } = await ddsp.analyzeAndResynthesize(audioBuffer);

// Modify timbre
const modified = await ddsp.modifyTimbre(audioBuffer, {
  f0Scale: 1.2,      // Pitch up 20%
  loudnessScale: 1.1, // Louder
  harmonicShift: 2    // Shift harmonics
});
```

## DSP Processing

### ParametricEQ

3-band parametric equalizer with real-time processing.

```typescript
import { ParametricEQ } from '@/dsp/ParametricEQ';

const eq = new ParametricEQ(audioContext);

// Set EQ parameters
eq.setLowGain(2);     // +2dB low
eq.setMidGain(-1);    // -1dB mid
eq.setHighGain(3);    // +3dB high

// Set frequencies
eq.setLowFreq(100);   // Low shelf at 100Hz
eq.setMidFreq(1000);  // Mid peak at 1kHz
eq.setHighFreq(8000); // High shelf at 8kHz

// Connect to audio graph
sourceNode.connect(eq.input);
eq.output.connect(audioContext.destination);
```

### CompressorModule

Multi-band compressor with sidechain support.

```typescript
import { CompressorModule } from '@/dsp/CompressorModule';

const compressor = new CompressorModule(audioContext);

// Set compression parameters
compressor.setThreshold(-12);  // -12dB threshold
compressor.setRatio(4);        // 4:1 ratio
compressor.setAttack(0.003);   // 3ms attack
compressor.setRelease(0.1);    // 100ms release
compressor.setKnee(6);         // 6dB knee
compressor.setMakeupGain(3);   // +3dB makeup gain
```

### StereoEnhancer

Stereo width and imaging enhancement.

```typescript
import { StereoEnhancer } from '@/dsp/StereoEnhancer';

const stereoEnhancer = new StereoEnhancer(audioContext);

// Set stereo width (0.0 = mono, 1.0 = normal, 2.0 = extra wide)
stereoEnhancer.setWidth(1.5);

// Enable bass mono (keeps low frequencies centered)
stereoEnhancer.setBassMono(true);
stereoEnhancer.setBassCutoff(120); // 120Hz cutoff
```

## Export/Import System

### ExportImportManager

Handles file export/import with multiple formats and batch processing.

```typescript
import { ExportImportManager, ExportOptions } from '@/export/ExportImportManager';

const exportManager = new ExportImportManager();

// Export single file
const exportOptions: ExportOptions = {
  format: 'euph',
  quality: 'lossless',
  includeMetadata: true,
  includeAIModel: true,
  compression: true,
  compressionLevel: 6
};

const blob = await exportManager.exportFile(
  audioBuffer,
  metadata,
  exportOptions,
  'enhanced-audio.euph'
);

// Download file
exportManager.downloadBlob(blob, 'enhanced-audio.euph');

// Batch processing
const files = [file1, file2, file3];
const { results, errors } = await exportManager.batchProcess(files, {
  ...exportOptions,
  maxConcurrency: 4,
  progressCallback: (progress, fileName) => {
    console.log(`Processing ${fileName}: ${progress}%`);
  }
});
```

### Import Files

```typescript
// Import single file
const importResult = await exportManager.importFile(file, {
  autoDetectFormat: true,
  enhanceAudio: true,
  extractStems: false,
  applyAIEnhancement: true
});

console.log(importResult.audioBuffer);
console.log(importResult.metadata);
console.log(importResult.enhanced); // AI-enhanced version
```

## Settings Management

### SettingsManager

Comprehensive settings system with persistence and validation.

```typescript
import { SettingsManager, useSettingsStore } from '@/settings/SettingsManager';

const settingsManager = new SettingsManager();

// Update audio settings
const { updateAudioSettings } = useSettingsStore.getState();
updateAudioSettings({
  sampleRate: 48000,
  bufferSize: 512,
  enableReplayGain: true
});

// Update UI settings
const { updateUISettings } = useSettingsStore.getState();
updateUISettings({
  theme: 'dark',
  accentColor: '#6366f1',
  enableAnimations: true
});

// Export/import settings
settingsManager.exportSettingsFile();
await settingsManager.importSettingsFile(settingsFile);
```

### Available Settings Categories

#### Audio Settings

- `outputDevice`: Audio output device ID
- `sampleRate`: Sample rate (44100, 48000, 96000)
- `bufferSize`: Buffer size (128, 256, 512, 1024)
- `latency`: Latency mode ('low', 'balanced', 'high')
- `enableReplayGain`: ReplayGain normalization
- `crossfadeDuration`: Crossfade duration in ms

#### DSP Settings

- `enableAI`: Enable AI enhancement
- `aiEnhancementLevel`: AI enhancement strength (0-1)
- `enableRelativisticEffects`: Enable spatial effects
- `enableHRTF`: Head-Related Transfer Function
- `enableCrossfeed`: Crossfeed for headphones

#### UI Settings

- `theme`: UI theme ('light', 'dark', 'auto')
- `accentColor`: Accent color (hex)
- `fontSize`: Font size ('small', 'medium', 'large')
- `spectrumStyle`: Spectrum visualization style
- `compactMode`: Compact UI mode

#### Keyboard Settings

- `enableKeyboardShortcuts`: Enable keyboard shortcuts
- `keyboardShortcuts`: Custom keyboard shortcuts

### EUPH File Structure

EUPH (Enhanced Universal Psychoacoustic Hybrid) format supports:

- Original audio data (multiple formats)
- AI-enhanced models and processing data
- DSP chain configuration
- Relativistic effects data
- Metadata and signatures

```typescript
// Create EUPH file
const euphEncoder = new EuphEncoder();
euphEncoder.setMetadata(metadata);
euphEncoder.addAudioData(audioData, true); // compressed
euphEncoder.addAIModel(modelData, true);
euphEncoder.addDSPChain(dspConfig, true);

const euphBlob = await euphEncoder.encode();

// Read EUPH file
const euphProcessor = new WasmEuphProcessor();
const info = euphProcessor.loadEuphFile(euphData);
const audioData = euphProcessor.getAudioData();
const metadata = JSON.parse(euphProcessor.getMetadata());
```

### EUPH Chunks

- **AUDIO**: Original audio data (OPUS, FLAC, WAV, MP3)
- **METADATA**: JSON metadata with genre, mood, spatial profile
- **AI_MODEL**: Serialized AI enhancement parameters
- **DSP_CHAIN**: Complete DSP configuration
- **RELATIVISTIC**: Spatial movement and time dilation data
- **SIGNATURE**: Author info and integrity verification

## Relativistic Effects

### Spatial Audio Processing

Advanced 3D audio with HRTF, Doppler effects, and gravitational time dilation.

```typescript
import { RelativisticEffects } from '@/dsp/RelativisticEffects';

const relativistic = new RelativisticEffects(44100);
relativistic.setEnabled(true);

// Add gravity well (creates time dilation and frequency shifts)
relativistic.addGravityWell(
  { x: 0, y: 0, z: 0 },  // position
  1000,                   // mass
  50                      // radius
);

// Set source movement path
const path = [
  { x: -10, y: 0, z: 0 },
  { x: 0, y: 0, z: 0 },
  { x: 10, y: 0, z: 0 }
];
const velocity = { x: 5, y: 0, z: 0 };
relativistic.setSourceMovement(path, velocity);

// Process audio frame
const processedAudio = relativistic.processFrame(inputAudio, 44100);
```

### Time Dilation

```typescript
// Set time dilation curve
const dilationCurve = [
  { time: 0.0, dilationFactor: 1.0 },   // Normal time
  { time: 2.0, dilationFactor: 0.5 },   // Time slowed to 50%
  { time: 4.0, dilationFactor: 2.0 },   // Time sped up 2x
  { time: 6.0, dilationFactor: 1.0 }    // Back to normal
];
relativistic.setTimeDilationCurve(dilationCurve);
```

## Error Handling

All APIs include comprehensive error handling:

```typescript
try {
  const result = await exportManager.exportFile(audioBuffer, metadata, options);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network issue:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Performance Considerations

### Memory Management

```typescript
// Clean up resources
audioSR.dispose();
demucs.dispose();
ddsp.dispose();
modelManager.unloadAllModels();
exportManager.dispose();
```

### Optimization Tips

1. **Use appropriate buffer sizes** - Larger buffers reduce CPU usage but increase latency
2. **Enable compression** - For EUPH files to reduce file size
3. **Batch processing** - Process multiple files concurrently with controlled concurrency
4. **Model preloading** - Load AI models during application initialization
5. **Memory monitoring** - Dispose of unused resources promptly

## WebAssembly Integration

RAVR uses WebAssembly for performance-critical operations:

```typescript
// WASM modules are automatically loaded
const wasmModule = await import('../../pkg/ravr_wasm');
const processor = new wasmModule.WasmEuphProcessor();
```

## Browser Compatibility

### Supported Browsers

- Chrome 66+
- Firefox 60+
- Safari 14+
- Edge 79+

### Required Features

- Web Audio API
- WebAssembly
- SharedArrayBuffer (for multi-threading)
- AudioWorklet (for real-time processing)

## Examples

See the `/examples` directory for complete usage examples:

- Basic audio processing
- AI enhancement workflow
- Batch file processing
- Custom DSP effects
- EUPH format handling
