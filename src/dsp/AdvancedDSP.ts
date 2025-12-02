/**
 * AdvancedDSP - Pokročilý DSP Chain
 * 4-60 pásmový parametrický EQ, Convolution Reverb, Kompresor, Limiter
 * Open-source implementace pro profesionální audio zpracování
 */

export interface ParametricEQBand {
  frequency: number; // Hz
  gain: number; // dB
  Q: number; // Quality factor
  type: BiquadFilterType; // lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
  enabled: boolean;
}

export interface CompressorSettings {
  threshold: number; // dB
  knee: number; // dB
  ratio: number; // 1:1 to 20:1
  attack: number; // seconds
  release: number; // seconds
  enabled: boolean;
}

export interface LimiterSettings {
  threshold: number; // dB
  release: number; // seconds
  enabled: boolean;
}

export interface ConvolutionReverbSettings {
  impulseResponse: AudioBuffer | null;
  wet: number; // 0-1
  dry: number; // 0-1
  enabled: boolean;
}

/**
 * Advanced DSP Chain Manager
 */
export class AdvancedDSP {
  private context: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;

  // DSP Nodes
  private eqBands: BiquadFilterNode[] = [];
  private compressor: DynamicsCompressorNode;
  private limiter: DynamicsCompressorNode;
  private convolverNode: ConvolutionNode | null = null;
  private convolutionWet: GainNode;
  private convolutionDry: GainNode;

  // Settings
  private eqSettings: ParametricEQBand[] = [];
  private compressorSettings: CompressorSettings;
  private limiterSettings: LimiterSettings;
  private convolverSettings: ConvolutionReverbSettings;

  // Bypass states
  private eqBypassed = false;
  private compressorBypassed = false;
  private limiterBypassed = false;
  private convolverBypassed = false;

  constructor(context: AudioContext, numEQBands: number = 10) {
    this.context = context;

    // Create input/output nodes
    this.inputNode = context.createGain();
    this.outputNode = context.createGain();

    // Initialize compressor
    this.compressor = context.createDynamicsCompressor();
    this.compressorSettings = {
      threshold: -24,
      knee: 30,
      ratio: 4,
      attack: 0.003,
      release: 0.25,
      enabled: true
    };
    this.applyCompressorSettings();

    // Initialize limiter (second compressor with hard settings)
    this.limiter = context.createDynamicsCompressor();
    this.limiterSettings = {
      threshold: -0.5,
      release: 0.01,
      enabled: true
    };
    this.applyLimiterSettings();

    // Initialize convolution reverb nodes
    this.convolutionWet = context.createGain();
    this.convolutionDry = context.createGain();
    this.convolverSettings = {
      impulseResponse: null,
      wet: 0.3,
      dry: 0.7,
      enabled: false
    };
    this.convolutionWet.gain.value = this.convolverSettings.wet;
    this.convolutionDry.gain.value = this.convolverSettings.dry;

    // Initialize parametric EQ with default bands
    this.initializeEQ(numEQBands);

    // Build initial signal chain
    this.rebuildChain();
  }

  /**
   * Initialize parametric EQ bands
   */
  private initializeEQ(numBands: number): void {
    // Clear existing bands
    this.eqBands.forEach(node => node.disconnect());
    this.eqBands = [];
    this.eqSettings = [];

    // Create frequency bands logarithmically distributed
    const minFreq = 20; // Hz
    const maxFreq = 20000; // Hz
    const freqRatio = Math.pow(maxFreq / minFreq, 1 / (numBands - 1));

    for (let i = 0; i < numBands; i++) {
      const filter = this.context.createBiquadFilter();
      const frequency = minFreq * Math.pow(freqRatio, i);

      // Determine filter type based on position
      let type: BiquadFilterType;
      if (i === 0) {
        type = 'lowshelf';
      } else if (i === numBands - 1) {
        type = 'highshelf';
      } else {
        type = 'peaking';
      }

      filter.type = type;
      filter.frequency.value = frequency;
      filter.gain.value = 0;
      filter.Q.value = 1.0;

      this.eqBands.push(filter);
      this.eqSettings.push({
        frequency,
        gain: 0,
        Q: 1.0,
        type,
        enabled: true
      });
    }
  }

