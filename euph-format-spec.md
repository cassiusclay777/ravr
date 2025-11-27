# EUPH Format Specification v1.0

## Binary Structure

````c
[MAGIC]     4 bytes  - "EUPH" (0x45 0x55 0x50 0x48)
[VERSION]   2 bytes  - Major.Minor (0x01 0x00)
[FLAGS]     2 bytes  - Feature flags
[LENGTH]    8 bytes  - Total file length
[CRC32]     4 bytes  - File integrity check

[HEADER]
  [CREATED]   8 bytes  - Unix timestamp
  [MODIFIED]  8 bytes  - Unix timestamp
  [CHUNKS]    4 bytes  - Number of chunks

[CHUNK_TABLE]
  For each chunk:
    [TYPE]      4 bytes  - Chunk type identifier
    [OFFSET]    8 bytes  - Offset from file start
    [SIZE]      8 bytes  - Chunk size in bytes
    [FLAGS]     4 bytes  - Chunk-specific flags

## Chunk Types

### AUDIO (0x41554449)

- Original audio data
- Supported formats: OPUS, FLAC, WAV, MP3
- Compression: ZSTD optional

### METADATA (0x4D455441)
- JSON structure:
```json
{
  "genre": "electronic",
  "subgenre": ["techno", "industrial"],
  "mood": ["dark", "energetic"],
  "tempo": 140,
  "key": "Am",
  "timesignature": "4/4",
  "energy": 0.85,
  "valence": 0.3,
  "spatial_profile": {
    "width": 0.8,
    "depth": 0.6,
    "height": 0.4
  }
}
````

### AI_MODEL (0x41494D4F)

- Serialized AI enhancement parameters
- ONNX model reference or embedded weights
- Processing parameters

### DSP_CHAIN (0x44535043)

- Complete DSP configuration snapshot
- All effect parameters
- Routing information

### RELATIVISTIC (0x52454C41)

- Spatial movement paths
- Time dilation curves
- Doppler parameters
- Gravity well positions

### SIGNATURE (0x5349474E)

- Author information
- License
- Integrity hash (SHA-256)
- Digital signature (optional)

```

```
