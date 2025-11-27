use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

// DSP Engine module
pub mod dsp_engine;
pub use dsp_engine::*;

// Simple EUPH encoder/decoder for WASM
#[wasm_bindgen]
pub struct EuphEncoder {
    chunks: Vec<EuphChunk>,
}

#[wasm_bindgen]
pub struct EuphDecoder {
    chunks: Vec<EuphChunk>,
}

#[derive(Serialize, Deserialize, Clone)]
struct EuphChunk {
    chunk_type: String,
    data: Vec<u8>,
}

#[wasm_bindgen]
impl EuphEncoder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            chunks: Vec::new(),
        }
    }

    #[wasm_bindgen(js_name = "addAudioData")]
    pub fn add_audio_data(&mut self, data: &[u8]) {
        self.chunks.push(EuphChunk {
            chunk_type: "AUDIO".to_string(),
            data: data.to_vec(),
        });
    }

    #[wasm_bindgen(js_name = "addMetadata")]
    pub fn add_metadata(&mut self, metadata_json: &str) -> Result<(), JsValue> {
        self.chunks.push(EuphChunk {
            chunk_type: "METADATA".to_string(),
            data: metadata_json.as_bytes().to_vec(),
        });
        Ok(())
    }

    #[wasm_bindgen(js_name = "encode")]
    pub fn encode(&self) -> Result<Vec<u8>, JsValue> {
        let mut result = Vec::new();
        
        // Write EUPH magic
        result.extend_from_slice(b"EUPH");
        
        // Write version (1.0)
        result.push(1);
        result.push(0);
        
        // Write chunk count
        result.extend_from_slice(&(self.chunks.len() as u32).to_le_bytes());
        
        // Write chunks
        for chunk in &self.chunks {
            // Write chunk type (4 bytes)
            let mut chunk_type_bytes = [0u8; 4];
            let chunk_type_str = chunk.chunk_type.as_bytes();
            for (i, &byte) in chunk_type_str.iter().enumerate() {
                if i < 4 {
                    chunk_type_bytes[i] = byte;
                }
            }
            result.extend_from_slice(&chunk_type_bytes);
            
            // Write chunk size
            result.extend_from_slice(&(chunk.data.len() as u32).to_le_bytes());
            
            // Write chunk data
            result.extend_from_slice(&chunk.data);
        }
        
        Ok(result)
    }
}

#[wasm_bindgen]
impl EuphDecoder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            chunks: Vec::new(),
        }
    }

    #[wasm_bindgen(js_name = "decode")]
    pub fn decode(&mut self, data: &[u8]) -> Result<(), JsValue> {
        if data.len() < 8 {
            return Err(JsValue::from_str("Invalid EUPH file: too short"));
        }

        // Check magic
        if &data[0..4] != b"EUPH" {
            return Err(JsValue::from_str("Invalid EUPH file: wrong magic"));
        }

        // Read version
        let _version_minor = data[5];
        
        // Read chunk count
        let chunk_count = u32::from_le_bytes([data[6], data[7], data[8], data[9]]) as usize;
        
        let mut offset = 10;
        self.chunks.clear();
        
        for _ in 0..chunk_count {
            if offset + 8 > data.len() {
                return Err(JsValue::from_str("Invalid EUPH file: chunk extends beyond file"));
            }
            
            // Read chunk type
            let chunk_type_bytes = &data[offset..offset + 4];
            let chunk_type = String::from_utf8_lossy(chunk_type_bytes).trim_end_matches('\0').to_string();
            offset += 4;
            
            // Read chunk size
            let chunk_size = u32::from_le_bytes([
                data[offset], data[offset + 1], 
                data[offset + 2], data[offset + 3]
            ]) as usize;
            offset += 4;
            
            if offset + chunk_size > data.len() {
                return Err(JsValue::from_str("Invalid EUPH file: chunk data extends beyond file"));
            }
            
            // Read chunk data
            let chunk_data = data[offset..offset + chunk_size].to_vec();
            offset += chunk_size;
            
            self.chunks.push(EuphChunk {
                chunk_type,
                data: chunk_data,
            });
        }
        
        Ok(())
    }

    #[wasm_bindgen(js_name = "getAudioData")]
    pub fn get_audio_data(&self) -> Option<Vec<u8>> {
        for chunk in &self.chunks {
            if chunk.chunk_type == "AUDIO" {
                return Some(chunk.data.clone());
            }
        }
        None
    }

    #[wasm_bindgen(js_name = "getMetadata")]
    pub fn get_metadata(&self) -> Option<String> {
        for chunk in &self.chunks {
            if chunk.chunk_type == "METADATA" {
                return String::from_utf8(chunk.data.clone()).ok();
            }
        }
        None
    }

    #[wasm_bindgen(js_name = "getChunkCount")]
    pub fn get_chunk_count(&self) -> usize {
        self.chunks.len()
    }
}

// Utility functions
#[wasm_bindgen]
pub fn create_euph_from_audio(audio_data: &[u8], metadata_json: &str) -> Result<Vec<u8>, JsValue> {
    let mut encoder = EuphEncoder::new();
    encoder.add_audio_data(audio_data);
    encoder.add_metadata(metadata_json)?;
    encoder.encode()
}

#[wasm_bindgen]
pub fn validate_euph_file(data: &[u8]) -> bool {
    if data.len() < 8 {
        return false;
    }
    &data[0..4] == b"EUPH"
}
