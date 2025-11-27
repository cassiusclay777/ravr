use std::f32::consts::PI;
use nalgebra::{Vector3, Point3};
use num_complex::Complex;
use rustfft::{FftPlanner, Fft};
use std::sync::Arc;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct RelativisticEffects {
    hrtf_processor: HrtfProcessor,
    doppler_engine: DopplerEngine,
    time_dilator: TimeDilator,
    gravity_warper: GravityWarper,
    fft_processor: FftProcessor,
    enabled: bool,
    sample_rate: f32,
}

pub struct HrtfProcessor {
    listener_position: Point3<f32>,
    listener_rotation: Vector3<f32>,
    source_positions: Vec<Point3<f32>>,
    hrtf_database: HrtfDatabase,
}

pub struct DopplerEngine {
    source_velocity: Vector3<f32>,
    listener_velocity: Vector3<f32>,
    speed_of_sound: f32,
}

pub struct TimeDilator {
    dilation_curve: Vec<(f32, f32)>, // (time, dilation_factor)
    current_position: f32,
}

pub struct GravityWarper {
    gravity_wells: Vec<GravityWell>,
    warp_strength: f32,
}

#[derive(Clone)]
pub struct FftProcessor {
    fft_size: usize,
    forward_fft: Arc<dyn Fft<f32>>,
    inverse_fft: Arc<dyn Fft<f32>>,
    window: Vec<f32>,
    overlap_buffer: Vec<Complex<f32>>,
}

#[derive(Clone)]
pub struct GravityWell {
    position: Point3<f32>,
    mass: f32,
    radius: f32,
}

pub struct HrtfDatabase {
    // Simplified HRTF data structure
    azimuths: Vec<f32>,
    elevations: Vec<f32>,
    impulse_responses: Vec<Vec<Vec<f32>>>,
}

impl RelativisticEffects {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            hrtf_processor: HrtfProcessor::new(),
            doppler_engine: DopplerEngine::new(),
            time_dilator: TimeDilator::new(),
            gravity_warper: GravityWarper::new(),
            fft_processor: FftProcessor::new(2048),
            enabled: false,
            sample_rate,
        }
    }

    pub fn process_frame(&mut self, input: &[f32], sample_rate: u32) -> Vec<f32> {
        if !self.enabled {
            return input.to_vec();
        }

        let mut output = input.to_vec();

        // Apply 3D spatialization
        output = self.hrtf_processor.process(&output, sample_rate);

        // Apply Doppler effect
        output = self.doppler_engine.process(&output, sample_rate);

        // Apply time dilation
        output = self.time_dilator.process(&output, sample_rate);

        // Apply gravitational warping
        output = self.gravity_warper.process(&output, sample_rate);

        output
    }

    pub fn set_source_movement(&mut self, path: Vec<Point3<f32>>, velocity: Vector3<f32>) {
        self.hrtf_processor.source_positions = path;
        self.doppler_engine.source_velocity = velocity;
    }

    pub fn add_gravity_well(&mut self, position: Point3<f32>, mass: f32, radius: f32) {
        self.gravity_warper.gravity_wells.push(GravityWell {
            position,
            mass,
            radius,
        });
    }

    pub fn set_time_dilation_curve(&mut self, curve: Vec<(f32, f32)>) {
        self.time_dilator.dilation_curve = curve;
    }
}

impl HrtfProcessor {
    pub fn new() -> Self {
        Self {
            listener_position: Point3::origin(),
            listener_rotation: Vector3::zeros(),
            source_positions: vec![Point3::new(0.0, 0.0, 1.0)],
            hrtf_database: HrtfDatabase::load_default(),
        }
    }

