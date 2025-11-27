use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

// Biquad filter coefficients and state
#[derive(Clone, Copy)]
struct BiquadState {
    // Coefficients
    b0: f32, b1: f32, b2: f32,
    a1: f32, a2: f32,
    // State per channel
    x1_l: f32, x2_l: f32, y1_l: f32, y2_l: f32,
    x1_r: f32, x2_r: f32, y1_r: f32, y2_r: f32,
}

impl Default for BiquadState {
    fn default() -> Self {
        Self {
            b0: 1.0, b1: 0.0, b2: 0.0,
            a1: 0.0, a2: 0.0,
            x1_l: 0.0, x2_l: 0.0, y1_l: 0.0, y2_l: 0.0,
            x1_r: 0.0, x2_r: 0.0, y1_r: 0.0, y2_r: 0.0,
        }
    }
}

impl BiquadState {
    // Process stereo sample pair - inlined for performance
    #[inline(always)]
    fn process_stereo(&mut self, in_l: f32, in_r: f32) -> (f32, f32) {
        // Left channel - Direct Form II Transposed
        let out_l = self.b0 * in_l + self.b1 * self.x1_l + self.b2 * self.x2_l
                  - self.a1 * self.y1_l - self.a2 * self.y2_l;
        self.x2_l = self.x1_l;
        self.x1_l = in_l;
        self.y2_l = self.y1_l;
        self.y1_l = out_l;

        // Right channel
        let out_r = self.b0 * in_r + self.b1 * self.x1_r + self.b2 * self.x2_r
                  - self.a1 * self.y1_r - self.a2 * self.y2_r;
        self.x2_r = self.x1_r;
        self.x1_r = in_r;
        self.y2_r = self.y1_r;
        self.y1_r = out_r;

        (out_l, out_r)
    }

    // Low-shelf filter design
    fn set_low_shelf(&mut self, freq: f32, gain_db: f32, sample_rate: f32) {
        let a = 10.0_f32.powf(gain_db / 40.0);
        let w0 = 2.0 * PI * freq / sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / 2.0 * ((a + 1.0/a) * (1.0/0.9 - 1.0) + 2.0).sqrt();
        let sqrt_a_2 = 2.0 * a.sqrt() * alpha;

        let a0 = (a + 1.0) + (a - 1.0) * cos_w0 + sqrt_a_2;
        self.b0 = (a * ((a + 1.0) - (a - 1.0) * cos_w0 + sqrt_a_2)) / a0;
        self.b1 = (2.0 * a * ((a - 1.0) - (a + 1.0) * cos_w0)) / a0;
        self.b2 = (a * ((a + 1.0) - (a - 1.0) * cos_w0 - sqrt_a_2)) / a0;
        self.a1 = (-2.0 * ((a - 1.0) + (a + 1.0) * cos_w0)) / a0;
        self.a2 = ((a + 1.0) + (a - 1.0) * cos_w0 - sqrt_a_2) / a0;
    }

    // Peaking EQ filter design
    fn set_peaking(&mut self, freq: f32, gain_db: f32, q: f32, sample_rate: f32) {
        let a = 10.0_f32.powf(gain_db / 40.0);
        let w0 = 2.0 * PI * freq / sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q);

        let a0 = 1.0 + alpha / a;
        self.b0 = (1.0 + alpha * a) / a0;
        self.b1 = (-2.0 * cos_w0) / a0;
        self.b2 = (1.0 - alpha * a) / a0;
        self.a1 = (-2.0 * cos_w0) / a0;
        self.a2 = (1.0 - alpha / a) / a0;
    }

    // High-shelf filter design
    fn set_high_shelf(&mut self, freq: f32, gain_db: f32, sample_rate: f32) {
        let a = 10.0_f32.powf(gain_db / 40.0);
        let w0 = 2.0 * PI * freq / sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / 2.0 * ((a + 1.0/a) * (1.0/0.9 - 1.0) + 2.0).sqrt();
        let sqrt_a_2 = 2.0 * a.sqrt() * alpha;

        let a0 = (a + 1.0) - (a - 1.0) * cos_w0 + sqrt_a_2;
        self.b0 = (a * ((a + 1.0) + (a - 1.0) * cos_w0 + sqrt_a_2)) / a0;
        self.b1 = (-2.0 * a * ((a - 1.0) + (a + 1.0) * cos_w0)) / a0;
        self.b2 = (a * ((a + 1.0) + (a - 1.0) * cos_w0 - sqrt_a_2)) / a0;
        self.a1 = (2.0 * ((a - 1.0) - (a + 1.0) * cos_w0)) / a0;
        self.a2 = ((a + 1.0) - (a - 1.0) * cos_w0 - sqrt_a_2) / a0;
    }
}

