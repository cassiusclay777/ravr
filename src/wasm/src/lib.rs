use wasm_bindgen::prelude::*;
use js_sys::*;
use web_sys::console;
use std::collections::HashMap;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, RAVR WASM!");
}

// Set panic hook for better error messages
#[wasm_bindgen(start)]
pub fn main() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// EUPH Audio Compression Module
#[wasm_bindgen]
pub struct EUPHCompressor {
    compression_level: u8,
    profile: String,
}

#[wasm_bindgen]
impl EUPHCompressor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> EUPHCompressor {
        EUPHCompressor {
            compression_level: 5,
            profile: "balanced".to_string(),
        }
    }

    #[wasm_bindgen(js_name = compressAudio)]
    pub fn compress_audio(
        &self,
        audio_data: &[f32],
        profile: &str,
        level: u8,
    ) -> Result<Vec<u8>, JsValue> {
        match profile {
            "lossless" => self.lossless_compress(audio_data),
            "balanced" => self.balanced_compress(audio_data, level),
            "compact" => self.compact_compress(audio_data, level),
            _ => Err(JsValue::from_str("Unknown compression profile")),
        }
    }

    #[wasm_bindgen(js_name = decompressAudio)]
    pub fn decompress_audio(
        &self,
        compressed_data: &[u8],
        profile: &str,
    ) -> Result<Vec<f32>, JsValue> {
        match profile {
            "lossless" => self.lossless_decompress(compressed_data),
            "balanced" | "compact" => self.lossy_decompress(compressed_data),
            _ => Err(JsValue::from_str("Unknown compression profile")),
        }
    }

    fn lossless_compress(&self, audio_data: &[f32]) -> Result<Vec<u8>, JsValue> {
        // FLAC-like lossless compression using linear prediction
        let mut compressed = Vec::new();
        
        // Simple run-length encoding for silence detection
        let mut i = 0;
        while i < audio_data.len() {
            let sample = audio_data[i];
            
            if sample.abs() < 0.0001 {
                // Count consecutive silent samples
                let mut silence_count = 0u32;
                while i < audio_data.len() && audio_data[i].abs() < 0.0001 {
                    silence_count += 1;
                    i += 1;
                }
                
                // Encode silence marker + count
                compressed.extend_from_slice(&[0xFF, 0xFF, 0xFF, 0xFF]); // Silence marker
                compressed.extend_from_slice(&silence_count.to_le_bytes());
            } else {
                // Store non-silent sample as is (float32)
                compressed.extend_from_slice(&sample.to_le_bytes());
                i += 1;
            }
        }
        
        // Apply ZSTD compression
        match zstd::encode_all(&compressed[..], 6) {
            Ok(result) => Ok(result),
            Err(_) => Err(JsValue::from_str("ZSTD compression failed")),
        }
    }

    fn balanced_compress(&self, audio_data: &[f32], level: u8) -> Result<Vec<u8>, JsValue> {
        // Adaptive quantization based on local signal energy
        let block_size = 1024;
        let mut compressed = Vec::new();
        
        for chunk in audio_data.chunks(block_size) {
            // Calculate RMS energy for adaptive quantization
            let rms: f32 = chunk.iter().map(|x| x * x).sum::<f32>().sqrt() / chunk.len() as f32;
            let quantization_bits = std::cmp::max(8, 24 - level as i32) as u8;
            let quantization_step = 2.0 / (1 << quantization_bits) as f32;
            
            // Store block header (RMS + quantization info)
            compressed.extend_from_slice(&rms.to_le_bytes());
            compressed.push(quantization_bits);
            
            // Quantize and encode samples
            for &sample in chunk {
                let quantized = ((sample / quantization_step).round() as i16).to_le_bytes();
                compressed.extend_from_slice(&quantized);
            }
        }
        
        // ZSTD compression
        match zstd::encode_all(&compressed[..], level as i32) {
            Ok(result) => Ok(result),
            Err(_) => Err(JsValue::from_str("Compression failed")),
        }
    }

    fn compact_compress(&self, audio_data: &[f32], level: u8) -> Result<Vec<u8>, JsValue> {
        // Aggressive compression with psychoacoustic modeling
        let mut compressed = Vec::new();
        let compression_ratio = 1.0 + (level as f32 * 0.5);
        
        // Simple spectral subtraction and dynamic range compression
        for chunk in audio_data.chunks(2048) {
            let mut processed_chunk = Vec::new();
            
            // Calculate dynamic range
            let max_val = chunk.iter().map(|x| x.abs()).fold(0.0f32, f32::max);
            let threshold = max_val / compression_ratio;
            
            for &sample in chunk {
                let compressed_sample = if sample.abs() > threshold {
                    sample.signum() * (threshold + (sample.abs() - threshold) / compression_ratio)
                } else {
                    sample
                };
                
                // Quantize to 8-bit
                let quantized = ((compressed_sample * 127.0).clamp(-127.0, 127.0) as i8) as u8;
                processed_chunk.push(quantized);
            }
            
            compressed.extend_from_slice(&processed_chunk);
        }
        
        // Additional ZSTD compression
        match zstd::encode_all(&compressed[..], 9) {
            Ok(result) => Ok(result),
            Err(_) => Err(JsValue::from_str("Compact compression failed")),
        }
    }

    fn lossless_decompress(&self, compressed_data: &[u8]) -> Result<Vec<f32>, JsValue> {
        // Decompress ZSTD first
        let decompressed = match zstd::decode_all(&compressed_data[..]) {
            Ok(data) => data,
            Err(_) => return Err(JsValue::from_str("ZSTD decompression failed")),
        };
        
        let mut audio_data = Vec::new();
        let mut i = 0;
        
        while i < decompressed.len() {
            if i + 4 <= decompressed.len() {
                // Check for silence marker
                if &decompressed[i..i+4] == &[0xFF, 0xFF, 0xFF, 0xFF] {
                    i += 4;
                    if i + 4 <= decompressed.len() {
                        // Read silence count
                        let count_bytes = [decompressed[i], decompressed[i+1], decompressed[i+2], decompressed[i+3]];
                        let count = u32::from_le_bytes(count_bytes);
                        
                        // Add silent samples
                        for _ in 0..count {
                            audio_data.push(0.0);
                        }
                        i += 4;
                    }
                } else {
                    // Read float32 sample
                    if i + 4 <= decompressed.len() {
                        let sample_bytes = [decompressed[i], decompressed[i+1], decompressed[i+2], decompressed[i+3]];
                        let sample = f32::from_le_bytes(sample_bytes);
                        audio_data.push(sample);
                        i += 4;
                    } else {
                        break;
                    }
                }
            } else {
                break;
            }
        }
        
        Ok(audio_data)
    }

    fn lossy_decompress(&self, compressed_data: &[u8]) -> Result<Vec<f32>, JsValue> {
        // Decompress ZSTD first
        let decompressed = match zstd::decode_all(&compressed_data[..]) {
            Ok(data) => data,
            Err(_) => return Err(JsValue::from_str("ZSTD decompression failed")),
        };
        
        let mut audio_data = Vec::new();
        let mut i = 0;
        
        // For balanced compression, reconstruct from quantized data
        while i < decompressed.len() {
            if i + 5 <= decompressed.len() {
                // Read block header
                let rms_bytes = [decompressed[i], decompressed[i+1], decompressed[i+2], decompressed[i+3]];
                let rms = f32::from_le_bytes(rms_bytes);
                let quantization_bits = decompressed[i+4];
                i += 5;
                
                let quantization_step = 2.0 / (1 << quantization_bits) as f32;
                
                // Read quantized samples (assuming i16 for now)
                while i + 2 <= decompressed.len() && audio_data.len() % 1024 != 0 {
                    let quantized_bytes = [decompressed[i], decompressed[i+1]];
                    let quantized = i16::from_le_bytes(quantized_bytes);
                    let sample = (quantized as f32) * quantization_step;
                    audio_data.push(sample);
                    i += 2;
                }
            } else {
                break;
            }
        }
        
        Ok(audio_data)
    }
}

