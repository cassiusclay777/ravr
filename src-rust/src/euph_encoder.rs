use std::io::{Write, Seek, SeekFrom};
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use crc32fast::Hasher;
use flate2::write::GzEncoder;
use flate2::read::GzDecoder;
use flate2::Compression;
use std::io::{Read, Write};

use crate::euph_decoder::{EuphMetadata, ChunkType, EuphError, SpatialProfile};

const EUPH_MAGIC: &[u8; 4] = b"EUPH";
const VERSION_MAJOR: u8 = 1;
const VERSION_MINOR: u8 = 0;

// Compression flags
const FLAG_AUDIO_COMPRESSED: u16 = 0x0001;
const FLAG_METADATA_COMPRESSED: u16 = 0x0002;
const FLAG_DSP_COMPRESSED: u16 = 0x0004;
const FLAG_AI_COMPRESSED: u16 = 0x0008;

#[derive(Debug)]
pub struct ChunkBuilder {
    chunk_type: ChunkType,
    data: Vec<u8>,
    flags: u32,
    compressed: bool,
}

#[derive(Debug)]
pub struct EuphEncoder {
    metadata: Option<EuphMetadata>,
    chunks: HashMap<ChunkType, ChunkBuilder>,
    flags: u16,
    compression_level: i32,
}

impl EuphEncoder {
    pub fn new() -> Self {
        Self {
            metadata: None,
            chunks: HashMap::new(),
            flags: 0,
            compression_level: 3, // Default ZSTD compression level
        }
    }

    pub fn with_compression(mut self, level: i32) -> Self {
        self.compression_level = level;
        self
    }

    pub fn set_metadata(&mut self, metadata: EuphMetadata) -> Result<(), EuphError> {
        let json_data = serde_json::to_vec_pretty(&metadata)?;
        
        self.chunks.insert(ChunkType::Metadata, ChunkBuilder {
            chunk_type: ChunkType::Metadata,
            data: json_data,
            flags: 0,
            compressed: false,
        });
        
        self.metadata = Some(metadata);
        Ok(())
    }

    pub fn add_audio_data(&mut self, audio_data: Vec<u8>, compress: bool) -> Result<(), EuphError> {
        let (final_data, is_compressed) = if compress {
            let mut encoder = GzEncoder::new(Vec::new(), Compression::new(self.compression_level as u32));
            encoder.write_all(audio_data.as_slice())?;
            let compressed = encoder.finish()?;
            self.flags |= FLAG_AUDIO_COMPRESSED;
            (compressed, true)
        } else {
            (audio_data, false)
        };

        self.chunks.insert(ChunkType::Audio, ChunkBuilder {
            chunk_type: ChunkType::Audio,
            data: final_data,
            flags: if is_compressed { 0x01 } else { 0x00 },
            compressed: is_compressed,
        });

        Ok(())
    }

    pub fn add_ai_model(&mut self, model_data: Vec<u8>, compress: bool) -> Result<(), EuphError> {
        let (final_data, is_compressed) = if compress {
            let mut encoder = GzEncoder::new(Vec::new(), Compression::new(self.compression_level as u32));
            encoder.write_all(model_data.as_slice())?;
            let compressed = encoder.finish()?;
            self.flags |= FLAG_AI_COMPRESSED;
            (compressed, true)
        } else {
            (model_data, false)
        };

        self.chunks.insert(ChunkType::AiModel, ChunkBuilder {
            chunk_type: ChunkType::AiModel,
            data: final_data,
            flags: if is_compressed { 0x01 } else { 0x00 },
            compressed: is_compressed,
        });

        Ok(())
    }

    pub fn add_dsp_chain(&mut self, dsp_config: &DspChainConfig, compress: bool) -> Result<(), EuphError> {
        let json_data = serde_json::to_vec_pretty(dsp_config)?;
        
        let (final_data, is_compressed) = if compress {
            let mut encoder = GzEncoder::new(Vec::new(), Compression::new(self.compression_level as u32));
            encoder.write_all(json_data.as_slice())?;
            let compressed = encoder.finish()?;
            self.flags |= FLAG_DSP_COMPRESSED;
            (compressed, true)
        } else {
            (json_data, false)
        };

        self.chunks.insert(ChunkType::DspChain, ChunkBuilder {
            chunk_type: ChunkType::DspChain,
            data: final_data,
            flags: if is_compressed { 0x01 } else { 0x00 },
            compressed: is_compressed,
        });

        Ok(())
    }