    pub fn process(&self, input: &[f32], sample_rate: u32) -> Vec<f32> {
        let mut output = vec![0.0; input.len() * 2]; // Stereo output

        for source_pos in &self.source_positions {
            // Calculate azimuth and elevation relative to listener
            let relative_pos = source_pos - self.listener_position;
            let distance = relative_pos.norm();
            let azimuth = relative_pos.x.atan2(relative_pos.z);
            let elevation = (relative_pos.y / distance).asin();

            // Get HRTF impulse response for this position
            let (left_ir, right_ir) = self.hrtf_database.get_impulse_response(azimuth, elevation);

            // Convolve input with HRTF
            for (i, &sample) in input.iter().enumerate() {
                // Apply distance attenuation
                let attenuated = sample / (1.0 + distance * 0.1);
                
                // Simple convolution (real implementation would use FFT)
                if i * 2 < output.len() {
                    output[i * 2] += attenuated * left_ir[0];     // Left channel
                    output[i * 2 + 1] += attenuated * right_ir[0]; // Right channel
                }
            }
        }

        output
    }
}

impl DopplerEngine {
    pub fn new() -> Self {
        Self {
            source_velocity: Vector3::zeros(),
            listener_velocity: Vector3::zeros(),
            speed_of_sound: 343.0, // m/s in air at 20°C
        }
    }

    pub fn process(&self, input: &[f32], sample_rate: u32) -> Vec<f32> {
        let relative_velocity = self.source_velocity - self.listener_velocity;
        let velocity_magnitude = relative_velocity.norm();
        
        if velocity_magnitude < 0.01 {
            return input.to_vec();
        }

        // Calculate Doppler shift factor
        let doppler_factor = self.speed_of_sound / (self.speed_of_sound - velocity_magnitude);
        
        // Resample audio based on Doppler factor
        self.resample(input, doppler_factor, sample_rate)
    }

    fn resample(&self, input: &[f32], factor: f32, sample_rate: u32) -> Vec<f32> {
        let output_len = (input.len() as f32 * factor) as usize;
        let mut output = Vec::with_capacity(output_len);

        for i in 0..output_len {
            let source_idx = i as f32 / factor;
            let idx_floor = source_idx.floor() as usize;
            let fraction = source_idx - idx_floor as f32;

            if idx_floor + 1 < input.len() {
                // Linear interpolation
                let interpolated = input[idx_floor] * (1.0 - fraction) + 
                                 input[idx_floor + 1] * fraction;
                output.push(interpolated);
            } else if idx_floor < input.len() {
                output.push(input[idx_floor]);
            }
        }

        output
    }
}

impl TimeDilator {
    pub fn new() -> Self {
        Self {
            dilation_curve: vec![(0.0, 1.0), (1.0, 1.0)],
            current_position: 0.0,
        }
    }

    pub fn process(&mut self, input: &[f32], sample_rate: u32) -> Vec<f32> {
        let mut output = Vec::new();
        let samples_per_second = sample_rate as f32;
        
        for &sample in input {
            // Get current dilation factor from curve
            let dilation_factor = self.interpolate_curve(self.current_position);
            
            // Time passes differently based on dilation
            let time_step = 1.0 / (samples_per_second * dilation_factor);
            self.current_position += time_step;
            
            // Stretch or compress the audio
            if dilation_factor > 1.0 {
                // Time slowed down - repeat samples
                let repeat_count = dilation_factor as usize;
                for _ in 0..repeat_count {
                    output.push(sample);
                }
            } else if dilation_factor < 1.0 {
                // Time sped up - skip samples (simplified)
                if self.current_position.fract() < dilation_factor {
                    output.push(sample);
                }
            } else {
                output.push(sample);
            }
        }

        output
    }

    fn interpolate_curve(&self, position: f32) -> f32 {
        // Linear interpolation between curve points
        for window in self.dilation_curve.windows(2) {
            let (t1, v1) = window[0];
            let (t2, v2) = window[1];
            
            if position >= t1 && position <= t2 {
                let t = (position - t1) / (t2 - t1);
                return v1 * (1.0 - t) + v2 * t;
            }
        }
        
        1.0 // Default to no dilation
    }
}

impl GravityWarper {
    pub fn new() -> Self {
        Self {
            gravity_wells: Vec::new(),
            warp_strength: 0.5,
        }
    }

