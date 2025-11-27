interface HRTFData {
  left: Float32Array;
  right: Float32Array;
  azimuth: number;
  elevation: number;
  distance: number;
}

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface ListenerOrientation {
  position: Vector3D;
  forward: Vector3D;
  up: Vector3D;
}

export class SpatialAudio {
  private ctx: AudioContext;
  private input: GainNode;
  private output: GainNode;
  private pannerNode: PannerNode;
  private convolver: ConvolverNode;
  private leftConvolver: ConvolverNode;
  private rightConvolver: ConvolverNode;
  private leftGain: GainNode;
  private rightGain: GainNode;
  private merger: ChannelMergerNode;
  private splitter: ChannelSplitterNode;
  
  private hrtfDatabase: Map<string, HRTFData> = new Map();
  private currentPosition: Vector3D = { x: 0, y: 0, z: -1 };
  private listenerOrientation: ListenerOrientation;
  private roomSize: Vector3D = { x: 10, y: 3, z: 10 };
  private reverbAmount = 0.3;
  private enableHRTF = true;
  private enableRoomSimulation = true;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    
    // Traditional Web Audio panner for fallback
    this.pannerNode = ctx.createPanner();
    this.pannerNode.panningModel = 'HRTF';
    this.pannerNode.distanceModel = 'inverse';
    this.pannerNode.refDistance = 1;
    this.pannerNode.maxDistance = 10000;
    this.pannerNode.rolloffFactor = 1;
    this.pannerNode.coneInnerAngle = 360;
    this.pannerNode.coneOuterAngle = 0;
    this.pannerNode.coneOuterGain = 0;

    // Custom HRTF processing nodes
    this.splitter = ctx.createChannelSplitter(2);
    this.leftConvolver = ctx.createConvolver();
    this.rightConvolver = ctx.createConvolver();
    this.leftGain = ctx.createGain();
    this.rightGain = ctx.createGain();
    this.merger = ctx.createChannelMerger(2);
    
    // Room simulation convolver
    this.convolver = ctx.createConvolver();
    
    this.listenerOrientation = {
      position: { x: 0, y: 0, z: 0 },
      forward: { x: 0, y: 0, z: -1 },
      up: { x: 0, y: 1, z: 0 }
    };

