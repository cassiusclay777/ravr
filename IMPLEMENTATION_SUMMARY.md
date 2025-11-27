# RAVR Audio Player - EUPH Format & Modular DSP Implementation

## Přehled implementace

### ✅ Hotové úkoly

#### **Task 1: EUPH Format Support**
- **Task 1.1**: EUPH file detection & loading
  - ✅ EUPHDecoder.ts - opraven WASM import a implementováno dekódování
  - ✅ EUPH file detection v AutoPlayer.load()
  - ✅ WAV konverze z AudioBuffer pro playback

- **Task 1.2**: DSP settings export/import
  - ✅ DspSettingsManager.ts - serializace/deserializace DSP nastavení
  - ✅ Integrace s EUPH formátem pro ukládání/načítání DSP konfigurací

- **Task 1.3**: EUPH export UI
  - ✅ EuphExporter.tsx - React komponenta pro export do EUPH formátu
  - ✅ Progress tracking a metadata handling
  - ✅ DSP settings export s aktuálními nastaveními

#### **Task 2: Modular DSP Chain**
- **Task 2.1**: Modular DSP chain class
  - ✅ ModularDspChain.ts - plně funkční modulární DSP řetězec
  - ✅ Dynamické přidávání/odebírání/přesouvání modulů
  - ✅ Serializace/deserializace konfigurace
  - ✅ Enable/disable modulů za běhu

- **Task 2.2**: DSP chain panel UI
  - ✅ DspChainPanel.tsx - React komponenta pro správu DSP řetězce
  - ✅ Drag & drop pro přeskupování modulů
  - ✅ Parameter editor pro každý modul
  - ✅ Real-time kontrola parametrů

- **Task 2.3**: Integration
  - ✅ Integrace ModularDspChain do AutoPlayer
  - ✅ Import/export DSP settings z/do EUPH formátu
  - ✅ Kompatibilita s existujícím audio pipeline

## Architektura

### EUPH Format Structure
```
EUPH File Structure:
├── Header chunk (EUPH signature, version, audio info)
├── Metadata chunk (JSON metadata)
├── Audio chunks (compressed audio data)
├── AI Data chunk (enhancement data)
├── DSP Data chunk (DSP settings)
└── Checksum chunk (integrity validation)
```

### Modular DSP Chain Architecture
```
Audio Pipeline:
Source → Crossfade → ReplayGain → ModularDspChain → Analyzer → Destination
                    │
                    └── [Module 1] → [Module 2] → ... → [Module N]
```

### Key Features

#### EUPH Format
- **Lossless & Lossy Compression**: Podpora různých kompresních profilů
- **Metadata Support**: Standardní audio metadata + AI enhancement data
- **DSP Settings**: Ukládání celého DSP řetězce v souboru
- **Integrity Checks**: CRC checksum pro ověření integrity

#### Modular DSP Chain
- **Dynamic Module Management**: Přidávání/odebírání modulů za běhu
- **Serialization**: Ukládání/načítání celé konfigurace
- **Parameter Control**: Real-time úprava parametrů
- **Drag & Drop UI**: Intuitivní správa řetězce

## Použití

### EUPH Export
```typescript
// Export current track to EUPH format
const exporter = new EuphExporter();
exporter.handleExport(); // Creates .euph file with DSP settings
```

### DSP Chain Management
```typescript
// Create modular DSP chain
const chain = new ModularDspChain(audioContext);

// Add modules
chain.addModule('compressor');
chain.addModule('equalizer');

// Configure parameters
chain.setModuleParameters('compressor-123', {
  threshold: -20,
  ratio: 4,
  attack: 0.003
});

// Serialize/deserialize
const config = chain.serialize();
chain.deserialize(config);
```

### EUPH File Loading
```typescript
// Auto-detection in AutoPlayer
const player = new AutoPlayer();
await player.load(euphFile); // Automatically detects .euph extension
```

## Soubory

### Nové soubory
- `src/formats/EUPHEncoder.ts` - EUPH encoding
- `src/formats/EUPHDecoder.ts` - EUPH decoding (opravený)
- `src/components/export/EuphExporter.tsx` - Export UI
- `src/dsp/ModularDspChain.ts` - Modulární DSP řetězec
- `src/components/dsp/DspChainPanel.tsx` - DSP chain UI

### Upravené soubory
- `src/audio/player.ts` - Integrace EUPH a ModularDspChain
- `src/dsp/DspSettingsManager.ts` - Serializace DSP nastavení

## Další kroky

1. **AI Enhancement Pipeline** - Integrace AI processing do EUPH formátu
2. **WASM DSP Modules** - Optimalizace DSP modulů pomocí WebAssembly
3. **Preset Management** - Ukládání/načítání DSP presetů
4. **Real-time Analysis** - Vizuální feedback pro DSP parametry
5. **Cross-platform Testing** - Testování na různých zařízeních

## Výhody implementace

- **Jednotný formát**: EUPH kombinuje audio data, metadata a DSP settings
- **Modularita**: Uživatelé mohou vytvářet vlastní DSP řetězce
- **Přenositelnost**: DSP settings se ukládají s audio souborem
- **Rozšiřitelnost**: Snadné přidávání nových DSP modulů
- **Uživatelská přívětivost**: Intuitivní drag & drop rozhraní

Implementace poskytuje profesionální audio processing pipeline s pokročilými funkcemi pro hudební produkci a mastering.
