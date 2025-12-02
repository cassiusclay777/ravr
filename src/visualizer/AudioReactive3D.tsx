/**
 * AudioReactive3D - 3D Audio-Reactive Visualization + Dancing Character
 * Three.js particle grid vizualizace synchronizovaná s audio + tančící postava na beat
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export interface VisualizerSettings {
  particleCount: number;
  particleSize: number;
  particleColor: string;
  reactivityIntensity: number; // 0-1
  showCharacter: boolean;
  characterDanceIntensity: number; // 0-1
}

interface DancingCharacterProps {
  analyzer: AnalyserNode;
  bpm: number;
  intensity: number;
}

/**
 * BPM Detector - detekuje BPM z audio dat
 */
class BPMDetector {
  private sampleRate: number;
  private peaks: number[] = [];

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  detectBPM(audioData: Float32Array): number {
    // Detect beats using energy-based onset detection
    const frameSize = 512;
    const hopSize = 256;
    const energyHistory: number[] = [];

    // Calculate energy for each frame
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < frameSize; j++) {
        energy += audioData[i + j] * audioData[i + j];
      }
      energyHistory.push(energy / frameSize);
    }

    // Detect peaks (beats)
    this.peaks = [];
    const threshold = this.calculateThreshold(energyHistory);

    for (let i = 1; i < energyHistory.length - 1; i++) {
      if (
        energyHistory[i] > threshold &&
        energyHistory[i] > energyHistory[i - 1] &&
        energyHistory[i] > energyHistory[i + 1]
      ) {
        this.peaks.push(i);
      }
    }

    // Calculate BPM from peak intervals
    if (this.peaks.length < 2) {
      return 120; // Default
    }

    const intervals: number[] = [];
    for (let i = 1; i < this.peaks.length; i++) {
      intervals.push(this.peaks[i] - this.peaks[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const timePerFrame = hopSize / this.sampleRate;
    const bpm = 60 / (avgInterval * timePerFrame);

    return Math.max(60, Math.min(200, bpm)); // Clamp to reasonable range
  }

  private calculateThreshold(energyHistory: number[]): number {
    const sorted = [...energyHistory].sort((a, b) => a - b);
    const percentile90 = sorted[Math.floor(sorted.length * 0.9)];
    return percentile90 * 0.7; // 70% of 90th percentile
  }

  getBeats(): number[] {
    return this.peaks;
  }
}

/**
 * Audio-Reactive 3D Particle Grid
 */
export const AudioReactive3D: React.FC<{
  analyzer: AnalyserNode | null;
  settings: VisualizerSettings;
}> = ({ analyzer, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const characterRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [bpm, setBPM] = useState(120);
  const [beatPhase, setBeatPhase] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !analyzer) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create particle grid
    const particles = createParticleGrid(settings.particleCount, settings.particleSize, settings.particleColor);
    scene.add(particles);
    particlesRef.current = particles;

    // Create dancing character if enabled
    if (settings.showCharacter) {
      const character = createDancingCharacter();
      character.position.y = -15;
      scene.add(character);
      characterRef.current = character;
    }

    // Audio analysis setup
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Float32Array(bufferLength);

    // BPM detector
    const bpmDetector = new BPMDetector(analyzer.context.sampleRate);
    let frameCount = 0;
    let lastBPMUpdate = 0;

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Get audio data
      analyzer.getByteFrequencyData(dataArray);
      analyzer.getFloatTimeDomainData(timeDataArray);

      // Update BPM every 60 frames (~1 second at 60fps)
      frameCount++;
      if (frameCount - lastBPMUpdate > 60) {
        const detectedBPM = bpmDetector.detectBPM(timeDataArray);
        setBPM(detectedBPM);
        lastBPMUpdate = frameCount;
      }

      // Calculate beat phase (0-1 through beat cycle)
      const beatsPerSecond = bpm / 60;
      const beatDuration = 1 / beatsPerSecond;
      const currentTime = analyzer.context.currentTime;
      const phase = (currentTime % beatDuration) / beatDuration;
      setBeatPhase(phase);

      // Update particles based on frequency data
      if (particlesRef.current) {
        updateParticles(particlesRef.current, dataArray, settings.reactivityIntensity);
      }

      // Update dancing character based on beat
      if (characterRef.current && settings.showCharacter) {
        updateCharacter(characterRef.current, phase, dataArray, settings.characterDanceIntensity);
      }

      // Rotate scene slowly
      scene.rotation.y += 0.001;

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;

      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, [analyzer, settings]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* BPM Display */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          textShadow: '0 0 10px rgba(0, 255, 255, 0.8)',
          fontFamily: 'monospace',
          zIndex: 10,
        }}
      >
        {bpm} BPM
      </div>

      {/* Beat Indicator */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          right: 20,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(0, 255, 255, ${beatPhase > 0.8 ? 1 : 0.2}), transparent)`,
          boxShadow: beatPhase > 0.8 ? '0 0 30px rgba(0, 255, 255, 1)' : 'none',
          transition: 'all 0.1s ease',
          zIndex: 10,
        }}
      />
    </div>
  );
};

/**
 * Create particle grid
 */
function createParticleGrid(count: number, size: number, color: string): THREE.Points {
  const geometry = new THREE.BufferGeometry();

  // Generate grid positions
  const gridSize = Math.ceil(Math.cbrt(count));
  const spacing = 5;
  const positions: number[] = [];
  const colors: number[] = [];
  const originalPositions: number[] = []; // Store original positions for animation

  const colorObj = new THREE.Color(color);

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        const px = (x - gridSize / 2) * spacing;
        const py = (y - gridSize / 2) * spacing;
        const pz = (z - gridSize / 2) * spacing;

        positions.push(px, py, pz);
        originalPositions.push(px, py, pz);

        // Add some color variation
        const variation = 0.2;
        colors.push(
          colorObj.r + (Math.random() - 0.5) * variation,
          colorObj.g + (Math.random() - 0.5) * variation,
          colorObj.b + (Math.random() - 0.5) * variation
        );
      }
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('originalPosition', new THREE.Float32BufferAttribute(originalPositions, 3));

  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}

/**
 * Update particles based on audio frequency data
 */
function updateParticles(particles: THREE.Points, frequencyData: Uint8Array, intensity: number): void {
  const positions = particles.geometry.attributes.position;
  const originalPositions = particles.geometry.attributes.originalPosition;
  const colors = particles.geometry.attributes.color;

  const particleCount = positions.count;
  const freqBinCount = frequencyData.length;

  for (let i = 0; i < particleCount; i++) {
    // Map particle to frequency bin
    const freqIndex = Math.floor((i / particleCount) * freqBinCount);
    const freqValue = frequencyData[freqIndex] / 255;

    // Get original position
    const origX = originalPositions.getX(i);
    const origY = originalPositions.getY(i);
    const origZ = originalPositions.getZ(i);

    // Calculate displacement based on frequency
    const displacement = freqValue * intensity * 10;

    // Displace along radial direction from center
    const distance = Math.sqrt(origX * origX + origY * origY + origZ * origZ);
    if (distance > 0) {
      const scale = 1 + (displacement / distance);
      positions.setXYZ(i, origX * scale, origY * scale, origZ * scale);
    }

    // Update color brightness based on frequency
    const baseColor = colors.getX(i);
    const brightness = 1 + freqValue * intensity;
    colors.setXYZ(i, baseColor * brightness, colors.getY(i) * brightness, colors.getZ(i) * brightness);
  }

  positions.needsUpdate = true;
  colors.needsUpdate = true;
}

/**
 * Create simple dancing character (stick figure)
 */
function createDancingCharacter(): THREE.Group {
  const character = new THREE.Group();

  // Materials
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.5,
  });

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(2, 16, 16),
    bodyMaterial
  );
  head.position.y = 10;
  head.name = 'head';
  character.add(head);

  // Body (spine)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 1, 8, 8),
    bodyMaterial
  );
  body.position.y = 5;
  body.name = 'body';
  character.add(body);

  // Arms
  const leftArm = createLimb(bodyMaterial, 5);
  leftArm.position.set(-2, 8, 0);
  leftArm.rotation.z = Math.PI / 4;
  leftArm.name = 'leftArm';
  character.add(leftArm);

  const rightArm = createLimb(bodyMaterial, 5);
  rightArm.position.set(2, 8, 0);
  rightArm.rotation.z = -Math.PI / 4;
  rightArm.name = 'rightArm';
  character.add(rightArm);

  // Legs
  const leftLeg = createLimb(bodyMaterial, 6);
  leftLeg.position.set(-1, 0, 0);
  leftLeg.name = 'leftLeg';
  character.add(leftLeg);

  const rightLeg = createLimb(bodyMaterial, 6);
  rightLeg.position.set(1, 0, 0);
  rightLeg.name = 'rightLeg';
  character.add(rightLeg);

  // Add point light to character
  const light = new THREE.PointLight(0x00ffff, 1, 20);
  light.position.set(0, 10, 0);
  character.add(light);

  return character;
}

/**
 * Create a limb (arm or leg)
 */
function createLimb(material: THREE.Material, length: number): THREE.Mesh {
  const limb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, length, 8),
    material
  );
  limb.position.y = -length / 2;
  return limb;
}

/**
 * Update character animation based on beat and audio
 */
function updateCharacter(
  character: THREE.Group,
  beatPhase: number,
  frequencyData: Uint8Array,
  intensity: number
): void {
  // Get character parts
  const head = character.getObjectByName('head');
  const body = character.getObjectByName('body');
  const leftArm = character.getObjectByName('leftArm');
  const rightArm = character.getObjectByName('rightArm');
  const leftLeg = character.getObjectByName('leftLeg');
  const rightLeg = character.getObjectByName('rightLeg');

  // Calculate bass and treble energy
  const bassEnergy = calculateEnergyInRange(frequencyData, 0, 10) / 255;
  const trebleEnergy = calculateEnergyInRange(frequencyData, 100, 200) / 255;

  // Beat bounce
  const bounce = Math.sin(beatPhase * Math.PI * 2) * intensity * 2;
  character.position.y = -15 + bounce;

  // Head nod on beat
  if (head) {
    head.rotation.x = Math.sin(beatPhase * Math.PI * 2) * intensity * 0.3;
  }

  // Body sway
  if (body) {
    body.rotation.z = Math.sin(beatPhase * Math.PI * 4) * intensity * 0.2;
  }

  // Arm movements (dancing)
  const armPhase = beatPhase * Math.PI * 2;
  if (leftArm) {
    leftArm.rotation.z = Math.PI / 4 + Math.sin(armPhase) * intensity * 0.5;
    leftArm.rotation.x = Math.cos(armPhase * 2) * intensity * 0.3;
  }

  if (rightArm) {
    rightArm.rotation.z = -Math.PI / 4 - Math.sin(armPhase) * intensity * 0.5;
    rightArm.rotation.x = Math.cos(armPhase * 2 + Math.PI) * intensity * 0.3;
  }

  // Leg movements (stepping)
  const stepPhase = beatPhase * Math.PI * 4; // Double speed for steps
  if (leftLeg) {
    leftLeg.rotation.x = Math.sin(stepPhase) * intensity * 0.4 * bassEnergy;
  }

  if (rightLeg) {
    rightLeg.rotation.x = Math.sin(stepPhase + Math.PI) * intensity * 0.4 * bassEnergy;
  }

  // Extra movement on strong bass hits
  if (bassEnergy > 0.7) {
    character.scale.set(
      1 + bassEnergy * intensity * 0.1,
      1 - bassEnergy * intensity * 0.05,
      1 + bassEnergy * intensity * 0.1
    );
  } else {
    character.scale.set(1, 1, 1);
  }

  // Rotation on treble
  character.rotation.y += trebleEnergy * intensity * 0.05;
}

/**
 * Calculate average energy in frequency range
 */
function calculateEnergyInRange(frequencyData: Uint8Array, startBin: number, endBin: number): number {
  let sum = 0;
  const count = Math.min(endBin - startBin, frequencyData.length - startBin);

  for (let i = startBin; i < startBin + count; i++) {
    sum += frequencyData[i];
  }

  return sum / count;
}

export default AudioReactive3D;