  /**
   * Rebuild signal chain
   */
  private rebuildChain(): void {
    // Disconnect everything
    this.inputNode.disconnect();
    this.eqBands.forEach(band => band.disconnect());
    this.compressor.disconnect();
    this.limiter.disconnect();
    this.convolutionDry.disconnect();
    this.convolutionWet.disconnect();
    if (this.convolverNode) this.convolverNode.disconnect();

    let currentNode: AudioNode = this.inputNode;

    // EQ Chain
    if (!this.eqBypassed && this.eqBands.length > 0) {
      currentNode.connect(this.eqBands[0]);
      for (let i = 0; i < this.eqBands.length - 1; i++) {
        this.eqBands[i].connect(this.eqBands[i + 1]);
      }
      currentNode = this.eqBands[this.eqBands.length - 1];
    }

    // Convolution Reverb (parallel processing)
    if (!this.convolverBypassed && this.convolverNode && this.convolverSettings.impulseResponse) {
      // Dry path
      currentNode.connect(this.convolutionDry);

      // Wet path
      currentNode.connect(this.convolverNode);
      this.convolverNode.connect(this.convolutionWet);

      // Mix node
      const mixNode = this.context.createGain();
      this.convolutionDry.connect(mixNode);
      this.convolutionWet.connect(mixNode);

      currentNode = mixNode;
    }

    // Compressor
    if (!this.compressorBypassed) {
      currentNode.connect(this.compressor);
      currentNode = this.compressor;
    }

    // Limiter (final stage)
    if (!this.limiterBypassed) {
      currentNode.connect(this.limiter);
      currentNode = this.limiter;
    }

    // Connect to output
    currentNode.connect(this.outputNode);
  }

  /**
   * Get input node
   */
  get input(): AudioNode {
    return this.inputNode;
  }

  /**
   * Get output node
   */
  get output(): AudioNode {
    return this.outputNode;
  }

  /**
   * Set parametric EQ band
   */
  setEQBand(index: number, settings: Partial<ParametricEQBand>): void {
    if (index < 0 || index >= this.eqBands.length) {
      console.warn(`[AdvancedDSP] EQ band index ${index} out of range`);
      return;
    }

    const band = this.eqBands[index];
    const bandSettings = this.eqSettings[index];

    if (settings.frequency !== undefined) {
      band.frequency.setValueAtTime(settings.frequency, this.context.currentTime);
      bandSettings.frequency = settings.frequency;
    }

    if (settings.gain !== undefined) {
      band.gain.setValueAtTime(settings.gain, this.context.currentTime);
      bandSettings.gain = settings.gain;
    }

    if (settings.Q !== undefined) {
      band.Q.setValueAtTime(settings.Q, this.context.currentTime);
      bandSettings.Q = settings.Q;
    }

    if (settings.type !== undefined) {
      band.type = settings.type;
      bandSettings.type = settings.type;
    }

    if (settings.enabled !== undefined) {
      bandSettings.enabled = settings.enabled;
      // If disabled, set gain to 0
      if (!settings.enabled) {
        band.gain.setValueAtTime(0, this.context.currentTime);
      }
    }
  }

  /**
   * Get EQ band settings
   */
  getEQBand(index: number): ParametricEQBand | null {
    if (index < 0 || index >= this.eqSettings.length) {
      return null;
    }
    return { ...this.eqSettings[index] };
  }

  /**
   * Get all EQ bands
   */
  getAllEQBands(): ParametricEQBand[] {
    return this.eqSettings.map(band => ({ ...band }));
  }

  /**
   * Reset EQ to flat response
   */
  resetEQ(): void {
    this.eqSettings.forEach((settings, index) => {
      this.setEQBand(index, { gain: 0, enabled: true });
    });
  }

  /**
   * Set number of EQ bands
   */
  setEQBandCount(count: number): void {
    if (count < 4 || count > 60) {
      console.warn('[AdvancedDSP] EQ band count must be between 4 and 60');
      return;
    }

    this.initializeEQ(count);
    this.rebuildChain();
  }

  /**
   * Set compressor settings
   */
  setCompressor(settings: Partial<CompressorSettings>): void {
    this.compressorSettings = { ...this.compressorSettings, ...settings };
    this.applyCompressorSettings();

    if (settings.enabled !== undefined) {
      this.compressorBypassed = !settings.enabled;
      this.rebuildChain();
    }
  }

  /**
   * Apply compressor settings to node
   */
  private applyCompressorSettings(): void {
    this.compressor.threshold.setValueAtTime(
      this.compressorSettings.threshold,
      this.context.currentTime
    );
    this.compressor.knee.setValueAtTime(
      this.compressorSettings.knee,
      this.context.currentTime
    );
    this.compressor.ratio.setValueAtTime(
      this.compressorSettings.ratio,
      this.context.currentTime
    );
    this.compressor.attack.setValueAtTime(
      this.compressorSettings.attack,
      this.context.currentTime
    );
    this.compressor.release.setValueAtTime(
      this.compressorSettings.release,
      this.context.currentTime
    );
  }

  /**
   * Get compressor settings
   */
  getCompressor(): CompressorSettings {
    return { ...this.compressorSettings };
  }

  /**
   * Set limiter settings
   */
  setLimiter(settings: Partial<LimiterSettings>): void {
    this.limiterSettings = { ...this.limiterSettings, ...settings };
    this.applyLimiterSettings();

    if (settings.enabled !== undefined) {
      this.limiterBypassed = !settings.enabled;
      this.rebuildChain();
    }
  }

  /**
   * Apply limiter settings to node
   */
  private applyLimiterSettings(): void {
    this.limiter.threshold.setValueAtTime(
      this.limiterSettings.threshold,
      this.context.currentTime
    );
    this.limiter.knee.setValueAtTime(0, this.context.currentTime); // Hard knee
    this.limiter.ratio.setValueAtTime(20, this.context.currentTime); // High ratio
    this.limiter.attack.setValueAtTime(0.001, this.context.currentTime); // Fast attack
    this.limiter.release.setValueAtTime(
      this.limiterSettings.release,
      this.context.currentTime
    );
  }