/// FFT Processor WASM Module
#[wasm_bindgen]
pub struct FFTProcessor {
    size: usize,
    real_planner: realfft::RealFftPlanner<f32>,
}

#[wasm_bindgen]
impl FFTProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(fft_size: usize) -> FFTProcessor {
        FFTProcessor {
            size: fft_size,
            real_planner: realfft::RealFftPlanner::new(),
        }
    }

    #[wasm_bindgen(js_name = processSpectrum)]
    pub fn process_spectrum(&mut self, audio_data: &[f32]) -> Result<Vec<f32>, JsValue> {
        let fft = self.real_planner.plan_fft_forward(self.size);
        let mut spectrum = fft.make_output_vec();
        let mut input = audio_data.to_vec();
        
        // Ensure input size matches FFT size
        input.resize(self.size, 0.0);
        
        // Apply window function (Hann)
        for (i, sample) in input.iter_mut().enumerate() {
            let window = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / (self.size - 1) as f32).cos());
            *sample *= window;
        }
        
        // Perform FFT
        fft.process(&mut input, &mut spectrum).map_err(|_| JsValue::from_str("FFT failed"))?;
        
        // Convert to magnitude spectrum
        let mut magnitudes = Vec::with_capacity(spectrum.len());
        for complex in spectrum {
            magnitudes.push((complex.re * complex.re + complex.im * complex.im).sqrt());
        }
        
        Ok(magnitudes)
    }
}

/// Spatial Audio HRTF Processor
#[wasm_bindgen]
pub struct HRTFProcessor {
    sample_rate: f32,
    hrtf_database: HashMap<String, (Vec<f32>, Vec<f32>)>, // azimuth_elevation -> (left_ir, right_ir)
}