// Stereo compressor state
struct CompressorState {
    threshold_db: f32,
    ratio: f32,
    attack_coeff: f32,
    release_coeff: f32,
    envelope: f32,
    makeup_gain: f32,
}

impl Default for CompressorState {
    fn default() -> Self {
        Self {
            threshold_db: -24.0,
            ratio: 4.0,
            attack_coeff: 0.0,
            release_coeff: 0.0,
            envelope: 0.0,
            makeup_gain: 1.0,
        }
    }
}

impl CompressorState {
    fn update_coeffs(&mut self, attack_ms: f32, release_ms: f32, sample_rate: f32) {
        self.attack_coeff = (-1.0 / (attack_ms * 0.001 * sample_rate)).exp();
        self.release_coeff = (-1.0 / (release_ms * 0.001 * sample_rate)).exp();
    }

    #[inline(always)]
    fn process_stereo(&mut self, in_l: f32, in_r: f32) -> (f32, f32) {
        // Peak detection (stereo linked)
        let peak = in_l.abs().max(in_r.abs());
        let peak_db = if peak > 1e-10 { 20.0 * peak.log10() } else { -120.0 };

        // Gain computer
        let gain_reduction = if peak_db > self.threshold_db {
            let excess = peak_db - self.threshold_db;
            excess - (excess / self.ratio)
        } else {
            0.0
        };

        // Envelope follower (smooth)
        let coeff = if gain_reduction > self.envelope {
            self.attack_coeff
        } else {
            self.release_coeff
        };
        self.envelope = gain_reduction + coeff * (self.envelope - gain_reduction);

        // Apply gain
        let gain = 10.0_f32.powf(-self.envelope / 20.0) * self.makeup_gain;
        (in_l * gain, in_r * gain)
    }
}

// Brick-wall limiter state
struct LimiterState {
    threshold: f32,
    release_coeff: f32,
    envelope: f32,
}

impl Default for LimiterState {
    fn default() -> Self {
        Self {
            threshold: 0.98, // Just below 0 dBFS
            release_coeff: 0.9995,
            envelope: 0.0,
        }
    }
}

impl LimiterState {
    #[inline(always)]
    fn process_stereo(&mut self, in_l: f32, in_r: f32) -> (f32, f32) {
        let peak = in_l.abs().max(in_r.abs());
        
        if peak > self.threshold {
            let target_gain = 1.0 - (self.threshold / peak);
            if target_gain > self.envelope {
                self.envelope = target_gain; // Instant attack
            }
        }
        
        // Release
        self.envelope *= self.release_coeff;
        
        let gain = 1.0 - self.envelope;
        (in_l * gain, in_r * gain)
    }
}

// Schroeder reverb with decorrelated stereo
struct ReverbState {
    mix: f32,
    enabled: bool,
    // Comb filters (6 per channel, different primes for stereo decorrelation)
    comb_buffers_l: [Vec<f32>; 6],
    comb_buffers_r: [Vec<f32>; 6],
    comb_indices: [usize; 6],
    comb_feedback: f32,
    // Allpass filters (4 per channel)
    ap_buffers_l: [Vec<f32>; 4],
    ap_buffers_r: [Vec<f32>; 4],
    ap_indices: [usize; 4],
    ap_feedback: f32,
}

