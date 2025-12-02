# 🔊 RAVR Audio Engine

![RAVR Logo](public/logo192.png)

**RAVR** is a high-performance web audio engine built with React, TypeScript, and the Web Audio API. It provides real-time audio processing, visualization, and effects in a clean, minimal interface.

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and pnpm
- Modern web browser with Web Audio API support

### Installation

```bash
# Clone the repository
git clone https://github.com/cassiusclay777/ravr.git

# Navigate to the project directory
cd ravr

# Install dependencies
pnpm install

# Start the development server
pnpm dev

# Build for production
pnpm build
```

### Desktop Application

```bash
# Start desktop development
pnpm dev:desktop

# Build desktop application
pnpm build
pnpm pack:desktop:win  # Windows
pnpm pack:desktop:mac  # macOS  
pnpm pack:desktop:linux  # Linux
```

### Mobile Application

```bash
# Build mobile assets
pnpm build:mobile

# Sync with Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

## ✨ Features

### Core Audio Features
- 🎛️ **3-Band Parametric EQ** with smooth ramping
- 🎚️ **DSP Chain**: Gain → Compressor → Limiter
- 📊 **Realtime Audio Visualization** using FFT
- 🎵 **Preset System**: Flat, Neutron, Ambient, Voice
- 🎧 **High-Quality Audio Processing** with Web Audio API
- 🤖 **AI Mastering Suite** with ONNX models
- 🎨 **Custom EUPH Format** with lossless compression

### Platform Support
- 🌐 **Web Application** - Progressive Web App
- 🖥️ **Desktop Application** - Electron-based
- 📱 **Mobile Application** - Android via Capacitor
- 🔌 **Plugin Support** - VST plugin integration

### Advanced Features
- 🎛️ **Professional DSP Effects** - Real-time audio processing
- 📊 **Audio Analytics** - Detailed audio analysis
- 🔄 **Cross-Platform** - Windows, macOS, Linux, Android
- 🎨 **Modern UI** - Tailwind CSS with Radix UI components
- ⚡ **High Performance** - Optimized for real-time audio

## 📁 Project Structure

```
ravr/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── audio/             # Audio engine
│   ├── dsp/               # DSP processing
│   ├── ai/                # AI enhancement
│   ├── pages/             # Application pages
│   └── utils/             # Utility functions
├── src-rust/              # Rust code for WASM
├── android/               # Android project
├── electron/              # Electron configuration
├── public/                # Static assets
├── docs/                  # Documentation
└── scripts/               # Build and utility scripts
```

## 🛠️ Development

### Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build Tool**: Vite 7.1.4
- **Desktop**: Electron 38.1.2
- **Mobile**: Capacitor 7.4.3
- **Audio Processing**: Web Audio API, FFmpeg, ONNX Runtime
- **State Management**: Zustand
- **UI Components**: Radix UI, Framer Motion

### Available Scripts

```bash
# Development
pnpm dev              # Web development server
pnpm dev:desktop      # Desktop development
pnpm dev:mobile       # Mobile development

# Building
pnpm build            # Production build
pnpm build:mobile     # Mobile build
pnpm build-safe       # Safe build with validation

# Testing
pnpm test             # Run test suite

# Desktop Packaging
pnpm pack:desktop:win # Windows package
pnpm pack:desktop:mac # macOS package
pnpm pack:desktop:linux # Linux package
```

## 📚 Documentation

- [📖 Architecture Overview](docs/ARCHITECTURE.md)
- [🔧 Build Instructions](docs/BUILD_GUIDE.md)
- [📱 Mobile Setup](docs/MOBILE_DEPLOYMENT.md)
- [🎛️ Audio Processing](docs/AUDIO_PROCESSING.md)
- [🤖 AI Features](docs/AI_FEATURES.md)
- [🔌 Plugin Integration](docs/PLUGIN_INTEGRATION.md)

## 🎯 Usage Examples

### Basic Audio Player

```typescript
import { AudioEngine } from './src/audio/AudioEngine';

const audioEngine = new AudioEngine();
await audioEngine.loadAudioFile('path/to/audio.wav');
audioEngine.play();
```

### DSP Effects

```typescript
import { DSPChain } from './src/dsp/DSPChain';

const dspChain = new DSPChain();
dspChain.addEffect('eq', { low: 0, mid: 2, high: -1 });
dspChain.addEffect('compressor', { threshold: -20, ratio: 4 });
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Web Audio API team for the amazing audio processing capabilities
- React team for the awesome UI library
- Electron team for desktop application framework
- Capacitor team for mobile integration
- All contributors who helped test and improve RAVR

---

<p align="center">
  Built with ❤️ for the audio community
</p>
