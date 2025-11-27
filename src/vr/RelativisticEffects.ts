/**
 * 🚀 RELATIVISTIC AUDIO EFFECTS - Einstein's Audio Experience
 *
 * Implements special relativity effects in audio processing:
 * - Time dilation based on velocity
 * - Doppler shift with relativistic corrections
 * - Lorentz contraction of sound waves
 * - Gravitational time dilation
 * - Frame dragging effects
 */

interface RelativisticParams {
  velocity: Vector3D; // Observer velocity (fraction of c)
  acceleration: Vector3D; // Observer acceleration
  gravitationalField: number; // Gravitational potential
  spacetimeCurvature: number; // Curvature parameter
  referenceFrame: "inertial" | "accelerating" | "rotating";
}

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface AudioFrame {
  samples: Float32Array;
  sampleRate: number;
  timestamp: number;
  frameIndex: number;
}

export class RelativisticAudioProcessor {
  private speedOfLight = 299792458; // m/s
  private gravitationalConstant = 6.674e-11; // m³/kg/s²
  private timeDilationFactor = 1.0;
  private dopplerFactor = 1.0;
  private lorentzFactor = 1.0;

  constructor(private audioContext: AudioContext) {}

  /**
   * Process audio with relativistic effects
   */
  processAudio(
    audioBuffer: AudioBuffer,
    params: RelativisticParams
  ): AudioBuffer {
    const inputData = audioBuffer.getChannelData(0);
    const outputBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    // Calculate relativistic factors
    this.calculateRelativisticFactors(params);

    // Process each channel
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputChannel = audioBuffer.getChannelData(channel);
      const outputChannel = outputBuffer.getChannelData(channel);

      // Apply relativistic effects
      this.applyTimeDilation(inputChannel, outputChannel, params);
      this.applyDopplerShift(outputChannel, params);
      this.applyLorentzContraction(outputChannel, params);
      this.applyGravitationalEffects(outputChannel, params);
    }