  /**
   * Get limiter settings
   */
  getLimiter(): LimiterSettings {
    return { ...this.limiterSettings };
  }

  /**
   * Load impulse response for convolution reverb
   */
  async loadImpulseResponse(audioBuffer: AudioBuffer): Promise<void> {
    // Create new convolver node
    if (this.convolverNode) {
      this.convolverNode.disconnect();
    }

    this.convolverNode = this.context.createConvolver();
    this.convolverNode.buffer = audioBuffer;
    this.convolverNode.normalize = true;

    this.convolverSettings.impulseResponse = audioBuffer;
    this.convolverSettings.enabled = true;
    this.convolverBypassed = false;

    this.rebuildChain();

    console.log('[AdvancedDSP] Impulse response loaded:', {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels
    });
  }

  /**
   * Load impulse response from file
   */
  async loadImpulseResponseFromFile(file: File): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      await this.loadImpulseResponse(audioBuffer);
    } catch (error) {
      console.error('[AdvancedDSP] Failed to load impulse response:', error);
      throw error;
    }
  }

  /**
   * Load impulse response from URL
   */
  async loadImpulseResponseFromURL(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      await this.loadImpulseResponse(audioBuffer);
    } catch (error) {
      console.error('[AdvancedDSP] Failed to load impulse response from URL:', error);
      throw error;
    }
  }

  /**
   * Set convolution reverb settings
   */
  setConvolutionReverb(settings: Partial<ConvolutionReverbSettings>): void {
    this.convolverSettings = { ...this.convolverSettings, ...settings };

    if (settings.wet !== undefined) {
      this.convolutionWet.gain.setValueAtTime(settings.wet, this.context.currentTime);
    }

    if (settings.dry !== undefined) {
      this.convolutionDry.gain.setValueAtTime(settings.dry, this.context.currentTime);
    }

    if (settings.enabled !== undefined) {
      this.convolverBypassed = !settings.enabled;
      this.rebuildChain();
    }
  }

  /**
   * Get convolution reverb settings
   */
  getConvolutionReverb(): ConvolutionReverbSettings {
    return {
      ...this.convolverSettings,
      impulseResponse: this.convolverSettings.impulseResponse
    };
  }

  /**
   * Bypass EQ
   */
  bypassEQ(bypass: boolean): void {
    this.eqBypassed = bypass;
    this.rebuildChain();
  }

  /**
   * Bypass compressor
   */
  bypassCompressor(bypass: boolean): void {
    this.compressorBypassed = bypass;
    this.rebuildChain();
  }

  /**
   * Bypass limiter
   */
  bypassLimiter(bypass: boolean): void {
    this.limiterBypassed = bypass;
    this.rebuildChain();
  }

  /**
   * Bypass convolution reverb
   */
  bypassConvolutionReverb(bypass: boolean): void {
    this.convolverBypassed = bypass;
    this.rebuildChain();
  }

  /**
   * Get compressor reduction (for metering)
   */
  getCompressorReduction(): number {
    return this.compressor.reduction;
  }

  /**
   * Export all DSP settings
   */
  exportSettings(): {
    eq: ParametricEQBand[];
    compressor: CompressorSettings;
    limiter: LimiterSettings;
    convolution: Omit<ConvolutionReverbSettings, 'impulseResponse'>;
  } {
    return {
      eq: this.getAllEQBands(),
      compressor: this.getCompressor(),
      limiter: this.getLimiter(),
      convolution: {
        wet: this.convolverSettings.wet,
        dry: this.convolverSettings.dry,
        enabled: this.convolverSettings.enabled
      }
    };
  }

  /**
   * Import DSP settings
   */
  importSettings(settings: {
    eq?: ParametricEQBand[];
    compressor?: Partial<CompressorSettings>;
    limiter?: Partial<LimiterSettings>;
    convolution?: Partial<Omit<ConvolutionReverbSettings, 'impulseResponse'>>;
  }): void {
    if (settings.eq) {
      // Set EQ band count to match imported settings
      if (settings.eq.length !== this.eqBands.length) {
        this.setEQBandCount(settings.eq.length);
      }

      settings.eq.forEach((band, index) => {
        this.setEQBand(index, band);
      });
    }

    if (settings.compressor) {
      this.setCompressor(settings.compressor);
    }

    if (settings.limiter) {
      this.setLimiter(settings.limiter);
    }

    if (settings.convolution) {
      this.setConvolutionReverb(settings.convolution);
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.eqBands.forEach(band => band.disconnect());
    this.compressor.disconnect();
    this.limiter.disconnect();
    this.convolutionDry.disconnect();
    this.convolutionWet.disconnect();
    if (this.convolverNode) {
      this.convolverNode.disconnect();
    }
  }
}
