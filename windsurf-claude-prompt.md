# RAVR Audio Engine - AI/DSP Upgrade Prompt pro Windsurf Editor (Claude Opus 4.1 Thinking)

## Kontext projektu

RAVR is a next-generation web audio player with professional DSP features, built on React 18, TypeScript, Vite, Electron/Tauri. The architecture is solid and functional - it includes a 3-band parametric EQ, DSP chain (Gain → Compressor → Limiter), special modules (Crossfeed, PsychoBass, LossyRescue, Multiband Compressor, Convolution Reverb, Stereo Enhancer), preset system, VST support, and a Python component for audio conversion. It supports MP3, FLAC, WAV, M4A, AAC, OGG, WMA, and AIFF formats.

**CRITICAL: The project MUST NOT be rewritten, only extended and upgraded.**

## Upgrade Goal

Transform RAVR into a next-gen audio player that can take any audio file and create a "better than original" sound using AI/DSP remastering, automatic genre-adaptive mastering, and a new .euph format for intelligent audio reconstruction.

## Key Requirements for Upgrade

### 1. AI/DSP Remastering Engine

- Integrate AI models: AudioSR (super-resolution), Demucs (separation), DDSP (harmonic reconstruction)
- Automatic sound enhancement without user configuration
- Real-time processing for direct playback or export to .euph format
- Fill in missing harmonic, spatial, and dynamic details
- Result: "From MP3 to something that blows your mind"

### 2. Genre-Adaptive Mastering

- Automatic genre detection
- Intelligent application of optimized mastering according to genre:
  - Industrial/Techno: more bass, dynamics, space
  - Ambient: more space, reverbs, width
  - Jazz/Vocals: warmth, harmonics, midrange
  - Classical: natural dynamics, spatial distribution
- No manual intervention - everything automatic on 1 click

### 3. .euph Format (Euphoria Audio Container)

**Container Structure:**

```plaintext
Header: magic "EUPH", version, length, crc32
Audio Seed: original audio data (Opus/FLAC/WAV/MP3)
Metadata: genre, mood, tempo, key, spatial_profile
AI/DSP Payload: serialized AI model/parameters for reconstruction
Relativistic Effects: spatial maps, time dilation, Doppler params
Signature: author, license, timestamp, integrity_hash
```

**Functionality:**

- During playback: option to choose between raw audio or AI-enhanced version
- Export function: "Save as .euph" with configurable remastering intensity
- Backwards compatibility: .euph files work in regular players (fallback to raw audio)
- Open source decoder for wide adoption

### 4. Experimental "Relativistic" Effects

- Spatial simulation (HRTF, Ambisonics, source movement in 3D space)
- Time dilation (controlled slowing down/speeding up of track parts)
- Doppler effect (simulation of moving source)
- Gravitational "warping" of sound waves (psychoacoustic effects)
- All as "Labs" or "Insane Mode" for advanced users

### 5. Technical Architecture for Robustness

**Recommended Tech Stack:**

- **Core Audio Engine**: Rust or C++ (maximum performance, real-time processing)
- **Frontend UI**: keep React + TypeScript (current architecture)
- **Desktop wrapper**: Tauri (Rust-based, faster than Electron)
- **AI/ML preprocessing**: Python (PyTorch, ONNX, librosa, scipy)
- **Audio libs**: Rust (cpal, symphonia, onnx-runtime) or C++ (JUCE, LibSoX, ONNX)

### 6. User Experience

- **Simple workflow**: Drag & Drop → automatic analysis → enhanced playback/export
- **Minimal UI**: main features on 1 click, advanced features hidden in Labs mode
- **Preset system**: expand to include AI-enhanced presets (Neutron AI, Industrial Beast, Ambient Space, Vocal Warmth)
- **Real-time feedback**: visual indication of AI processing, quality enhancement metrics

### 7. Compatibility and Openness

- Keep support for all current formats
- .euph as a premium upgrade, not a replacement
- Open source .euph decoder
- API for community plugins and AI models
- Documentation of the format for adoption

## Specific Implementation Tasks

1. **Extend the existing DSP pipeline** with AI remastering layer
2. **Implement genre detection** and adaptive mastering profiles
3. **Design and implement the .euph container format**
4. **Integrate AI models** (AudioSR/Demucs/DDSP) into the playback pipeline
5. **Add export function** for .euph files with configurable remastering intensity
6. **Create experimental "relativistic" audio effects**
7. **Optimize for real-time performance**
8. **Refine open source decoder and documentation**

## Expected Outcome

A player that can take any audio file and automatically create a subjectively better sound using AI/DSP remastering, automatic genre-adaptive mastering, and a new .euph format for intelligent audio reconstruction. All with minimal user interaction, maximum sound quality, and preservation of elegance and robustness of the current architecture.

> "Take a track, listen better. No manual intervention, just magic."

## Notes on Implementation

- Use the current component-based architecture
- Extend, not rewrite, the existing DSP modules
- Keep compatibility with VST plugins
- Load AI models asynchronously to avoid UI blocking
- Fallback modes for weaker hardware
- Extensive logging and error handling for AI pipeline
- Community feedback loop for further development
