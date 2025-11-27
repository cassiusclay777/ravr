# 🎵 RAVR Audio Engine v2.0

**The Next Generation Web Audio Experience**

RAVR is a cutting-edge web-based audio engine that combines professional-grade DSP processing, AI-powered enhancement, and revolutionary physics-based effects to deliver an unprecedented audio experience.

## 🌟 Key Features

### 🤖 AI-Powered Audio Enhancement
- **AudioSR**: Real-time super-resolution upsampling
- **Demucs**: Advanced stem separation technology  
- **DDSP**: Neural harmonic synthesis
- **Smart Genre Detection**: Automatic audio classification

### 🎛️ Professional DSP Suite
- **3-Band Parametric EQ** with real-time visualization
- **Multiband Compressor** with sidechain support
- **Convolution Reverb** with premium impulse responses
- **3D Spatial Audio** with HRTF processing
- **Relativistic Effects**: Doppler, time dilation, gravitational redshift

### 🚀 Advanced Features
- **EUPH Format**: Next-gen audio format with AI metadata
- **VST Plugin Support**: Industry-standard plugin compatibility
- **MIDI Integration**: Full controller support with auto-detection
- **Real-time Collaboration**: WebRTC-powered audio sharing
- **Cloud Sync**: Multi-provider synchronization

### 🎨 Modern Interface
- **Gesture Control**: Touch and mouse gesture recognition
- **Advanced Animations**: Fluid, physics-based UI
- **Real-time Visualization**: FFT spectrum analysis
- **Dark/Light Themes**: Customizable appearance

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Modern web browser with Web Audio API support
- Optional: MIDI controller for enhanced control

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ravr-audio/ravr-engine.git
cd ravr-engine
```

2. **Install dependencies**
```bash
npm install
```

3. **Build WASM modules** (optional, falls back to JS)
```bash
npm run build-wasm
```

4. **Start development server**
```bash
npm run dev
```

5. **Open in browser**
Navigate to `http://localhost:5173`

### Desktop Applications

**Electron (Windows/macOS/Linux)**
```bash
npm run electron-dev    # Development
npm run electron-pack   # Build package
```

**Tauri (Native performance)**
```bash
npm run tauri          # Development  
npm run tauri-build    # Build native app
```

## 📖 User Guide

### Basic Audio Playback

1. **Load Audio Files**
   - Drag & drop files onto the interface
   - Use File → Open (Ctrl/Cmd + O)
   - Supported formats: MP3, WAV, FLAC, M4A, OGG, EUPH

2. **Playback Controls**
   - **Space**: Play/Pause
   - **Escape**: Stop
   - **Left/Right arrows**: Seek ±5 seconds
   - **Up/Down arrows**: Volume ±10%

3. **DSP Chain**
   - Effects are processed in order: Gain → EQ → Compressor → Reverb → Limiter
   - Real-time parameter adjustment
   - Preset system with factory presets

### Advanced Features

#### AI Enhancement

1. **Enable AI Processing**
   - Go to Settings → AI Enhancement
   - Select desired models (AudioSR, Demucs, etc.)
   - Models download automatically on first use

2. **Real-time Enhancement**
   - Toggle AI processing per track
   - Adjust enhancement strength
   - Preview before/after comparison

#### MIDI Control

1. **Connect MIDI Device**
   - Plug in USB MIDI controller
   - RAVR auto-detects common controllers
   - Manual mapping available for custom devices

2. **MIDI Learning**
   - Right-click any parameter
   - Select "MIDI Learn"
   - Move desired MIDI control
   - Mapping saved automatically

3. **Supported Controllers**
   - Akai MPK Mini MK3
   - Novation Launchpad X  
   - Behringer X-Touch Mini
   - Any generic MIDI controller

#### VST Plugins

1. **Install VST Plugins**
   - Place VST2/VST3 files in standard directories
   - Scan plugins: Audio → Scan VST Plugins
   - Or manually add plugin directories

2. **Load Plugins**
   - Browse available plugins in DSP panel
   - Drag plugin to desired position in chain
   - Adjust parameters in real-time

#### Collaboration

1. **Start Collaboration Session**
   - Click Collaborate button
   - Create new session or join existing
   - Share session ID with collaborators

2. **Real-time Sync**
   - Playback position synchronized
   - DSP changes broadcast to all participants
   - Voice chat support (mic required)

### Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Play/Pause | Space | Toggle playback |
| Stop | Escape | Stop playback |
| Open File | Ctrl/Cmd + O | Load audio file |
| Save Project | Ctrl/Cmd + S | Save current project |
| Export Audio | Ctrl/Cmd + E | Export processed audio |
| Toggle EQ | E | Show/hide EQ panel |
| Toggle Spectrum | S | Show/hide spectrum analyzer |
| Toggle Settings | , (comma) | Open settings |
| Full Screen | F11 | Toggle fullscreen mode |

## 🔧 Configuration

### Audio Settings

- **Output Device**: Select audio output device
- **Sample Rate**: 44.1kHz, 48kHz, 88.2kHz, 96kHz
- **Buffer Size**: 256-4096 samples (affects latency)
- **Bit Depth**: 16/24/32-bit processing

### DSP Configuration

- **Processing Quality**: Draft, Standard, High, Ultra
- **Oversampling**: 2x, 4x, 8x for ultra-high quality
- **Latency Compensation**: Auto-adjust for plugin delays
- **Thread Count**: CPU cores to use for processing

### AI Model Settings

- **Model Quality**: Fast, Balanced, High Quality
- **Cache Size**: Local model cache limit
- **Auto-Download**: Enable automatic model updates
- **Offline Mode**: Use cached models only

## 🎹 DSP Reference