    pub fn add_relativistic_effects(&mut self, effects: &RelativisticEffects, compress: bool) -> Result<(), EuphError> {
        let json_data = serde_json::to_vec_pretty(effects)?;
        
        let (final_data, is_compressed) = if compress {
            let mut encoder = GzEncoder::new(Vec::new(), Compression::new(self.compression_level as u32));
            encoder.write_all(json_data.as_slice())?;
            let compressed = encoder.finish()?;
            (compressed, true)
        } else {
            (json_data, false)
        };

        self.chunks.insert(ChunkType::Relativistic, ChunkBuilder {
            chunk_type: ChunkType::Relativistic,
            data: final_data,
            flags: if is_compressed { 0x01 } else { 0x00 },
            compressed: is_compressed,
        });

        Ok(())
    }

    pub fn add_signature(&mut self, signature: &SignatureData) -> Result<(), EuphError> {
        let json_data = serde_json::to_vec_pretty(signature)?;
        
        self.chunks.insert(ChunkType::Signature, ChunkBuilder {
            chunk_type: ChunkType::Signature,
            data: json_data,
            flags: 0,
            compressed: false,
        });

        Ok(())
    }

    pub fn write<W: Write + Seek>(&self, writer: &mut W) -> Result<(), EuphError> {
        let mut buffer = Vec::new();
        
        // Write header placeholder (will be updated later)
        buffer.extend_from_slice(EUPH_MAGIC);
        buffer.extend_from_slice(&[VERSION_MAJOR, VERSION_MINOR]);
        buffer.extend_from_slice(&self.flags.to_le_bytes());
        buffer.extend_from_slice(&0u64.to_le_bytes()); // Length placeholder
        buffer.extend_from_slice(&0u32.to_le_bytes()); // CRC placeholder

        // Write file timestamps
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        buffer.extend_from_slice(&now.to_le_bytes()); // Created
        buffer.extend_from_slice(&now.to_le_bytes()); // Modified

        // Write chunk count
        let chunk_count = self.chunks.len() as u32;
        buffer.extend_from_slice(&chunk_count.to_le_bytes());

        // Calculate chunk offsets and write chunk table
        let mut current_offset = buffer.len() + (self.chunks.len() * 24); // Header + chunk table
        let mut chunk_table = Vec::new();
        let mut chunk_data = Vec::new();

        for (chunk_type, chunk_builder) in &self.chunks {
            // Write chunk table entry
            chunk_table.extend_from_slice(&Self::chunk_type_to_u32(*chunk_type).to_le_bytes());
            chunk_table.extend_from_slice(&(current_offset as u64).to_le_bytes());
            chunk_table.extend_from_slice(&(chunk_builder.data.len() as u64).to_le_bytes());
            chunk_table.extend_from_slice(&chunk_builder.flags.to_le_bytes());

            // Add chunk data
            chunk_data.extend_from_slice(&chunk_builder.data);
            current_offset += chunk_builder.data.len();
        }

        // Combine everything
        buffer.extend_from_slice(&chunk_table);
        buffer.extend_from_slice(&chunk_data);

        // Calculate and update file length
        let file_length = buffer.len() as u64;
        buffer[10..18].copy_from_slice(&file_length.to_le_bytes());

        // Calculate and update CRC32
        let crc = self.calculate_crc32(&buffer[22..]); // Skip magic, version, flags, length, and CRC fields
        buffer[18..22].copy_from_slice(&crc.to_le_bytes());

        // Write to output
        writer.write_all(&buffer)?;
        writer.flush()?;

        Ok(())
    }