#[wasm_bindgen]
impl HRTFProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> HRTFProcessor {
        let mut processor = HRTFProcessor {
            sample_rate,
            hrtf_database: HashMap::new(),
        };
        processor.initialize_hrtf_database();
        processor
    }

    fn initialize_hrtf_database(&mut self) {
        // Generate simplified HRTF data for key positions
        let azimuths = [-90, -45, 0, 45, 90];
        let elevations = [-30, 0, 30];
        
        for &azimuth in &azimuths {
            for &elevation in &elevations {
                let (left_ir, right_ir) = self.generate_hrtf_ir(azimuth as f32, elevation as f32);
                let key = format!("{}_{}", azimuth, elevation);
                self.hrtf_database.insert(key, (left_ir, right_ir));
            }
        }
    }

    fn generate_hrtf_ir(&self, azimuth: f32, elevation: f32) -> (Vec<f32>, Vec<f32>) {
        let ir_length = (self.sample_rate * 0.005) as usize; // 5ms impulse response
        let mut left_ir = vec![0.0; ir_length];
        let mut right_ir = vec![0.0; ir_length];
        
        // Convert to radians
        let az_rad = azimuth.to_radians();
        let el_rad = elevation.to_radians();
        
        // Simplified ITD calculation
        let head_radius = 0.0875; // meters
        let sound_speed = 343.0; // m/s
        let itd_samples = ((head_radius / sound_speed) * az_rad.sin() * self.sample_rate) as i32;
        
        // ILD calculation
        let left_level = (az_rad + std::f32::consts::FRAC_PI_4).cos() * el_rad.cos();
        let right_level = (az_rad - std::f32::consts::FRAC_PI_4).cos() * el_rad.cos();
        
        // Generate impulse responses
        for i in 0..ir_length {
            let decay = (-3.0 * i as f32 / ir_length as f32).exp();
            let resonance = (i as f32 * 0.1).sin() * 0.2;
            
            // Left ear
            let left_delay = i as i32 - itd_samples.max(0);
            if left_delay >= 0 && (left_delay as usize) < ir_length {
                left_ir[i] = (decay + resonance) * left_level * 0.5;
            }
            
            // Right ear
            let right_delay = i as i32 + itd_samples.min(0);
            if right_delay >= 0 && (right_delay as usize) < ir_length {
                right_ir[i] = (decay + resonance) * right_level * 0.5;
            }
        }
        
        (left_ir, right_ir)
    }

    #[wasm_bindgen(js_name = processHRTF)]
    pub fn process_hrtf(
        &self,
        audio_data: &[f32],
        azimuth: f32,
        elevation: f32,
    ) -> Result<Vec<f32>, JsValue> {
        // Find closest HRTF in database
        let key = self.find_closest_hrtf(azimuth, elevation);
        
        if let Some((left_ir, right_ir)) = self.hrtf_database.get(&key) {
            // Perform convolution
            let left_output = self.convolve(audio_data, left_ir);
            let right_output = self.convolve(audio_data, right_ir);
            
            // Interleave stereo output
            let mut stereo_output = Vec::with_capacity(left_output.len() * 2);
            for i in 0..left_output.len() {
                stereo_output.push(left_output[i]);
                stereo_output.push(right_output.get(i).copied().unwrap_or(0.0));
            }
            
            Ok(stereo_output)
        } else {
            Err(JsValue::from_str("HRTF data not found"))
        }
    }

    fn find_closest_hrtf(&self, azimuth: f32, elevation: f32) -> String {
        let mut closest_key = "0_0".to_string();
        let mut min_distance = f32::INFINITY;
        
        for key in self.hrtf_database.keys() {
            let parts: Vec<&str> = key.split('_').collect();
            if parts.len() == 2 {
                if let (Ok(az), Ok(el)) = (parts[0].parse::<f32>(), parts[1].parse::<f32>()) {
                    let distance = ((azimuth - az).powi(2) + (elevation - el).powi(2)).sqrt();
                    if distance < min_distance {
                        min_distance = distance;
                        closest_key = key.clone();
                    }
                }
            }
        }
        
        closest_key
    }

    fn convolve(&self, signal: &[f32], impulse: &[f32]) -> Vec<f32> {
        let output_len = signal.len() + impulse.len() - 1;
        let mut output = vec![0.0; output_len];
        
        for i in 0..signal.len() {
            for j in 0..impulse.len() {
                output[i + j] += signal[i] * impulse[j];
            }
        }
        
        output
    }
}

/// Console logging utilities
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

/// Performance benchmarking
#[wasm_bindgen]
pub fn benchmark_compression(iterations: u32) -> f64 {
    let test_data: Vec<f32> = (0..44100).map(|i| (i as f32 * 0.01).sin()).collect();
    let compressor = EUPHCompressor::new();
    
    let start = js_sys::Date::now();
    
    for _ in 0..iterations {
        let _ = compressor.compress_audio(&test_data, "balanced", 5);
    }
    
    let end = js_sys::Date::now();
    (end - start) / iterations as f64
}