impl ReverbState {
    fn new(sample_rate: f32) -> Self {
        let scale = sample_rate / 48000.0;
        // Prime-based delays for natural sound (slightly different L/R)
        let comb_delays_l: [usize; 6] = [1557, 1617, 1491, 1422, 1277, 1356];
        let comb_delays_r: [usize; 6] = [1583, 1601, 1511, 1447, 1291, 1373];
        let ap_delays: [usize; 4] = [225, 556, 441, 341];

        Self {
            mix: 0.0,
            enabled: false,
            comb_buffers_l: comb_delays_l.map(|d| vec![0.0; (d as f32 * scale) as usize]),
            comb_buffers_r: comb_delays_r.map(|d| vec![0.0; (d as f32 * scale) as usize]),
            comb_indices: [0; 6],
            comb_feedback: 0.84,
            ap_buffers_l: ap_delays.map(|d| vec![0.0; (d as f32 * scale) as usize]),
            ap_buffers_r: ap_delays.map(|d| vec![0.0; (d as f32 * scale) as usize]),
            ap_indices: [0; 4],
            ap_feedback: 0.5,
        }
    }

    #[inline(always)]
    fn process_stereo(&mut self, in_l: f32, in_r: f32) -> (f32, f32) {
        if !self.enabled {
            return (in_l, in_r);
        }

        let mut out_l = 0.0_f32;
        let mut out_r = 0.0_f32;

        // Parallel comb filters
        for i in 0..6 {
            let idx = self.comb_indices[i];
            let buf_l = &mut self.comb_buffers_l[i];
            let buf_r = &mut self.comb_buffers_r[i];
            
            let delayed_l = buf_l[idx];
            let delayed_r = buf_r[idx];
            
            buf_l[idx] = in_l + delayed_l * self.comb_feedback;
            buf_r[idx] = in_r + delayed_r * self.comb_feedback;
            
            out_l += delayed_l;
            out_r += delayed_r;
            
            self.comb_indices[i] = (idx + 1) % buf_l.len();
        }

        out_l /= 6.0;
        out_r /= 6.0;

        // Series allpass filters for diffusion
        for i in 0..4 {
            let idx = self.ap_indices[i];
            let buf_l = &mut self.ap_buffers_l[i];
            let buf_r = &mut self.ap_buffers_r[i];
            
            let delayed_l = buf_l[idx];
            let delayed_r = buf_r[idx];
            
            let new_l = out_l + delayed_l * self.ap_feedback;
            let new_r = out_r + delayed_r * self.ap_feedback;
            
            buf_l[idx] = out_l;
            buf_r[idx] = out_r;
            
            out_l = delayed_l - new_l * self.ap_feedback;
            out_r = delayed_r - new_r * self.ap_feedback;
            
            self.ap_indices[i] = (idx + 1) % buf_l.len();
        }

        // Mix dry/wet
        let dry = 1.0 - self.mix;
        let wet = self.mix * 0.4; // Reduce reverb level
        
        (in_l * dry + out_l * wet, in_r * dry + out_r * wet)
    }
}

// =============================================================================
// MAIN DSP PROCESSOR - Optimized for real-time audio
// =============================================================================

#[wasm_bindgen]
pub struct WasmDspProcessor {
    sample_rate: f32,
    // 3-band parametric EQ
    eq_low: BiquadState,
    eq_mid: BiquadState,
    eq_high: BiquadState,
    // Dynamics
    compressor: CompressorState,
    limiter: LimiterState,
    // Effects
    reverb: ReverbState,
    // Settings cache
    eq_low_freq: f32,
    eq_mid_freq: f32,
    eq_high_freq: f32,
    eq_mid_q: f32,
}

#[wasm_bindgen]
impl WasmDspProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Self {
        let mut processor = Self {
            sample_rate,
            eq_low: BiquadState::default(),
            eq_mid: BiquadState::default(),
            eq_high: BiquadState::default(),
            compressor: CompressorState::default(),
            limiter: LimiterState::default(),
            reverb: ReverbState::new(sample_rate),
            eq_low_freq: 80.0,
            eq_mid_freq: 1000.0,
            eq_high_freq: 10000.0,
            eq_mid_q: 0.707,
        };
        
        // Initialize filters with flat response
        processor.eq_low.set_low_shelf(80.0, 0.0, sample_rate);
        processor.eq_mid.set_peaking(1000.0, 0.0, 0.707, sample_rate);
        processor.eq_high.set_high_shelf(10000.0, 0.0, sample_rate);
        processor.compressor.update_coeffs(5.0, 100.0, sample_rate);
        