    return outputBuffer;
  }

  /**
   * Calculate relativistic factors
   */
  private calculateRelativisticFactors(params: RelativisticParams): void {
    const velocity = this.calculateVelocityMagnitude(params.velocity);
    const v = velocity / this.speedOfLight; // Normalized velocity

    // Lorentz factor: γ = 1/√(1 - v²/c²)
    this.lorentzFactor = 1 / Math.sqrt(1 - v * v);

    // Time dilation: Δt' = γΔt
    this.timeDilationFactor = this.lorentzFactor;

    // Doppler factor with relativistic correction
    const cosTheta = this.calculateCosineAngle(params.velocity);
    this.dopplerFactor = Math.sqrt((1 + v * cosTheta) / (1 - v * cosTheta));
  }

  /**
   * Apply time dilation effect
   */
  private applyTimeDilation(
    input: Float32Array,
    output: Float32Array,
    params: RelativisticParams
  ): void {
    const dilationFactor = this.timeDilationFactor;
    const newLength = Math.floor(input.length * dilationFactor);

    // Resample with time dilation
    for (let i = 0; i < output.length; i++) {
      const sourceIndex = i / dilationFactor;
      const indexFloor = Math.floor(sourceIndex);
      const indexCeil = Math.min(indexFloor + 1, input.length - 1);
      const t = sourceIndex - indexFloor;

      // Linear interpolation with time dilation
      output[i] = input[indexFloor] * (1 - t) + input[indexCeil] * t;
    }
  }

  /**
   * Apply relativistic Doppler shift
   */
  private applyDopplerShift(
    output: Float32Array,
    params: RelativisticParams
  ): void {
    const dopplerShift = this.dopplerFactor;

    // Apply frequency shift
    for (let i = 0; i < output.length; i++) {
      // Simple frequency modulation approximation
      const phase = (2 * Math.PI * i * dopplerShift) / output.length;
      output[i] *= Math.cos(phase * 0.1); // Subtle modulation
    }
  }

  /**
   * Apply Lorentz contraction of sound waves
   */
  private applyLorentzContraction(
    output: Float32Array,
    params: RelativisticParams
  ): void {
    const contractionFactor = 1 / this.lorentzFactor;

    // Compress/expand the waveform
    const contractedLength = Math.floor(output.length * contractionFactor);
    const tempBuffer = new Float32Array(contractedLength);

    for (let i = 0; i < contractedLength; i++) {
      const sourceIndex = (i * output.length) / contractedLength;
      const indexFloor = Math.floor(sourceIndex);
      const indexCeil = Math.min(indexFloor + 1, output.length - 1);
      const t = sourceIndex - indexFloor;

      tempBuffer[i] = output[indexFloor] * (1 - t) + output[indexCeil] * t;
    }

    // Copy back with proper scaling
    for (let i = 0; i < output.length; i++) {
      const sourceIndex = (i * tempBuffer.length) / output.length;
      const indexFloor = Math.floor(sourceIndex);
      const indexCeil = Math.min(indexFloor + 1, tempBuffer.length - 1);
      const t = sourceIndex - indexFloor;

      output[i] = tempBuffer[indexFloor] * (1 - t) + tempBuffer[indexCeil] * t;
    }
  }

  /**
   * Apply gravitational time dilation effects
   */
  private applyGravitationalEffects(
    output: Float32Array,
    params: RelativisticParams
  ): void {
    const gravitationalFactor =
      1 + params.gravitationalField / (this.speedOfLight * this.speedOfLight);

    // Apply gravitational time dilation
    for (let i = 0; i < output.length; i++) {
      // Subtle gravitational modulation
      const gravitationalPhase =
        (2 * Math.PI * i * gravitationalFactor) / output.length;
      output[i] *= 1 + 0.05 * Math.sin(gravitationalPhase); // 5% modulation
    }
  }

  /**
   * Calculate velocity magnitude
   */
  private calculateVelocityMagnitude(velocity: Vector3D): number {
    return Math.sqrt(
      velocity.x * velocity.x +
        velocity.y * velocity.y +
        velocity.z * velocity.z
    );
  }

  /**
   * Calculate cosine of angle between velocity and audio direction
   */
  private calculateCosineAngle(velocity: Vector3D): number {
    // Assume audio is coming from positive Z direction
    const audioDirection = { x: 0, y: 0, z: 1 };
    const magnitude = this.calculateVelocityMagnitude(velocity);

    if (magnitude === 0) return 0;

    const dotProduct =
      velocity.x * audioDirection.x +
      velocity.y * audioDirection.y +
      velocity.z * audioDirection.z;
    return dotProduct / magnitude;
  }

  /**
   * Apply frame dragging effect (Lense-Thirring effect)
   */
  applyFrameDragging(
    audioBuffer: AudioBuffer,
    rotationRate: Vector3D,
    mass: number
  ): AudioBuffer {
    const outputBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    // Calculate frame dragging parameters
    const draggingFactor =
      (2 *
        this.gravitationalConstant *
        mass *
        this.calculateVelocityMagnitude(rotationRate)) /
      (this.speedOfLight * this.speedOfLight);

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputChannel = audioBuffer.getChannelData(channel);
      const outputChannel = outputBuffer.getChannelData(channel);

      // Apply frame dragging modulation
      for (let i = 0; i < inputChannel.length; i++) {
        const draggingPhase =
          (2 * Math.PI * i * draggingFactor) / inputChannel.length;
        outputChannel[i] =
          inputChannel[i] * (1 + 0.02 * Math.sin(draggingPhase));
      }
    }

    return outputBuffer;
  }

  /**
   * Create gravitational wave simulation
   */
  simulateGravitationalWaves(
    audioBuffer: AudioBuffer,
    waveFrequency: number,
    waveAmplitude: number
  ): AudioBuffer {
    const outputBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputChannel = audioBuffer.getChannelData(channel);
      const outputChannel = outputBuffer.getChannelData(channel);

      // Apply gravitational wave modulation
      for (let i = 0; i < inputChannel.length; i++) {
        const time = i / audioBuffer.sampleRate;
        const wavePhase = 2 * Math.PI * waveFrequency * time;

        // Gravitational wave strain effect
        const strain = waveAmplitude * Math.sin(wavePhase);
        outputChannel[i] = inputChannel[i] * (1 + strain);
      }
    }

    return outputBuffer;
  }

  /**
   * Apply Hawking radiation effect (quantum gravity)
   */
  applyHawkingRadiation(
    audioBuffer: AudioBuffer,
    blackHoleMass: number,
    distance: number
  ): AudioBuffer {
    const outputBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    // Calculate Hawking temperature
    const planckConstant = 6.626e-34;
    const boltzmannConstant = 1.381e-23;
    const schwarzschildRadius =
      (2 * this.gravitationalConstant * blackHoleMass) /
      (this.speedOfLight * this.speedOfLight);

    const hawkingTemperature =
      (planckConstant *
        this.speedOfLight *
        this.speedOfLight *
        this.speedOfLight) /
      (8 *
        Math.PI *
        this.gravitationalConstant *
        blackHoleMass *
        boltzmannConstant);

    // Apply thermal noise based on Hawking temperature
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputChannel = audioBuffer.getChannelData(channel);
      const outputChannel = outputBuffer.getChannelData(channel);

      for (let i = 0; i < inputChannel.length; i++) {
        // Add thermal noise proportional to Hawking temperature
        const thermalNoise = (Math.random() - 0.5) * hawkingTemperature * 1e-10;
        outputChannel[i] = inputChannel[i] + thermalNoise;
      }
    }

    return outputBuffer;
  }

  /**
   * Get current relativistic parameters
   */
  getRelativisticParameters(): {
    timeDilationFactor: number;
    dopplerFactor: number;
    lorentzFactor: number;
  } {
    return {
      timeDilationFactor: this.timeDilationFactor,
      dopplerFactor: this.dopplerFactor,
      lorentzFactor: this.lorentzFactor,
    };
  }
}

/**
 * Relativistic Audio Presets
 */
export const RELATIVISTIC_PRESETS = {
  // Stationary observer
  stationary: {
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    gravitationalField: 0,
    spacetimeCurvature: 0,
    referenceFrame: "inertial" as const,
  },

  // High-speed travel (10% speed of light)
  highSpeed: {
    velocity: { x: 0, y: 0, z: 0.1 },
    acceleration: { x: 0, y: 0, z: 0 },
    gravitationalField: 0,
    spacetimeCurvature: 0,
    referenceFrame: "inertial" as const,
  },

  // Near light speed (90% speed of light)
  nearLightSpeed: {
    velocity: { x: 0, y: 0, z: 0.9 },
    acceleration: { x: 0, y: 0, z: 0 },
    gravitationalField: 0,
    spacetimeCurvature: 0,
    referenceFrame: "inertial" as const,
  },

  // Strong gravitational field (near black hole)
  strongGravity: {
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    gravitationalField: 0.1,
    spacetimeCurvature: 0.05,
    referenceFrame: "inertial" as const,
  },

  // Accelerating reference frame
  accelerating: {
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 9.81 },
    gravitationalField: 0,
    spacetimeCurvature: 0,
    referenceFrame: "accelerating" as const,
  },
};

/**
 * Utility function to create relativistic audio effect
 */
export function createRelativisticEffect(
  audioContext: AudioContext,
  preset: keyof typeof RELATIVISTIC_PRESETS = "stationary"
): RelativisticAudioProcessor {
  const processor = new RelativisticAudioProcessor(audioContext);
  return processor;
}