### Parametric EQ
- **3 Bands**: Low, Mid, High with adjustable frequency
- **Filter Types**: Bell, High-shelf, Low-shelf, High-pass, Low-pass
- **Q Factor**: 0.1 - 10.0 (bandwidth control)
- **Gain Range**: ±15dB per band

### Compressor
- **Threshold**: -60dB to 0dB
- **Ratio**: 1:1 to 20:1  
- **Attack**: 0.1ms to 100ms
- **Release**: 10ms to 1000ms
- **Knee**: Hard or Soft compression curve
- **Makeup Gain**: Auto or manual

### Reverb Engine
- **Algorithm**: Convolution with premium impulse responses
- **Room Types**: Hall, Plate, Chamber, Spring, Shimmer
- **Parameters**: Size, Decay, Pre-delay, Damping, Mix
- **Modulation**: Chorus, Pitch shift for shimmer effects

### Spatial Audio
- **HRTF Database**: High-quality head-related transfer functions
- **3D Positioning**: Azimuth, elevation, distance
- **Room Simulation**: Early reflections, reverberation
- **Binaural Rendering**: Optimized for headphones

### Relativistic Effects
- **Doppler Shift**: Simulate moving audio sources
- **Time Dilation**: Special relativity time effects  
- **Gravitational Redshift**: General relativity frequency shifts
- **Velocity Simulation**: Up to 0.1c (30,000 km/s)

## 🔌 Plugin Development

### Creating Custom Plugins

RAVR supports custom JavaScript plugins with sandboxed execution:

```javascript
/*
RAVR_PLUGIN_METADATA
{
  "id": "my-plugin",
  "name": "My Custom Plugin", 
  "version": "1.0.0",
  "author": "Developer Name",
  "description": "Custom audio effect",
  "category": "effect",
  "apiVersion": "2.0"
}
*/

const plugin = {
  parameters: [
    {
      id: "gain",
      name: "Gain",
      value: 0,
      defaultValue: 0,
      minValue: -20,
      maxValue: 20,
      unit: "dB"
    }
  ],
  
  processAudio(input, sampleRate) {
    const gain = Math.pow(10, this.getParameter("gain") / 20);
    return input.map(sample => sample * gain);
  },
  
  initialize(context) {
    console.log("Plugin initialized");
  },
  
  activate() {
    console.log("Plugin activated");
  },
  
  deactivate() {
    console.log("Plugin deactivated");  
  }
};
```

### Plugin API Reference

**Core Methods**
- `processAudio(input, sampleRate)`: Process audio samples
- `getParameters()`: Return parameter definitions
- `setParameter(id, value)`: Set parameter value
- `getParameter(id)`: Get current parameter value

**Lifecycle Hooks**  
- `initialize(context)`: Plugin initialization
- `activate()`: Plugin activation
- `deactivate()`: Plugin deactivation
- `dispose()`: Cleanup resources

## 🌐 File Format Support

### Input Formats
- **MP3**: MPEG-1 Audio Layer 3
- **WAV**: Uncompressed PCM, 16/24/32-bit
- **FLAC**: Free Lossless Audio Codec
- **M4A/AAC**: Advanced Audio Coding
- **OGG**: Ogg Vorbis
- **EUPH**: RAVR Enhanced Universal Psychoacoustic Hybrid

### EUPH Format Features
- **AI Metadata**: Embedded enhancement data
- **Lossless/Lossy**: Multiple compression modes
- **Chunk Structure**: Streaming-friendly format
- **Digital Signatures**: Integrity verification
- **ZSTD Compression**: Efficient data compression

### Export Options
- **Quality Presets**: Draft, CD, Studio, Mastering
- **Bit Depth**: 16/24/32-bit integer, 32/64-bit float
- **Sample Rate**: Original, 44.1kHz, 48kHz, 96kHz
- **Dithering**: TPDF, Shaped, None
- **Metadata**: Preserve or strip metadata

## 🔧 Troubleshooting

### Common Issues

**Audio Not Playing**
1. Check browser audio permissions
2. Verify audio device selection in settings
3. Try different buffer size (512-2048 samples)
4. Disable browser audio enhancements

**High CPU Usage**  
1. Reduce DSP quality settings
2. Increase buffer size to reduce real-time pressure
3. Disable unnecessary AI processing
4. Close other audio applications

**MIDI Controller Not Detected**
1. Ensure Web MIDI API is enabled in browser
2. Check USB connection and device power
3. Try different USB port
4. Restart browser after connecting device

**VST Plugins Not Loading**
1. Verify plugins are in standard VST directories
2. Re-scan plugin directories  
3. Check plugin architecture (32/64-bit compatibility)
4. Enable legacy plugin support if needed

**Collaboration Issues**
1. Check internet connection stability
2. Verify firewall/router settings allow WebRTC
3. Try different STUN/TURN servers
4. Use lower audio quality for poor connections

### Performance Optimization

**For Best Performance:**
- Use Chrome or Edge browser (best Web Audio support)
- Close unnecessary browser tabs
- Use dedicated audio device (not built-in)
- Enable hardware acceleration in browser
- Use ASIO drivers on Windows for low latency

**Memory Usage:**
- AI models use 100-500MB RAM each
- Large audio files cached in memory
- Plugin instances consume additional RAM
- Clear cache periodically in settings

## 📞 Support & Community

### Getting Help
- **Documentation**: https://docs.ravr.audio
- **Community Forum**: https://community.ravr.audio  
- **GitHub Issues**: https://github.com/ravr-audio/ravr-engine/issues
- **Discord Chat**: https://discord.gg/ravr-audio

### Contributing
We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### License
RAVR Audio Engine is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Made with ❤️ by the RAVR Team**

*Pushing the boundaries of web audio technology*