        processor
    }

    // EQ Controls
    #[wasm_bindgen(js_name = "setEqLow")]
    pub fn set_eq_low(&mut self, gain_db: f32) {
        self.eq_low.set_low_shelf(self.eq_low_freq, gain_db, self.sample_rate);
    }

    #[wasm_bindgen(js_name = "setEqMid")]
    pub fn set_eq_mid(&mut self, gain_db: f32) {
        self.eq_mid.set_peaking(self.eq_mid_freq, gain_db, self.eq_mid_q, self.sample_rate);
    }

    #[wasm_bindgen(js_name = "setEqHigh")]
    pub fn set_eq_high(&mut self, gain_db: f32) {
        self.eq_high.set_high_shelf(self.eq_high_freq, gain_db, self.sample_rate);
    }

    #[wasm_bindgen(js_name = "setEqFrequencies")]
    pub fn set_eq_frequencies(&mut self, low_freq: f32, mid_freq: f32, high_freq: f32, mid_q: f32) {
        self.eq_low_freq = low_freq.clamp(20.0, 500.0);
        self.eq_mid_freq = mid_freq.clamp(200.0, 8000.0);
        self.eq_high_freq = high_freq.clamp(2000.0, 20000.0);
        self.eq_mid_q = mid_q.clamp(0.1, 10.0);
    }

    // Compressor Controls
    #[wasm_bindgen(js_name = "setCompressor")]
    pub fn set_compressor(&mut self, threshold_db: f32, ratio: f32, attack_ms: f32, release_ms: f32) {
        self.compressor.threshold_db = threshold_db.clamp(-60.0, 0.0);
        self.compressor.ratio = ratio.clamp(1.0, 20.0);
        self.compressor.update_coeffs(attack_ms, release_ms, self.sample_rate);
    }

    #[wasm_bindgen(js_name = "setCompressorMakeup")]
    pub fn set_compressor_makeup(&mut self, gain_db: f32) {
        self.compressor.makeup_gain = 10.0_f32.powf(gain_db / 20.0);
    }

    // Limiter Controls
    #[wasm_bindgen(js_name = "setLimiter")]
    pub fn set_limiter(&mut self, threshold_db: f32) {
        self.limiter.threshold = 10.0_f32.powf(threshold_db.clamp(-12.0, 0.0) / 20.0);
    }

    // Reverb Controls
    #[wasm_bindgen(js_name = "setReverb")]
    pub fn set_reverb(&mut self, mix: f32) {
        self.reverb.mix = mix.clamp(0.0, 1.0);
        self.reverb.enabled = mix > 0.001;
    }

    #[wasm_bindgen(js_name = "setReverbFeedback")]
    pub fn set_reverb_feedback(&mut self, feedback: f32) {
        self.reverb.comb_feedback = feedback.clamp(0.0, 0.98);
    }

    // ==========================================================================
    // MAIN PROCESSING - Ultra-optimized for real-time
    // ==========================================================================

    /// Process mono block
    #[wasm_bindgen(js_name = "processBlock")]
    pub fn process_block(&mut self, input: &[f32], output: &mut [f32]) {
        let len = input.len().min(output.len());
        
        for i in 0..len {
            let sample = input[i];
            // Process as mono->stereo->mono
            let (l, r) = self.process_sample(sample, sample);
            output[i] = (l + r) * 0.5;
        }
    }

    /// Process stereo block - main entry point for AudioWorklet
    #[wasm_bindgen(js_name = "processBlockStereo")]
    pub fn process_block_stereo(
        &mut self,
        input_l: &[f32],
        input_r: &[f32],
        output_l: &mut [f32],
        output_r: &mut [f32],
    ) {
        let len = input_l.len()
            .min(input_r.len())
            .min(output_l.len())
            .min(output_r.len());

        // Process in blocks of 4 for better cache efficiency
        let blocks = len / 4;
        let remainder = len % 4;

        for block in 0..blocks {
            let base = block * 4;
            for i in 0..4 {
                let idx = base + i;
                let (l, r) = self.process_sample(input_l[idx], input_r[idx]);
                output_l[idx] = l;
                output_r[idx] = r;
            }
        }

        // Handle remainder
        for i in (len - remainder)..len {
            let (l, r) = self.process_sample(input_l[i], input_r[i]);
            output_l[i] = l;
            output_r[i] = r;
        }
    }

    /// Process single stereo sample - inlined for maximum performance
    #[inline(always)]
    fn process_sample(&mut self, in_l: f32, in_r: f32) -> (f32, f32) {
        // 1. EQ Chain: Low shelf -> Mid peak -> High shelf
        let (l, r) = self.eq_low.process_stereo(in_l, in_r);
        let (l, r) = self.eq_mid.process_stereo(l, r);
        let (l, r) = self.eq_high.process_stereo(l, r);

        // 2. Compressor (stereo-linked)
        let (l, r) = self.compressor.process_stereo(l, r);

        // 3. Reverb (optional)
        let (l, r) = self.reverb.process_stereo(l, r);

        // 4. Limiter (always last, protects output)
        self.limiter.process_stereo(l, r)
    }

    /// Reset all filter states (call when seeking)
    #[wasm_bindgen(js_name = "reset")]
    pub fn reset(&mut self) {
        self.eq_low = BiquadState::default();
        self.eq_mid = BiquadState::default();
        self.eq_high = BiquadState::default();
        self.compressor.envelope = 0.0;
        self.limiter.envelope = 0.0;
        // Re-initialize filters
        self.eq_low.set_low_shelf(self.eq_low_freq, 0.0, self.sample_rate);
        self.eq_mid.set_peaking(self.eq_mid_freq, 0.0, self.eq_mid_q, self.sample_rate);
        self.eq_high.set_high_shelf(self.eq_high_freq, 0.0, self.sample_rate);
    }

    /// Get current compressor gain reduction in dB
    #[wasm_bindgen(js_name = "getGainReduction")]
    pub fn get_gain_reduction(&self) -> f32 {
        self.compressor.envelope
    }
}