    pub fn process(&self, input: &[f32], sample_rate: u32) -> Vec<f32> {
        if self.gravity_wells.is_empty() {
            return input.to_vec();
        }

        let mut output = input.to_vec();
        
        for well in &self.gravity_wells {
            // Calculate gravitational time dilation
            let schwarzschild_radius = 2.0 * well.mass / (299792458.0_f32.powi(2));
            let time_dilation = (1.0 - schwarzschild_radius / well.radius).sqrt();
            
            // Apply frequency shift based on gravitational redshift
            let frequency_shift = 1.0 / time_dilation;
            
            // Apply psychoacoustic warping effect
            output = self.apply_frequency_warp(&output, frequency_shift, self.warp_strength);
        }

        output
    }

    fn apply_frequency_warp(&self, input: &[f32], shift: f32, strength: f32) -> Vec<f32> {
        // Simplified frequency domain manipulation
        // Real implementation would use FFT
        input.iter()
            .enumerate()
            .map(|(i, &sample)| {
                let warped_freq = (i as f32 * shift * strength).sin();
                sample * (1.0 + warped_freq * 0.1)
            })
            .collect()
    }
}

impl HrtfDatabase {
    fn load_default() -> Self {
        // Simplified HRTF database
        Self {
            azimuths: vec![0.0, 30.0, 60.0, 90.0, 120.0, 150.0, 180.0],
            elevations: vec![-45.0, 0.0, 45.0],
            impulse_responses: vec![vec![vec![1.0; 128]; 7]; 3],
        }
    }

    fn get_impulse_response(&self, azimuth: f32, elevation: f32) -> (Vec<f32>, Vec<f32>) {
        // Simplified HRTF lookup
        // Real implementation would interpolate between measured HRTFs
        let left_ir = vec![1.0, 0.5, 0.25, 0.125];
        let right_ir = vec![0.125, 0.25, 0.5, 1.0];
        (left_ir, right_ir)
    }
}

impl FftProcessor {
    pub fn new(fft_size: usize) -> Self {
        let mut planner = FftPlanner::new();
        let forward_fft = planner.plan_fft_forward(fft_size);
        let inverse_fft = planner.plan_fft_inverse(fft_size);
        
        // Generate Hann window
        let window: Vec<f32> = (0..fft_size)
            .map(|i| {
                let n = i as f32;
                let N = fft_size as f32;
                0.5 * (1.0 - (2.0 * PI * n / (N - 1.0)).cos())
            })
            .collect();

        Self {
            fft_size,
            forward_fft,
            inverse_fft,
            window,
            overlap_buffer: vec![Complex::new(0.0, 0.0); fft_size],
        }
    }

    pub fn process_with_frequency_domain_fn<F>(&mut self, input: &[f32], mut freq_fn: F) -> Vec<f32>
    where
        F: FnMut(&mut [Complex<f32>]),
    {
        let hop_size = self.fft_size / 4; // 75% overlap
        let mut output = vec![0.0; input.len()];
        
        for start in (0..input.len()).step_by(hop_size) {
            let end = (start + self.fft_size).min(input.len());
            let mut windowed = vec![Complex::new(0.0, 0.0); self.fft_size];
            
            // Apply window and convert to complex
            for (i, &sample) in input[start..end].iter().enumerate() {
                if i < self.window.len() {
                    windowed[i] = Complex::new(sample * self.window[i], 0.0);
                }
            }
            
            // Forward FFT
            self.forward_fft.process(&mut windowed);
            
            // Apply frequency domain processing
            freq_fn(&mut windowed);
            
            // Inverse FFT
            let mut ifft_result = windowed.clone();
            self.inverse_fft.process(&mut ifft_result);
            
            // Overlap-add with windowing
            for (i, complex_sample) in ifft_result.iter().enumerate() {
                if start + i < output.len() && i < self.window.len() {
                    output[start + i] += complex_sample.re * self.window[i] / self.fft_size as f32;
                }
            }
        }
        
        output
    }
}

