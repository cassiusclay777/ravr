# 🔊 RAVR Audio Engine

![RAVR Logo](public/logo192.png)

RAVR is a high-performance web audio engine built with React, TypeScript, and the Web Audio API. It provides real-time audio processing, visualization, and effects in a clean, minimal interface.

## 🎉 NEW! Android Features Available

**All 4 Android features are now fully implemented!**

👉 **[START HERE - Quick Setup (3 minutes)](START_HERE.md)**

### 📱 What's New:
1. ✅ **Android UX** - Bigger buttons (56px) & gesture controls
2. ✅ **Home Screen Widget** - Live track info & controls
3. ✅ **Voice Control** - Czech & English voice commands
4. ✅ **Camera Scanner** - Scan CD/vinyl covers for metadata

**Setup in 3 minutes:** [START_HERE.md](START_HERE.md)

---

## ✨ Core Features

- 🎛️ **3-Band Parametric EQ** with smooth ramping
- 🎚️ **DSP Chain**: Gain → Compressor → Limiter
- 📊 **Realtime Audio Visualization** using FFT
- 🎵 **Preset System**: Flat, Neutron, Ambient, Voice
- 🎧 **High-Quality Audio Processing** with Web Audio API
- 🖥️ **Responsive Design** for all screen sizes
- ⚡ **Optimized Performance** for real-time audio

## 📱 Android Features

- 👆 **Gesture Controls** - Swipe, double-tap, long-press
- 📲 **Home Screen Widget** - Quick access controls
- 🎤 **Voice Control** - Hands-free operation (CZ + EN)
- 📷 **Camera Scanner** - Auto-detect CD/vinyl metadata
- 📳 **Haptic Feedback** - Vibration on interactions
- 🎨 **Material Design** - Native Android look & feel

## 🚀 Getting Started

### Web Application

#### Prerequisites

- Node.js 16+ and pnpm
- Modern web browser with Web Audio API support

#### Installation

```bash
# Clone the repository
git clone https://github.com/cassiusclay777/ravr.git


# Navigate to the project directory
cd ravr-audio

# Install dependencies
pnpm install

# Start the development server
pnpm dev

# Build for production
pnpm build
```

### 📱 Android Application (NEW!)

#### Quick Setup (3 minutes):

```bash
# 1. Install dependencies
pnpm install

# 2. Build mobile assets
pnpm build:mobile

# 3. Sync with Android
npx cap sync android

# 4. Open in Android Studio
npx cap open android

# 5. Run (Shift+F10 in Android Studio)
```

**Full Guide:** [START_HERE.md](START_HERE.md)

**Documentation:**
- 📖 [ANDROID_FEATURES.md](ANDROID_FEATURES.md) - Complete feature documentation
- 🚀 [ANDROID_QUICKSTART.md](ANDROID_QUICKSTART.md) - 5-minute setup guide
- 🔧 [INTEGRATION_EXAMPLE.md](INTEGRATION_EXAMPLE.md) - Code examples
- 🔨 [BUILD_INSTRUCTIONS.md](android/BUILD_INSTRUCTIONS.md) - Build guide

## 🎮 Usage

1. **Load an Audio File**
   - Click "Select Audio File" to load a local file
   - Or click "Load Example" to use the demo track

2. **Playback Controls**
   - Use the play/pause button to control playback
   - Adjust the volume using the slider
   - Toggle fullscreen mode with the fullscreen button

3. **Audio Processing**
   - Switch between different DSP presets
   - Click "Show EQ" to reveal the 3-band equalizer
   - Adjust EQ bands in real-time

## 🛠️ Technical Details

- Built with **React 18** and **TypeScript**
- **Web Audio API** for low-latency audio processing
- **Tailwind CSS** for styling
- **Vite** for fast development and building

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Web Audio API team for the amazing audio processing capabilities
- React team for the awesome UI library
- All contributors who helped test and improve RAVR

---

<p align="center">
  Built with ❤️ for Patrik
</p>