// =============================================================================
// PHASE VOCODER - Pitch shifting (simplified)
// =============================================================================

#[wasm_bindgen]
pub struct PhaseVocoder {
    _fft_size: usize,
    _hop_size: usize,
    _sample_rate: f32,
    pitch_shift: f32,
}

#[wasm_bindgen]
impl PhaseVocoder {
    #[wasm_bindgen(constructor)]
    pub fn new(fft_size: usize, sample_rate: f32) -> Self {
        Self {
            _fft_size: fft_size,
            _hop_size: fft_size / 4,
            _sample_rate: sample_rate,
            pitch_shift: 1.0,
        }
    }

    #[wasm_bindgen(js_name = "setPitchShift")]
    pub fn set_pitch_shift(&mut self, shift: f32) {
        self.pitch_shift = shift.clamp(0.5, 2.0);
    }

    #[wasm_bindgen(js_name = "process")]
    pub fn process(&self, input: &[f32], output: &mut [f32]) {
        let len = input.len().min(output.len());
        
        for i in 0..len {
            let pos = (i as f32 * self.pitch_shift) as usize;
            output[i] = if pos < len { input[pos] } else { 0.0 };
        }
    }
}

// =============================================================================
// GRANULAR SYNTHESIZER
// =============================================================================

#[wasm_bindgen]
pub struct GranularSynth {
    grain_size: usize,
    grain_density: f32,
    buffer: Vec<f32>,
}

#[wasm_bindgen]
impl GranularSynth {
    #[wasm_bindgen(constructor)]
    pub fn new(grain_size: usize) -> Self {
        Self {
            grain_size,
            grain_density: 0.5,
            buffer: Vec::new(),
        }
    }

    #[wasm_bindgen(js_name = "setParameters")]
    pub fn set_parameters(&mut self, grain_size: usize, density: f32, _randomness: f32) {
        self.grain_size = grain_size;
        self.grain_density = density.clamp(0.0, 1.0);
    }

    #[wasm_bindgen(js_name = "loadBuffer")]
    pub fn load_buffer(&mut self, buffer: Vec<f32>) {
        self.buffer = buffer;
    }

    #[wasm_bindgen(js_name = "process")]
    pub fn process(&self, output: &mut [f32]) {
        if self.buffer.is_empty() {
            return;
        }

        let len = output.len();
        let buf_len = self.buffer.len();

        for i in 0..len {
            let grain_pos = (i % self.grain_size) as f32 / self.grain_size as f32;
            let envelope = (grain_pos * PI).sin(); // Hanning window
            let buf_idx = i % buf_len;
            output[i] = self.buffer[buf_idx] * envelope * self.grain_density;
        }
    }
}
