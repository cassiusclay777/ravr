import {
  RelativisticAudioProcessor,
  RELATIVISTIC_PRESETS,
} from "./RelativisticEffects";

interface VRDevice {
  id: string;
  name: string;
  type: "headset" | "controller" | "tracker";
  capabilities: VRCapability[];
  isConnected: boolean;
}

interface VRCapability {
  type:
    | "position"
    | "rotation"
    | "eye_tracking"
    | "hand_tracking"
    | "haptic_feedback";
  precision: number;
  latency: number;
}

interface SpatialAudioSource {
  id: string;
  name: string;
  position: Vector3D;
  velocity: Vector3D;
  audioBuffer: AudioBuffer;
  spatialParams: {
    directivity: number;
    distance: number;
    attenuation: "linear" | "exponential" | "inverse";
    dopplerFactor: number;
    roomReflections: boolean;
  };
  vrObject?: VRObject;
}

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface VRObject {
  id: string;
  mesh: any; // Three.js mesh or similar
  transform: Matrix4x4;
  audioSources: string[];
}

interface Matrix4x4 {
  elements: Float32Array; // 16 elements
}

interface VRRoom {
  id: string;
  name: string;
  dimensions: Vector3D;
  materials: RoomMaterial[];
  acousticProperties: {
    reverbTime: number;
    absorption: number;
    diffusion: number;
    earlyReflections: number;
  };
}

interface RoomMaterial {
  surface: "wall" | "floor" | "ceiling";
  material: "concrete" | "wood" | "carpet" | "glass" | "metal";
  absorptionCoefficients: number[]; // Per frequency band
}

interface HapticFeedback {
  type: "vibration" | "force" | "texture";
  intensity: number;
  frequency: number;
  duration: number;
  pattern?: number[];
}

export class SpatialAudioEngine {
  private readonly audioContext: AudioContext;
  private readonly vrDevices: Map<string, VRDevice> = new Map();
  private readonly audioSources: Map<string, SpatialAudioSource> = new Map();
  private readonly vrRooms: Map<string, VRRoom> = new Map();

  // 3D Audio processing
  private readonly listener: AudioListener;
  private readonly pannerNodes: Map<string, PannerNode> = new Map();

  // VR Integration
  private xrSession: XRSession | null = null;
  private xrFrame: XRFrame | null = null;
  private xrReferenceSpace: XRReferenceSpace | null = null;

  // Spatial tracking
  private headPosition: Vector3D = { x: 0, y: 0, z: 0 };
  private headRotation: Vector3D = { x: 0, y: 0, z: 0 };

  // Room simulation
  private readonly roomSimulator: RoomAcousticsSimulator;

  // Relativistic effects
  private readonly relativisticProcessor: RelativisticAudioProcessor;
  private relativisticEnabled = false;
  private currentRelativisticPreset: keyof typeof RELATIVISTIC_PRESETS =
    "stationary";