    fn chunk_type_to_u32(chunk_type: ChunkType) -> u32 {
        match chunk_type {
            ChunkType::Audio => 0x41554449,
            ChunkType::Metadata => 0x4D455441,
            ChunkType::AiModel => 0x41494D4F,
            ChunkType::DspChain => 0x44535043,
            ChunkType::Relativistic => 0x52454C41,
            ChunkType::Signature => 0x5349474E,
        }
    }

    fn calculate_crc32(&self, data: &[u8]) -> u32 {
        let mut hasher = Hasher::new();
        hasher.update(data);
        hasher.finalize()
    }

    pub fn get_estimated_size(&self) -> usize {
        let mut size = 50; // Header size
        size += self.chunks.len() * 24; // Chunk table
        
        for chunk in self.chunks.values() {
            size += chunk.data.len();
        }
        
        size
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DspChainConfig {
    pub version: String,
    pub sample_rate: f32,
    pub buffer_size: u32,
    pub effects: Vec<DspEffect>,
    pub routing: DspRouting,
    pub presets: HashMap<String, DspPreset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DspEffect {
    pub id: String,
    pub effect_type: String,
    pub enabled: bool,
    pub bypass: bool,
    pub parameters: HashMap<String, f32>,
    pub automation: Option<DspAutomation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DspRouting {
    pub input_channels: u32,
    pub output_channels: u32,
    pub connections: Vec<DspConnection>,
    pub send_returns: Vec<DspSendReturn>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DspConnection {
    pub from_effect: String,
    pub from_output: u32,
    pub to_effect: String,
    pub to_input: u32,
    pub gain: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DspSendReturn {
    pub send_id: String,
    pub return_id: String,
    pub level: f32,
    pub wet_dry_mix: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DspPreset {
    pub name: String,
    pub description: String,
    pub effect_states: HashMap<String, HashMap<String, f32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DspAutomation {
    pub parameter: String,
    pub keyframes: Vec<DspKeyframe>,
    pub interpolation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DspKeyframe {
    pub time: f64,
    pub value: f32,
    pub curve: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelativisticEffects {
    pub enabled: bool,
    pub motion_paths: Vec<MotionPath>,
    pub time_dilation_curves: Vec<TimeDilationCurve>,
    pub doppler_config: DopplerConfig,
    pub gravity_wells: Vec<GravityWell>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotionPath {
    pub name: String,
    pub keyframes: Vec<SpatialKeyframe>,
    pub interpolation: String,
    pub velocity_profile: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialKeyframe {
    pub time: f64,
    pub position: [f32; 3], // x, y, z
    pub velocity: [f32; 3], // dx, dy, dz
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeDilationCurve {
    pub name: String,
    pub keyframes: Vec<TimeDilationKeyframe>,
    pub base_time_rate: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeDilationKeyframe {
    pub time: f64,
    pub dilation_factor: f32,
    pub transition_duration: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DopplerConfig {
    pub enabled: bool,
    pub sound_speed: f32,
    pub max_frequency_shift: f32,
    pub attenuation_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GravityWell {
    pub name: String,
    pub position: [f32; 3],
    pub mass: f32,
    pub event_horizon: f32,
    pub effects: GravityEffects,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GravityEffects {
    pub time_dilation: bool,
    pub frequency_shift: bool,
    pub amplitude_scaling: bool,
    pub phase_shift: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignatureData {
    pub author: String,
    pub organization: Option<String>,
    pub license: String,
    pub creation_tool: String,
    pub tool_version: String,
    pub integrity_hash: String, // SHA-256
    pub digital_signature: Option<String>,
    pub certificate: Option<String>,
}

impl From<std::io::Error> for EuphError {
    fn from(e: std::io::Error) -> Self {
        EuphError::IoError(e)
    }
}

// Utility functions for working with EUPH files
impl EuphEncoder {
    pub fn create_from_audio_file(
        audio_path: &str,
        metadata: Option<EuphMetadata>,
        options: EncodingOptions,
    ) -> Result<Self, EuphError> {
        let mut encoder = Self::new().with_compression(options.compression_level);

        // Read audio file
        let audio_data = std::fs::read(audio_path)?;
        encoder.add_audio_data(audio_data, options.compress_audio)?;

        // Add metadata if provided
        if let Some(meta) = metadata {
            encoder.set_metadata(meta)?;
        }

        // Add DSP chain if configured
        if let Some(dsp_config) = options.dsp_config {
            encoder.add_dsp_chain(&dsp_config, options.compress_dsp)?;
        }

        // Add relativistic effects if configured
        if let Some(relativistic) = options.relativistic_effects {
            encoder.add_relativistic_effects(&relativistic, true)?;
        }

        // Add signature
        if let Some(signature) = options.signature {
            encoder.add_signature(&signature)?;
        }

        Ok(encoder)
    }

    pub fn create_enhanced_file(
        original_audio: Vec<u8>,
        enhanced_audio: Vec<u8>,
        ai_model_data: Vec<u8>,
        metadata: EuphMetadata,
    ) -> Result<Self, EuphError> {
        let mut encoder = Self::new().with_compression(6); // Higher compression for enhanced files

        // Add original and enhanced audio
        encoder.add_audio_data(original_audio, true)?;
        encoder.add_ai_model(ai_model_data, true)?;

        // Set metadata
        encoder.set_metadata(metadata)?;

        // Add signature for enhanced file
        let signature = SignatureData {
            author: "RAVR Audio Engine".to_string(),
            organization: Some("RAVR AI Enhancement".to_string()),
            license: "Custom".to_string(),
            creation_tool: "RAVR".to_string(),
            tool_version: "1.0.0".to_string(),
            integrity_hash: "".to_string(), // Will be calculated during write
            digital_signature: None,
            certificate: None,
        };
        encoder.add_signature(&signature)?;

        Ok(encoder)
    }
}

#[derive(Debug)]
pub struct EncodingOptions {
    pub compression_level: i32,
    pub compress_audio: bool,
    pub compress_dsp: bool,
    pub dsp_config: Option<DspChainConfig>,
    pub relativistic_effects: Option<RelativisticEffects>,
    pub signature: Option<SignatureData>,
}

impl Default for EncodingOptions {
    fn default() -> Self {
        Self {
            compression_level: 3,
            compress_audio: true,
            compress_dsp: true,
            dsp_config: None,
            relativistic_effects: None,
            signature: None,
        }
    }
}

// WASM-compatible exports
#[cfg(feature = "wasm")]
mod wasm_exports {
    use super::*;
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    pub struct WasmEuphEncoder {
        inner: EuphEncoder,
    }

    #[wasm_bindgen]
    impl WasmEuphEncoder {
        #[wasm_bindgen(constructor)]
        pub fn new() -> Self {
            Self {
                inner: EuphEncoder::new(),
            }
        }

        #[wasm_bindgen(js_name = "addAudioData")]
        pub fn add_audio_data(&mut self, data: &[u8], compress: bool) -> Result<(), JsValue> {
            self.inner.add_audio_data(data.to_vec(), compress)
                .map_err(|e| JsValue::from_str(&format!("{:?}", e)))
        }

        #[wasm_bindgen(js_name = "setMetadata")]
        pub fn set_metadata(&mut self, metadata_json: &str) -> Result<(), JsValue> {
            let metadata: EuphMetadata = serde_json::from_str(metadata_json)
                .map_err(|e| JsValue::from_str(&format!("{:?}", e)))?;
            self.inner.set_metadata(metadata)
                .map_err(|e| JsValue::from_str(&format!("{:?}", e)))
        }

        #[wasm_bindgen(js_name = "encode")]
        pub fn encode(&self) -> Result<Vec<u8>, JsValue> {
            let mut buffer = Vec::new();
            self.inner.write(&mut std::io::Cursor::new(&mut buffer))
                .map_err(|e| JsValue::from_str(&format!("{:?}", e)))?;
            Ok(buffer)
        }

        #[wasm_bindgen(js_name = "getEstimatedSize")]
        pub fn get_estimated_size(&self) -> usize {
            self.inner.get_estimated_size()
        }
    }
}
