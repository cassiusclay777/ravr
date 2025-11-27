# VST Plugins Setup Guide

## Overview

RAVR Audio Engine supports VST plugins for advanced audio processing. Due to licensing restrictions and file size considerations, VST plugins are not included in the source code repository.

## Required Plugins

### Core DSP Plugins

1. **TDR Nova** (Free)
   - Dynamic EQ and multiband compressor
   - Download: https://www.tokyodawn.net/tdr-nova/
   - File: `TDR Nova.dll`

2. **TX16Wx** (Free)
   - Software sampler
   - Download: https://www.tx16wx.com/
   - File: `TX16Wx.dll`

### Valhalla Suite (Commercial)

3. **ValhallaDelay**
   - High-quality delay plugin
   - File: `ValhallaDelay_x64.dll`

4. **ValhallaFreqEcho**
   - Frequency shifter delay
   - File: `ValhallaFreqEcho_x64.dll`

5. **ValhallaPlate**
   - Plate reverb emulation
   - File: `ValhallaPlate_x64.dll`

6. **ValhallaRoom**
   - Room reverb simulation
   - File: `ValhallaRoom_x64.dll`

7. **ValhallaShimmer**
   - Pitch-shifting reverb
   - File: `ValhallaShimmer_x64.dll`

8. **ValhallaSpaceModulator**
   - Modulated reverb
   - File: `ValhallaSpaceModulator_x64.dll`

9. **ValhallaSupermassive** (Free)
   - Massive reverb/delay
   - Download: https://valhalladsp.com/shop/reverb/valhalla-supermassive/
   - File: `ValhallaSupermassive_x64.dll`

10. **ValhallaUberMod**
    - Multi-tap delay and modulation
    - File: `ValhallaUberMod_x64.dll`

11. **ValhallaVintageVerb**
    - Vintage reverb emulation
    - File: `ValhallaVintageVerb_x64.dll`

## Installation Instructions

### Windows

1. Create a `plugins` directory in the project root:
   ```
   c:\ravr-fixed\plugins\vst\
   ```

2. Copy all VST DLL files to the plugins directory:
   ```
   c:\ravr-fixed\plugins\vst\TDR Nova.dll
   c:\ravr-fixed\plugins\vst\TX16Wx.dll
   c:\ravr-fixed\plugins\vst\ValhallaDelay_x64.dll
   ... (all other DLLs)
   ```

3. Update the VST path in settings:
   - Open RAVR Settings
   - Go to Advanced → VST Plugins
   - Set VST Directory to: `./plugins/vst/`

### macOS

1. Create VST directories:
   ```
   mkdir -p plugins/vst
   mkdir -p plugins/au
   ```

2. Copy VST files to appropriate directories:
   - VST2/3: `plugins/vst/`
   - Audio Units: `plugins/au/`

### Linux

1. Create VST directory:
   ```
   mkdir -p plugins/vst
   ```

2. Copy VST files (Windows VST DLLs can work with Wine/LinVst):
   ```
   cp *.dll plugins/vst/
   ```

## Development Setup

### Without VST Plugins

RAVR will work without VST plugins using built-in JavaScript DSP modules:

- ParametricEQ (3-band)
- CompressorModule  
- MultibandCompressor
- StereoEnhancer
- Crossfeed
- ConvolutionReverb
- TruePeakLimiter

### Plugin Loading

The VST loader checks these paths in order:

1. `./plugins/vst/` (project-relative)
2. `%PROGRAMFILES%\VstPlugins\` (Windows)
3. `~/Library/Audio/Plug-Ins/VST/` (macOS)
4. `~/.vst/` (Linux)

### Plugin Integration

VST plugins are loaded via the `VSTHostManager`:

```typescript
import { VSTHostManager } from '../audio/VSTHostManager';

const vstHost = new VSTHostManager();
await vstHost.loadPlugin('TDR Nova.dll');
await vstHost.loadPlugin('ValhallaSupermassive_x64.dll');
```

## Licensing Notes

### Free Plugins
- TDR Nova: Freeware, redistribution allowed with attribution
- TX16Wx: Freeware for non-commercial use  
- ValhallaSupermassive: Freeware

### Commercial Plugins
- All other Valhalla plugins require purchase
- Licenses are per-user, not transferable
- Do not redistribute commercial plugin files

## Troubleshooting

### Plugin Not Loading
1. Check file permissions (executable)
2. Verify 64-bit compatibility
3. Install Visual C++ Redistributables (Windows)
4. Check VST path in settings

### Performance Issues
1. Increase audio buffer size
2. Disable real-time processing for heavy plugins
3. Use plugin bypass when not needed
4. Consider CPU-optimized alternatives

### Missing Dependencies
Some plugins require additional libraries:
- Visual C++ Runtime (Windows)
- .NET Framework (some plugins)
- DirectX (audio interfaces)

## Alternative Plugins

If commercial plugins are unavailable, these free alternatives provide similar functionality:

| Commercial | Free Alternative |
|------------|------------------|
| ValhallaRoom | Freeverb3 |
| ValhallaPlate | Dragonfly Plate |
| ValhallaDelay | TAL-Dub-X |
| ValhallaVintageVerb | CloudReverb |

## Build Configuration

To build RAVR without VST support:

```bash
npm run build -- --no-vst
```

To build with VST support:

```bash
npm run build -- --with-vst
```

## Contact

For plugin-related support:
- TDR Nova: support@tokyodawn.net
- TX16Wx: support@tx16wx.com  
- Valhalla: support@valhalladsp.com

For RAVR integration issues:
- Create an issue on GitHub
- Include plugin version and error logs