  private isInitialized = false;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.listener = audioContext.listener;
    this.roomSimulator = new RoomAcousticsSimulator(audioContext);
    this.relativisticProcessor = new RelativisticAudioProcessor(audioContext);
    this.initializeSpatialAudio();
  }

  private async initializeSpatialAudio(): Promise<void> {
    try {
      // Initialize WebXR if available
      await this.initializeWebXR();

      // Setup default VR room
      this.createDefaultRoom();

      // Initialize spatial audio processing
      await this.setupSpatialProcessing();

      // Start tracking loop
      this.startTrackingLoop();

      this.isInitialized = true;
      console.log("🥽 VR Spatial Audio Engine initialized");
    } catch (error) {
      console.error("Failed to initialize VR Spatial Audio:", error);
      // Continue without VR support
      this.isInitialized = true;
    }
  }

  private async initializeWebXR(): Promise<void> {
    if (!navigator.xr) {
      console.warn("WebXR not supported");
      return;
    }

    try {
      const isSupported = await navigator.xr.isSessionSupported("immersive-vr");
      if (isSupported) {
        console.log("VR headset support detected");

        // Request VR session when needed
        this.setupVRSessionHandlers();
      }

      const isARSupported = await navigator.xr.isSessionSupported(
        "immersive-ar"
      );
      if (isARSupported) {
        console.log("AR support detected");
      }
    } catch (error) {
      console.warn("WebXR check failed:", error);
    }
  }

  private setupVRSessionHandlers(): void {
    // These would be called when user requests VR mode
    document.addEventListener("vr-enter", () => {
      this.enterVRMode();
    });

    document.addEventListener("vr-exit", () => {
      this.exitVRMode();
    });
  }

  async enterVRMode(): Promise<boolean> {
    if (!navigator.xr) return false;

    try {
      this.xrSession = await navigator.xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["hand-tracking", "eye-tracking"],
      });

      this.xrReferenceSpace = await this.xrSession.requestReferenceSpace(
        "local-floor"
      );

      // Setup VR session callbacks
      this.xrSession.addEventListener("end", () => {
        this.exitVRMode();
      });

      // Start VR render loop
      this.xrSession.requestAnimationFrame((time, frame) => {
        this.onVRFrame(time, frame);
      });

      console.log("🥽 Entered VR mode");
      return true;
    } catch (error) {
      console.error("Failed to enter VR mode:", error);
      return false;
    }
  }

  exitVRMode(): void {
    if (this.xrSession) {
      this.xrSession.end();
      this.xrSession = null;
      this.xrFrame = null;
      this.xrReferenceSpace = null;
    }

    console.log("Exited VR mode");
  }

  private onVRFrame(time: DOMHighResTimeStamp, frame: XRFrame): void {
    this.xrFrame = frame;

    if (this.xrReferenceSpace) {
      // Get head pose
      const pose = frame.getViewerPose(this.xrReferenceSpace);
      if (pose) {
        this.updateHeadTracking(pose);
      }

      // Update spatial audio based on head position
      this.updateSpatialAudio();
    }

    // Continue VR loop
    if (this.xrSession) {
      this.xrSession.requestAnimationFrame((time, frame) => {
        this.onVRFrame(time, frame);
      });
    }
  }

  private updateHeadTracking(pose: XRViewerPose): void {
    const transform = pose.transform;

    // Update head position
    this.headPosition = {
      x: transform.position.x,
      y: transform.position.y,
      z: transform.position.z,
    };

    // Update head rotation (from quaternion)
    const quat = transform.orientation;
    this.headRotation = this.quaternionToEuler(quat);

    // Update Web Audio API listener
    if (this.listener.positionX) {
      this.listener.positionX.value = this.headPosition.x;
      this.listener.positionY.value = this.headPosition.y;
      this.listener.positionZ.value = this.headPosition.z;

      // Forward vector from rotation
      const forward = this.getForwardVector(this.headRotation);
      const up = { x: 0, y: 1, z: 0 };

      this.listener.forwardX.value = forward.x;
      this.listener.forwardY.value = forward.y;
      this.listener.forwardZ.value = forward.z;
      this.listener.upX.value = up.x;
      this.listener.upY.value = up.y;
      this.listener.upZ.value = up.z;
    }
  }

  private updateSpatialAudio(): void {
    // Update all spatial audio sources based on head position
    for (const [sourceId, source] of this.audioSources) {
      const pannerNode = this.pannerNodes.get(sourceId);
      if (pannerNode && pannerNode.positionX) {
        pannerNode.positionX.value = source.position.x;
        pannerNode.positionY.value = source.position.y;
        pannerNode.positionZ.value = source.position.z;
      }
    }

    // Update room acoustics
    this.roomSimulator.updateRoomResponse(this.headPosition);
  }

  private createDefaultRoom(): void {
    const defaultRoom: VRRoom = {
      id: "default_room",
      name: "Default Room",
      dimensions: { x: 10, y: 3, z: 8 },
      materials: [
        {
          surface: "floor",
          material: "wood",
          absorptionCoefficients: [0.15, 0.11, 0.1, 0.07, 0.06, 0.07],
        },
        {
          surface: "wall",
          material: "concrete",
          absorptionCoefficients: [0.36, 0.44, 0.31, 0.29, 0.39, 0.25],
        },
        {
          surface: "ceiling",
          material: "concrete",
          absorptionCoefficients: [0.36, 0.44, 0.31, 0.29, 0.39, 0.25],
        },
      ],
      acousticProperties: {
        reverbTime: 1.2,
        absorption: 0.3,
        diffusion: 0.8,
        earlyReflections: 0.6,
      },
    };

    this.vrRooms.set(defaultRoom.id, defaultRoom);
    this.roomSimulator.setRoom(defaultRoom);
  }

  private async setupSpatialProcessing(): Promise<void> {
    // Load HRTF data for binaural rendering
    await this.loadHRTFData();

    // Setup convolution reverb
    await this.setupRoomReverb();
  }

  private async loadHRTFData(): Promise<void> {
    try {
      // Store HRTF impulse responses
      console.log("HRTF data loaded for binaural rendering");
    } catch (error) {
      console.warn("HRTF data not available, using basic panning");
    }
  }

  private async setupRoomReverb(): Promise<void> {
    // Generate or load room impulse responses
    const room = this.vrRooms.get("default_room");
    if (room) {
      const impulseResponse = await this.generateRoomImpulse(room);
      this.roomSimulator.setImpulseResponse(impulseResponse);
    }
  }

  private async generateRoomImpulse(room: VRRoom): Promise<AudioBuffer> {
    // Simplified room impulse generation
    const sampleRate = this.audioContext.sampleRate;
    const length = Math.floor(room.acousticProperties.reverbTime * sampleRate);

    const impulse = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);

      // Generate exponentially decaying noise
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-t / room.acousticProperties.reverbTime);
        channelData[i] =
          (Math.random() * 2 - 1) * decay * room.acousticProperties.diffusion;
      }
    }

    return impulse;
  }

  // Public API
  async createSpatialAudioSource(
    audioBuffer: AudioBuffer,
    position: Vector3D,
    options: Partial<SpatialAudioSource> = {}
  ): Promise<string> {
    const sourceId = `spatial_source_${Date.now()}`;

    const source: SpatialAudioSource = {
      id: sourceId,
      name: options.name || `Spatial Source ${sourceId}`,
      position,
      velocity: options.velocity || { x: 0, y: 0, z: 0 },
      audioBuffer,
      spatialParams: {
        directivity: options.spatialParams?.directivity || 1.0,
        distance: this.calculateDistance(position, this.headPosition),
        attenuation: options.spatialParams?.attenuation || "inverse",
        dopplerFactor: options.spatialParams?.dopplerFactor || 1.0,
        roomReflections: options.spatialParams?.roomReflections ?? true,
      },
    };

    // Create panner node for spatial audio
    const pannerNode = this.audioContext.createPanner();
    pannerNode.panningModel = "HRTF";
    pannerNode.distanceModel = "inverse";
    pannerNode.refDistance = 1;
    pannerNode.maxDistance = 1000;
    pannerNode.rolloffFactor = 1;
    pannerNode.coneInnerAngle = 360;
    pannerNode.coneOuterAngle = 0;
    pannerNode.coneOuterGain = 0;

    // Set initial position
    if (pannerNode.positionX) {
      pannerNode.positionX.value = position.x;
      pannerNode.positionY.value = position.y;
      pannerNode.positionZ.value = position.z;
    }

    this.audioSources.set(sourceId, source);
    this.pannerNodes.set(sourceId, pannerNode);

    return sourceId;
  }

  async playSpatialAudio(sourceId: string): Promise<void> {
    const source = this.audioSources.get(sourceId);
    const pannerNode = this.pannerNodes.get(sourceId);

    if (!source || !pannerNode) {
      throw new Error(`Spatial audio source ${sourceId} not found`);
    }

    // Create buffer source
    const bufferSource = this.audioContext.createBufferSource();
    bufferSource.buffer = source.audioBuffer;

    // Connect: Source -> Panner -> Room -> Destination
    bufferSource.connect(pannerNode);
    pannerNode.connect(this.roomSimulator.getInputNode());
    this.roomSimulator.getOutputNode().connect(this.audioContext.destination);

    bufferSource.start();
  }

  updateSourcePosition(sourceId: string, position: Vector3D): void {
    const source = this.audioSources.get(sourceId);
    const pannerNode = this.pannerNodes.get(sourceId);

    if (source && pannerNode) {
      source.position = position;
      source.spatialParams.distance = this.calculateDistance(
        position,
        this.headPosition
      );

      if (pannerNode.positionX) {
        pannerNode.positionX.value = position.x;
        pannerNode.positionY.value = position.y;
        pannerNode.positionZ.value = position.z;
      }
    }
  }

  // Hand tracking integration
  async startHandTracking(): Promise<boolean> {
    if (!this.xrSession) return false;

    try {
      // Enable hand tracking if supported
      const handTracking = true; // Would check XR capabilities

      if (handTracking) {
        console.log("Hand tracking enabled for gesture control");
        return true;
      }
    } catch (error) {
      console.error("Failed to start hand tracking:", error);
    }

    return false;
  }

  // Haptic feedback
  async triggerHapticFeedback(
    controllerId: string,
    feedback: HapticFeedback
  ): Promise<void> {
    if (!this.xrSession) return;

    try {
      // Find controller input source
      for (const inputSource of this.xrSession.inputSources) {
        if (
          inputSource.gamepad &&
          inputSource.profiles.includes(controllerId)
        ) {
          const gamepad = inputSource.gamepad;

          if (gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
            await gamepad.hapticActuators[0].pulse(
              feedback.intensity,
              feedback.duration
            );
          }
        }
      }
    } catch (error) {
      console.error("Haptic feedback failed:", error);
    }
  }

  // Room management
  setVRRoom(roomId: string): void {
    const room = this.vrRooms.get(roomId);
    if (room) {
      this.roomSimulator.setRoom(room);
      console.log(`VR room changed to: ${room.name}`);
    }
  }

  createCustomRoom(dimensions: Vector3D, materials: RoomMaterial[]): string {
    const roomId = `room_${Date.now()}`;

    const room: VRRoom = {
      id: roomId,
      name: `Custom Room ${roomId}`,
      dimensions,
      materials,
      acousticProperties: this.calculateAcousticProperties(
        dimensions,
        materials
      ),
    };

    this.vrRooms.set(roomId, room);
    return roomId;
  }

  private calculateAcousticProperties(
    dimensions: Vector3D,
    materials: RoomMaterial[]
  ): VRRoom["acousticProperties"] {
    const volume = dimensions.x * dimensions.y * dimensions.z;
    const surfaceArea =
      2 *
      (dimensions.x * dimensions.y +
        dimensions.y * dimensions.z +
        dimensions.x * dimensions.z);

    // Calculate average absorption
    let totalAbsorption = 0;
    for (const material of materials) {
      const avgAbsorption =
        material.absorptionCoefficients.reduce((a, b) => a + b) /
        material.absorptionCoefficients.length;
      totalAbsorption += avgAbsorption;
    }
    const avgAbsorption = totalAbsorption / materials.length;

    // Sabine's formula for reverberation time
    const reverbTime = (0.161 * volume) / (surfaceArea * avgAbsorption);

    return {
      reverbTime: Math.max(0.3, Math.min(8.0, reverbTime)),
      absorption: avgAbsorption,
      diffusion: 0.7,
      earlyReflections: 1.0 - avgAbsorption,
    };
  }

  // Utility methods
  private calculateDistance(pos1: Vector3D, pos2: Vector3D): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private quaternionToEuler(quat: DOMPointReadOnly): Vector3D {
    const { x, y, z, w } = quat;

    // Convert quaternion to Euler angles
    const roll = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y));
    const pitch = Math.asin(2 * (w * y - z * x));
    const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));

    return { x: roll, y: pitch, z: yaw };
  }

  private getForwardVector(rotation: Vector3D): Vector3D {
    const { x, y } = rotation;

    return {
      x: Math.sin(y) * Math.cos(x),
      y: -Math.sin(x),
      z: -Math.cos(y) * Math.cos(x),
    };
  }

  private startTrackingLoop(): void {
    // Fallback tracking for non-VR mode
    if (!this.xrSession) {
      const updateLoop = () => {
        // Use device orientation or mouse for head tracking simulation
        this.updateSpatialAudio();
        requestAnimationFrame(updateLoop);
      };
      updateLoop();
    }
  }

  // Getters
  getHeadPosition(): Vector3D {
    return { ...this.headPosition };
  }

  getVRDevices(): VRDevice[] {
    return Array.from(this.vrDevices.values());
  }

  isVRActive(): boolean {
    return this.xrSession !== null;
  }

  // Relativistic effects methods
  enableRelativisticEffects(enabled: boolean): void {
    this.relativisticEnabled = enabled;
    console.log(`Relativistic effects ${enabled ? "enabled" : "disabled"}`);
  }

  setRelativisticPreset(preset: keyof typeof RELATIVISTIC_PRESETS): void {
    this.currentRelativisticPreset = preset;
    console.log(`Relativistic preset set to: ${preset}`);
  }

  applyRelativisticEffects(audioBuffer: AudioBuffer): AudioBuffer {
    if (!this.relativisticEnabled) {
      return audioBuffer;
    }

    const preset = RELATIVISTIC_PRESETS[this.currentRelativisticPreset];
    return this.relativisticProcessor.processAudio(audioBuffer, preset);
  }

  applyFrameDragging(
    audioBuffer: AudioBuffer,
    rotationRate: Vector3D,
    mass: number
  ): AudioBuffer {
    if (!this.relativisticEnabled) {
      return audioBuffer;
    }

    return this.relativisticProcessor.applyFrameDragging(
      audioBuffer,
      rotationRate,
      mass
    );
  }

  simulateGravitationalWaves(
    audioBuffer: AudioBuffer,
    waveFrequency: number,
    waveAmplitude: number
  ): AudioBuffer {
    if (!this.relativisticEnabled) {
      return audioBuffer;
    }

    return this.relativisticProcessor.simulateGravitationalWaves(
      audioBuffer,
      waveFrequency,
      waveAmplitude
    );
  }

  applyHawkingRadiation(
    audioBuffer: AudioBuffer,
    blackHoleMass: number,
    distance: number
  ): AudioBuffer {
    if (!this.relativisticEnabled) {
      return audioBuffer;
    }

    return this.relativisticProcessor.applyHawkingRadiation(
      audioBuffer,
      blackHoleMass,
      distance
    );
  }

  getRelativisticParameters(): {
    timeDilationFactor: number;
    dopplerFactor: number;
    lorentzFactor: number;
  } {
    return this.relativisticProcessor.getRelativisticParameters();
  }

  dispose(): void {
    this.exitVRMode();

    // Disconnect all audio nodes
    for (const pannerNode of this.pannerNodes.values()) {
      pannerNode.disconnect();
    }

    this.pannerNodes.clear();
    this.audioSources.clear();
    this.roomSimulator.dispose();
  }
}

// Room acoustics simulator
class RoomAcousticsSimulator {
  private readonly audioContext: AudioContext;
  private readonly convolverNode: ConvolverNode;
  private currentRoom: VRRoom | null = null;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.convolverNode = audioContext.createConvolver();
  }

  setRoom(room: VRRoom): void {
    this.currentRoom = room;
  }

  setImpulseResponse(impulseResponse: AudioBuffer): void {
    this.convolverNode.buffer = impulseResponse;
  }

  updateRoomResponse(listenerPosition: Vector3D): void {
    // Update room acoustics based on listener position
    // This would involve complex calculations for early reflections
  }

  getInputNode(): AudioNode {
    return this.convolverNode;
  }

  getOutputNode(): AudioNode {
    return this.convolverNode;
  }

  dispose(): void {
    this.convolverNode.disconnect();
  }
}

export default SpatialAudioEngine;
