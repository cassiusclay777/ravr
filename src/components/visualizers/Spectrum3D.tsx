import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface Spectrum3DProps {
  analyser: AnalyserNode;
  width?: number;
  height?: number;
}

export const Spectrum3D: React.FC<Spectrum3DProps> = ({ 
  analyser, 
  width = 800, 
  height = 600 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const barsRef = useRef<THREE.Mesh[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0x00ffff, 2);
    spotLight.position.set(0, 30, 0);
    spotLight.castShadow = true;
    scene.add(spotLight);

    const pointLight = new THREE.PointLight(0xff00ff, 1);
    pointLight.position.set(-10, 20, 10);
    scene.add(pointLight);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(40, 40);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      metalness: 0.7,
      roughness: 0.3
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create bars
    const barCount = 64;
    const bars: THREE.Mesh[] = [];
    const barWidth = 0.4;
    const barDepth = 0.4;
    const spacing = 0.5;

    for (let i = 0; i < barCount; i++) {
      const geometry = new THREE.BoxGeometry(barWidth, 1, barDepth);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i / barCount * 0.7, 1, 0.5),
        emissive: new THREE.Color().setHSL(i / barCount * 0.7, 1, 0.3),
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2
      });
      
      const bar = new THREE.Mesh(geometry, material);
      bar.position.x = (i - barCount / 2) * spacing;
      bar.position.y = 0;
      bar.castShadow = true;
      
      scene.add(bar);
      bars.push(bar);
    }
    barsRef.current = bars;

    // Animation
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const smoothedData = new Float32Array(barCount);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Sample and smooth frequency data
      const samplesPerBar = Math.floor(bufferLength / barCount);
      
      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < samplesPerBar; j++) {
          sum += dataArray[i * samplesPerBar + j];
        }
        const avg = sum / samplesPerBar / 255;
        smoothedData[i] = smoothedData[i] * 0.7 + avg * 0.3; // Smooth transition
        
        const bar = bars[i];
        const scale = 0.5 + smoothedData[i] * 20;
        bar.scale.y = scale;
        bar.position.y = scale / 2;
        
        // Update emissive intensity based on amplitude
        const material = bar.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.2 + smoothedData[i] * 0.8;
      }
      
      // Rotate camera
      const time = Date.now() * 0.0005;
      camera.position.x = Math.cos(time) * 30;
      camera.position.z = Math.sin(time) * 30;
      camera.lookAt(0, 5, 0);
      
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [analyser, width, height]);

  return <div ref={mountRef} className="rounded overflow-hidden" />;
};