    this.initializeHRTF();
    this.connectNodes();
    this.generateRoomImpulse();
  }

  private connectNodes(): void {
    if (this.enableHRTF) {
      // Custom HRTF path
      this.input.connect(this.splitter);
      
      // Process left and right channels separately
      this.splitter.connect(this.leftConvolver, 0);
      this.splitter.connect(this.rightConvolver, 1);
      
      this.leftConvolver.connect(this.leftGain);
      this.rightConvolver.connect(this.rightGain);
      
      this.leftGain.connect(this.merger, 0, 0);
      this.rightGain.connect(this.merger, 0, 1);
      
      if (this.enableRoomSimulation) {
        this.merger.connect(this.convolver);
        this.convolver.connect(this.output);
      } else {
        this.merger.connect(this.output);
      }
    } else {
      // Fallback to Web Audio panner
      this.input.connect(this.pannerNode);
      
      if (this.enableRoomSimulation) {
        this.pannerNode.connect(this.convolver);
        this.convolver.connect(this.output);
      } else {
        this.pannerNode.connect(this.output);
      }
    }
  }

  private async initializeHRTF(): Promise<void> {
    // Generate simplified HRTF data
    // In a real implementation, this would load measured HRTF data
    const azimuths = [-90, -45, 0, 45, 90, 135, 180, -135];
    const elevations = [-40, -20, 0, 20, 40];
    
    for (const azimuth of azimuths) {
      for (const elevation of elevations) {
        const hrtfData = this.generateHRTF(azimuth, elevation);
        const key = `${azimuth}_${elevation}`;
        this.hrtfDatabase.set(key, hrtfData);
      }
    }
    
    // Set initial HRTF
    this.updateHRTF();
  }

  private generateHRTF(azimuth: number, elevation: number): HRTFData {
    // Simplified HRTF generation based on head-related transfer function approximation
    const sampleRate = this.ctx.sampleRate;
    const irLength = Math.floor(sampleRate * 0.005); // 5ms impulse response
    
    const leftIR = new Float32Array(irLength);
    const rightIR = new Float32Array(irLength);
    
    // Convert angles to radians
    const azRad = (azimuth * Math.PI) / 180;
    const elRad = (elevation * Math.PI) / 180;
    
    // Simplified ITD (Interaural Time Difference) calculation
    const headRadius = 0.0875; // Average head radius in meters
    const soundSpeed = 343; // Speed of sound in m/s
    const itdSamples = Math.floor((headRadius / soundSpeed) * Math.sin(azRad) * sampleRate);
    
    // Simplified ILD (Interaural Level Difference) calculation
    const leftLevel = Math.cos(azRad + Math.PI/4) * Math.cos(elRad);
    const rightLevel = Math.cos(azRad - Math.PI/4) * Math.cos(elRad);
    
    // Generate impulse responses with timing and level differences
    for (let i = 0; i < irLength; i++) {
      // Simple exponential decay with some resonance
      const decay = Math.exp(-i / (irLength * 0.3));
      const resonance = Math.sin(i * 0.1) * 0.2;
      
      // Left ear
      const leftDelay = i - Math.max(0, itdSamples);
      if (leftDelay >= 0 && leftDelay < irLength) {
        leftIR[i] = (decay + resonance) * leftLevel * 0.5;
      }
      
      // Right ear  
      const rightDelay = i + Math.min(0, itdSamples);
      if (rightDelay >= 0 && rightDelay < irLength) {
        rightIR[i] = (decay + resonance) * rightLevel * 0.5;
      }
    }
    
    return {
      left: leftIR,
      right: rightIR,
      azimuth,
      elevation,
      distance: 1
    };
  }

  private updateHRTF(): void {
    if (!this.enableHRTF) return;
    
    // Calculate azimuth and elevation from current position
    const { azimuth, elevation } = this.cartesianToSpherical(this.currentPosition);
    
    // Find closest HRTF data (simplified nearest neighbor)
    const closestKey = this.findClosestHRTF(azimuth, elevation);
    const hrtfData = this.hrtfDatabase.get(closestKey);
    
    if (hrtfData) {
      // Create audio buffers for convolution
      const leftBuffer = this.ctx.createBuffer(1, hrtfData.left.length, this.ctx.sampleRate);
      const rightBuffer = this.ctx.createBuffer(1, hrtfData.right.length, this.ctx.sampleRate);
      
      leftBuffer.copyToChannel(hrtfData.left, 0);
      rightBuffer.copyToChannel(hrtfData.right, 0);
      
      this.leftConvolver.buffer = leftBuffer;
      this.rightConvolver.buffer = rightBuffer;
      
      // Apply distance-based attenuation
      const distance = this.vectorLength(this.currentPosition);
      const attenuation = 1 / (1 + distance * 0.1);
      
      this.leftGain.gain.setTargetAtTime(attenuation, this.ctx.currentTime, 0.01);
      this.rightGain.gain.setTargetAtTime(attenuation, this.ctx.currentTime, 0.01);
    }
  }

  private cartesianToSpherical(position: Vector3D): { azimuth: number; elevation: number; distance: number } {
    const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
    const azimuth = Math.atan2(position.x, -position.z) * (180 / Math.PI);
    const elevation = Math.asin(position.y / distance) * (180 / Math.PI);
    
    return { azimuth, elevation, distance };
  }

  private findClosestHRTF(azimuth: number, elevation: number): string {
    let closestKey = '0_0';
    let minDistance = Infinity;
    
    for (const [key, hrtfData] of this.hrtfDatabase) {
      const azDiff = Math.abs(hrtfData.azimuth - azimuth);
      const elDiff = Math.abs(hrtfData.elevation - elevation);
      const distance = Math.sqrt(azDiff * azDiff + elDiff * elDiff);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestKey = key;
      }
    }
    
    return closestKey;
  }

  private generateRoomImpulse(): void {
    if (!this.enableRoomSimulation) return;
    
    // Generate room impulse based on room dimensions
    const duration = Math.max(0.1, Math.min(2.0, this.roomSize.x * this.roomSize.y * this.roomSize.z / 100));
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const t = i / this.ctx.sampleRate;
        
        // Room reflections simulation
        const decay = Math.exp(-t * 3);
        const earlyReflections = this.calculateEarlyReflections(t, channel);
        const lateReverb = (Math.random() * 2 - 1) * decay * 0.1;
        
        channelData[i] = (earlyReflections + lateReverb) * this.reverbAmount;
      }
    }
    
    this.convolver.buffer = buffer;
  }

  private calculateEarlyReflections(time: number, channel: number): number {
    // Simplified early reflections based on room geometry
    const reflections = [
      { delay: 0.01, gain: 0.3 }, // Floor
      { delay: 0.015, gain: 0.25 }, // Ceiling  
      { delay: 0.008, gain: 0.4 }, // Side wall
      { delay: 0.012, gain: 0.35 }, // Back wall
    ];
    
    let output = 0;
    const channelOffset = channel * 0.0005; // Slight stereo offset
    
    for (const reflection of reflections) {
      const reflectionTime = reflection.delay + channelOffset;
      if (Math.abs(time - reflectionTime) < 0.001) {
        output += reflection.gain * Math.sin(time * 1000) * Math.exp(-time * 10);
      }
    }
    
    return output;
  }

  private vectorLength(v: Vector3D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  // Public API methods
  setPosition(x: number, y: number, z: number): void {
    this.currentPosition = { x, y, z };
    
    if (this.enableHRTF) {
      this.updateHRTF();
    } else {
      this.pannerNode.positionX.setTargetAtTime(x, this.ctx.currentTime, 0.01);
      this.pannerNode.positionY.setTargetAtTime(y, this.ctx.currentTime, 0.01);
      this.pannerNode.positionZ.setTargetAtTime(z, this.ctx.currentTime, 0.01);
    }
  }

  setListenerPosition(x: number, y: number, z: number): void {
    this.listenerOrientation.position = { x, y, z };
    
    if (!this.enableHRTF) {
      this.ctx.listener.positionX.setTargetAtTime(x, this.ctx.currentTime, 0.01);
      this.ctx.listener.positionY.setTargetAtTime(y, this.ctx.currentTime, 0.01);
      this.ctx.listener.positionZ.setTargetAtTime(z, this.ctx.currentTime, 0.01);
    }
  }

  setListenerOrientation(forwardX: number, forwardY: number, forwardZ: number, 
                        upX: number = 0, upY: number = 1, upZ: number = 0): void {
    this.listenerOrientation.forward = { x: forwardX, y: forwardY, z: forwardZ };
    this.listenerOrientation.up = { x: upX, y: upY, z: upZ };
    
    if (!this.enableHRTF) {
      this.ctx.listener.forwardX.setTargetAtTime(forwardX, this.ctx.currentTime, 0.01);
      this.ctx.listener.forwardY.setTargetAtTime(forwardY, this.ctx.currentTime, 0.01);
      this.ctx.listener.forwardZ.setTargetAtTime(forwardZ, this.ctx.currentTime, 0.01);
      this.ctx.listener.upX.setTargetAtTime(upX, this.ctx.currentTime, 0.01);
      this.ctx.listener.upY.setTargetAtTime(upY, this.ctx.currentTime, 0.01);
      this.ctx.listener.upZ.setTargetAtTime(upZ, this.ctx.currentTime, 0.01);
    } else {
      this.updateHRTF();
    }
  }

  setRoomSize(width: number, height: number, depth: number): void {
    this.roomSize = { x: width, y: height, z: depth };
    if (this.enableRoomSimulation) {
      this.generateRoomImpulse();
    }
  }

  setReverbAmount(amount: number): void {
    this.reverbAmount = Math.max(0, Math.min(1, amount));
    if (this.enableRoomSimulation) {
      this.generateRoomImpulse();
    }
  }

  enableHRTFProcessing(enabled: boolean): void {
    if (this.enableHRTF !== enabled) {
      this.enableHRTF = enabled;
      this.disconnectNodes();
      this.connectNodes();
    }
  }

  enableRoomSimulation(enabled: boolean): void {
    if (this.enableRoomSimulation !== enabled) {
      this.enableRoomSimulation = enabled;
      this.disconnectNodes();
      this.connectNodes();
    }
  }

  // Movement helpers
  moveTowards(targetX: number, targetY: number, targetZ: number, speed: number = 1): void {
    const direction = {
      x: targetX - this.currentPosition.x,
      y: targetY - this.currentPosition.y,
      z: targetZ - this.currentPosition.z
    };
    
    const distance = this.vectorLength(direction);
    if (distance > 0.01) {
      const normalized = {
        x: direction.x / distance,
        y: direction.y / distance,
        z: direction.z / distance
      };
      
      const step = Math.min(speed * 0.016, distance); // Assume 60fps
      this.setPosition(
        this.currentPosition.x + normalized.x * step,
        this.currentPosition.y + normalized.y * step,
        this.currentPosition.z + normalized.z * step
      );
    }
  }

  orbit(centerX: number, centerY: number, centerZ: number, radius: number, angle: number): void {
    const x = centerX + radius * Math.cos(angle);
    const z = centerZ + radius * Math.sin(angle);
    this.setPosition(x, centerY, z);
  }

  private disconnectNodes(): void {
    try {
      this.input.disconnect();
      this.splitter.disconnect();
      this.leftConvolver.disconnect();
      this.rightConvolver.disconnect();
      this.leftGain.disconnect();
      this.rightGain.disconnect();
      this.merger.disconnect();
      this.pannerNode.disconnect();
      this.convolver.disconnect();
    } catch (e) {
      // Some nodes might already be disconnected
    }
  }

  getInput(): AudioNode { return this.input; }
  getOutput(): AudioNode { return this.output; }

  getAnalytics(): object {
    return {
      position: this.currentPosition,
      listenerOrientation: this.listenerOrientation,
      roomSize: this.roomSize,
      reverbAmount: this.reverbAmount,
      enableHRTF: this.enableHRTF,
      enableRoomSimulation: this.enableRoomSimulation,
      hrtfDataPoints: this.hrtfDatabase.size
    };
  }

  dispose(): void {
    this.disconnectNodes();
    this.output.disconnect();
  }
}