// Additional trait implementations for serialization
impl Serialize for RelativisticEffects {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("RelativisticEffects", 3)?;
        state.serialize_field("enabled", &self.enabled)?;
        state.serialize_field("sample_rate", &self.sample_rate)?;
        state.serialize_field("gravity_wells", &self.gravity_warper.gravity_wells)?;
        state.end()
    }
}

impl<'de> Deserialize<'de> for RelativisticEffects {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        #[serde(field_identifier, rename_all = "snake_case")]
        enum Field {
            Enabled,
            SampleRate,
            GravityWells,
        }

        struct RelativisticEffectsVisitor;

        impl<'de> serde::de::Visitor<'de> for RelativisticEffectsVisitor {
            type Value = RelativisticEffects;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("struct RelativisticEffects")
            }

            fn visit_map<V>(self, mut map: V) -> Result<RelativisticEffects, V::Error>
            where
                V: serde::de::MapAccess<'de>,
            {
                let mut enabled = None;
                let mut sample_rate = None;
                let mut gravity_wells = None;

                while let Some(key) = map.next_key()? {
                    match key {
                        Field::Enabled => {
                            if enabled.is_some() {
                                return Err(serde::de::Error::duplicate_field("enabled"));
                            }
                            enabled = Some(map.next_value()?);
                        }
                        Field::SampleRate => {
                            if sample_rate.is_some() {
                                return Err(serde::de::Error::duplicate_field("sample_rate"));
                            }
                            sample_rate = Some(map.next_value()?);
                        }
                        Field::GravityWells => {
                            if gravity_wells.is_some() {
                                return Err(serde::de::Error::duplicate_field("gravity_wells"));
                            }
                            gravity_wells = Some(map.next_value()?);
                        }
                    }
                }

                let enabled = enabled.ok_or_else(|| serde::de::Error::missing_field("enabled"))?;
                let sample_rate = sample_rate.ok_or_else(|| serde::de::Error::missing_field("sample_rate"))?;
                let wells = gravity_wells.unwrap_or_default();

                let mut effects = RelativisticEffects::new(sample_rate);
                effects.enabled = enabled;
                effects.gravity_warper.gravity_wells = wells;
                Ok(effects)
            }
        }

        const FIELDS: &[&str] = &["enabled", "sample_rate", "gravity_wells"];
        deserializer.deserialize_struct("RelativisticEffects", FIELDS, RelativisticEffectsVisitor)
    }
}

// WASM bindings for web integration
#[cfg(target_arch = "wasm32")]
mod wasm_bindings {
    use super::*;
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    pub struct WasmRelativisticEffects {
        inner: RelativisticEffects,
    }

    #[wasm_bindgen]
    impl WasmRelativisticEffects {
        #[wasm_bindgen(constructor)]
        pub fn new(sample_rate: f32) -> Self {
            Self {
                inner: RelativisticEffects::new(sample_rate),
            }
        }

        #[wasm_bindgen(js_name = "processFrame")]
        pub fn process_frame(&mut self, input: &[f32]) -> Vec<f32> {
            self.inner.process_frame(input, self.inner.sample_rate as u32)
        }

        #[wasm_bindgen(js_name = "setEnabled")]
        pub fn set_enabled(&mut self, enabled: bool) {
            self.inner.enabled = enabled;
        }

        #[wasm_bindgen(js_name = "addGravityWell")]
        pub fn add_gravity_well(&mut self, x: f32, y: f32, z: f32, mass: f32, radius: f32) {
            self.inner.add_gravity_well(Point3::new(x, y, z), mass, radius);
        }

        #[wasm_bindgen(js_name = "setSourceMovement")]
        pub fn set_source_movement(&mut self, positions: &[f32], velocity: &[f32]) {
            if positions.len() >= 3 && velocity.len() >= 3 {
                let path = positions
                    .chunks(3)
                    .map(|chunk| Point3::new(chunk[0], chunk[1], chunk[2]))
                    .collect();
                let vel = Vector3::new(velocity[0], velocity[1], velocity[2]);
                self.inner.set_source_movement(path, vel);
            }
        }
    }
}
