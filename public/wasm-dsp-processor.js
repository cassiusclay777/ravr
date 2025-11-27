// RAVR DSP AudioWorklet Processor - Optimized for low-latency real-time processing
// Handles EQ, Compression, Limiting, and Reverb in the audio thread

class RavrDspProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Processing state
    this.initialized = false;
    this.sampleRate = 48000;
    
    // EQ state (3-band parametric)
    this.eq = {
      lowGain: 0,    // dB
      midGain: 0,    // dB
      highGain: 0,   // dB
      lowFreq: 80,   // Hz
      midFreq: 1000, // Hz
      highFreq: 10000, // Hz
      midQ: 0.707    // Q factor
    };
    
    // Biquad filter coefficients (for each band, stereo)
    this.lowFilter = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0, x1L: 0, x2L: 0, y1L: 0, y2L: 0, x1R: 0, x2R: 0, y1R: 0, y2R: 0 };
    this.midFilter = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0, x1L: 0, x2L: 0, y1L: 0, y2L: 0, x1R: 0, x2R: 0, y1R: 0, y2R: 0 };
    this.highFilter = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0, x1L: 0, x2L: 0, y1L: 0, y2L: 0, x1R: 0, x2R: 0, y1R: 0, y2R: 0 };
    
    // Compressor state
    this.comp = {
      threshold: -24, // dB
      ratio: 4,
      attack: 0.005,  // seconds
      release: 0.1,   // seconds
      makeupGain: 0,  // dB
      envelope: 0     // current envelope level
    };
    
    // Limiter state
    this.limiter = {
      threshold: -0.1, // dB (just below 0)
      release: 0.05,
      envelope: 0
    };
    
    // Reverb state (simple Schroeder reverb)
    this.reverb = {
      mix: 0,
      enabled: false,
      // Comb filter delays (samples at 48kHz)
      combDelays: [1557, 1617, 1491, 1422, 1277, 1356],
      combFeedback: 0.84,
      // Allpass delays
      apDelays: [225, 556, 441, 341],
      apFeedback: 0.5,
      // Buffers (initialized on first process)
      combBuffersL: null,
      combBuffersR: null,
      apBuffersL: null,
      apBuffersR: null,
      combIndices: null,
      apIndices: null
    };
    
    // Message handling
    this.port.onmessage = (event) => this.handleMessage(event.data);
  }

  handleMessage(data) {
    switch (data.type) {
      case 'init':
        this.sampleRate = data.sampleRate || 48000;
        this.initializeProcessing();
        this.port.postMessage({ type: 'ready', mode: 'active' });
        break;
      case 'setEq':
        this.eq.lowGain = data.low || 0;
        this.eq.midGain = data.mid || 0;
        this.eq.highGain = data.high || 0;
        this.updateEqCoefficients();
        break;
      case 'setCompressor':
        this.comp.threshold = data.threshold || -24;
        this.comp.ratio = data.ratio || 4;
        this.comp.attack = data.attack / 1000 || 0.005;
        this.comp.release = data.release / 1000 || 0.1;
        break;
      case 'setLimiter':
        this.limiter.threshold = data.threshold || -0.1;
        break;
      case 'setReverb':
        this.reverb.mix = data.mix || 0;
        this.reverb.enabled = this.reverb.mix > 0.001;
        break;
    }
  }

  initializeProcessing() {
    this.updateEqCoefficients();
    this.initializeReverb();
    this.initialized = true;
  }

  // Calculate biquad coefficients for low-shelf filter
  calculateLowShelf(freq, gainDB) {
    const A = Math.pow(10, gainDB / 40);
    const w0 = 2 * Math.PI * freq / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const alpha = sinW0 / 2 * Math.sqrt((A + 1/A) * (1/0.9 - 1) + 2);
    
    const a0 = (A + 1) + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
    return {
      b0: (A * ((A + 1) - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha)) / a0,
      b1: (2 * A * ((A - 1) - (A + 1) * cosW0)) / a0,
      b2: (A * ((A + 1) - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha)) / a0,
      a1: (-2 * ((A - 1) + (A + 1) * cosW0)) / a0,
      a2: ((A + 1) + (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha) / a0
    };
  }

  // Calculate biquad coefficients for peaking EQ
  calculatePeaking(freq, gainDB, Q) {
    const A = Math.pow(10, gainDB / 40);
    const w0 = 2 * Math.PI * freq / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const alpha = sinW0 / (2 * Q);
    
    const a0 = 1 + alpha / A;
    return {
      b0: (1 + alpha * A) / a0,
      b1: (-2 * cosW0) / a0,
      b2: (1 - alpha * A) / a0,
      a1: (-2 * cosW0) / a0,
      a2: (1 - alpha / A) / a0
    };
  }

  // Calculate biquad coefficients for high-shelf filter
  calculateHighShelf(freq, gainDB) {
    const A = Math.pow(10, gainDB / 40);
    const w0 = 2 * Math.PI * freq / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const alpha = sinW0 / 2 * Math.sqrt((A + 1/A) * (1/0.9 - 1) + 2);
    
    const a0 = (A + 1) - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
    return {
      b0: (A * ((A + 1) + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha)) / a0,
      b1: (-2 * A * ((A - 1) + (A + 1) * cosW0)) / a0,
      b2: (A * ((A + 1) + (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha)) / a0,
      a1: (2 * ((A - 1) - (A + 1) * cosW0)) / a0,
      a2: ((A + 1) - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha) / a0
    };
  }

  updateEqCoefficients() {
    Object.assign(this.lowFilter, this.calculateLowShelf(this.eq.lowFreq, this.eq.lowGain));
    Object.assign(this.midFilter, this.calculatePeaking(this.eq.midFreq, this.eq.midGain, this.eq.midQ));
    Object.assign(this.highFilter, this.calculateHighShelf(this.eq.highFreq, this.eq.highGain));
  }

  initializeReverb() {
    const r = this.reverb;
    const scale = this.sampleRate / 48000; // Scale delays for sample rate
    
    r.combBuffersL = r.combDelays.map(d => new Float32Array(Math.floor(d * scale)));
    r.combBuffersR = r.combDelays.map(d => new Float32Array(Math.floor(d * scale)));
    r.apBuffersL = r.apDelays.map(d => new Float32Array(Math.floor(d * scale)));
    r.apBuffersR = r.apDelays.map(d => new Float32Array(Math.floor(d * scale)));
    r.combIndices = r.combDelays.map(() => 0);
    r.apIndices = r.apDelays.map(() => 0);
  }

  // Process biquad filter for a single sample
  processBiquad(filter, inputL, inputR) {
    // Left channel
    const yL = filter.b0 * inputL + filter.b1 * filter.x1L + filter.b2 * filter.x2L
                                  - filter.a1 * filter.y1L - filter.a2 * filter.y2L;
    filter.x2L = filter.x1L;
    filter.x1L = inputL;
    filter.y2L = filter.y1L;
    filter.y1L = yL;
    
    // Right channel
    const yR = filter.b0 * inputR + filter.b1 * filter.x1R + filter.b2 * filter.x2R
                                  - filter.a1 * filter.y1R - filter.a2 * filter.y2R;
    filter.x2R = filter.x1R;
    filter.x1R = inputR;
    filter.y2R = filter.y1R;
    filter.y1R = yR;
    
    return { left: yL, right: yR };
  }

  // Process compressor for a stereo sample pair
  processCompressor(left, right) {
    // Get peak level in dB
    const peak = Math.max(Math.abs(left), Math.abs(right));
    const peakDB = peak > 0 ? 20 * Math.log10(peak) : -120;
    
    // Calculate gain reduction
    let gainReduction = 0;
    if (peakDB > this.comp.threshold) {
      const excess = peakDB - this.comp.threshold;
      gainReduction = excess - (excess / this.comp.ratio);
    }
    
    // Envelope follower with attack/release
    const target = gainReduction;
    const coeff = target > this.comp.envelope ? this.comp.attack : this.comp.release;
    const alpha = 1 - Math.exp(-1 / (coeff * this.sampleRate));
    this.comp.envelope += alpha * (target - this.comp.envelope);
    
    // Apply gain reduction
    const gainLinear = Math.pow(10, -this.comp.envelope / 20);
    return { left: left * gainLinear, right: right * gainLinear };
  }

  // Process limiter for a stereo sample pair
  processLimiter(left, right) {
    const peak = Math.max(Math.abs(left), Math.abs(right));
    const thresholdLinear = Math.pow(10, this.limiter.threshold / 20);
    
    if (peak > thresholdLinear) {
      const gain = thresholdLinear / peak;
      this.limiter.envelope = Math.max(this.limiter.envelope, 1 - gain);
    }
    
    // Release envelope
    const releaseCoeff = 1 - Math.exp(-1 / (this.limiter.release * this.sampleRate));
    this.limiter.envelope *= (1 - releaseCoeff);
    
    const gain = 1 - this.limiter.envelope;
    return { left: left * gain, right: right * gain };
  }

  // Simple Schroeder reverb
  processReverb(left, right) {
    if (!this.reverb.enabled) return { left, right };
    
    const r = this.reverb;
    let outL = 0, outR = 0;
    
    // Parallel comb filters
    for (let i = 0; i < r.combBuffersL.length; i++) {
      const bufL = r.combBuffersL[i];
      const bufR = r.combBuffersR[i];
      const idx = r.combIndices[i];
      
      const delayedL = bufL[idx];
      const delayedR = bufR[idx];
      
      bufL[idx] = left + delayedL * r.combFeedback;
      bufR[idx] = right + delayedR * r.combFeedback;
      
      outL += delayedL;
      outR += delayedR;
      
      r.combIndices[i] = (idx + 1) % bufL.length;
    }
    
    outL /= r.combBuffersL.length;
    outR /= r.combBuffersR.length;
    
    // Series allpass filters
    for (let i = 0; i < r.apBuffersL.length; i++) {
      const bufL = r.apBuffersL[i];
      const bufR = r.apBuffersR[i];
      const idx = r.apIndices[i];
      
      const delayedL = bufL[idx];
      const delayedR = bufR[idx];
      
      const newL = outL + delayedL * r.apFeedback;
      const newR = outR + delayedR * r.apFeedback;
      
      bufL[idx] = outL;
      bufR[idx] = outR;
      
      outL = delayedL - newL * r.apFeedback;
      outR = delayedR - newR * r.apFeedback;
      
      r.apIndices[i] = (idx + 1) % bufL.length;
    }
    
    // Mix dry/wet
    const dry = 1 - r.mix;
    const wet = r.mix * 0.5; // Reduce reverb level
    
    return {
      left: left * dry + outL * wet,
      right: right * dry + outR * wet
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    
    // Handle no input
    if (!input || input.length === 0) return true;
    
    // Passthrough if not initialized
    if (!this.initialized) {
      for (let ch = 0; ch < output.length; ch++) {
        if (input[ch]) output[ch].set(input[ch]);
      }
      return true;
    }
    
    const inputL = input[0] || new Float32Array(128);
    const inputR = input[1] || input[0] || new Float32Array(128);
    const outputL = output[0];
    const outputR = output[1] || output[0];
    const blockSize = inputL.length;
    
    for (let i = 0; i < blockSize; i++) {
      let left = inputL[i];
      let right = inputR[i];
      
      // 1. EQ (3-band)
      const eqLow = this.processBiquad(this.lowFilter, left, right);
      const eqMid = this.processBiquad(this.midFilter, eqLow.left, eqLow.right);
      const eqHigh = this.processBiquad(this.highFilter, eqMid.left, eqMid.right);
      left = eqHigh.left;
      right = eqHigh.right;
      
      // 2. Compressor
      const compressed = this.processCompressor(left, right);
      left = compressed.left;
      right = compressed.right;
      
      // 3. Reverb (optional)
      if (this.reverb.enabled) {
        const reverbed = this.processReverb(left, right);
        left = reverbed.left;
        right = reverbed.right;
      }
      
      // 4. Limiter (always last)
      const limited = this.processLimiter(left, right);
      
      outputL[i] = limited.left;
      outputR[i] = limited.right;
    }
    
    return true;
  }
}

registerProcessor('wasm-dsp-processor', RavrDspProcessor);
