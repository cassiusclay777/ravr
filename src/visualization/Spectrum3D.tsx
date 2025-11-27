import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface Spectrum3DProps {
  analyzerNode: AnalyserNode | null;
  isPlaying: boolean;
}

export const Spectrum3D: React.FC<Spectrum3DProps> = ({ analyzerNode, isPlaying }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const barsRef = useRef<THREE.Mesh[]>([]);
  const animationIdRef = useRef<number>();
  const resizeObserverRef = useRef<ResizeObserver>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 400;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 20, 50);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create spectrum bars
    const barCount = 64;
    const barWidth = 1;
    const barSpacing = 1.5;
    const bars: THREE.Mesh[] = [];

    for (let i = 0; i < barCount; i++) {
      const geometry = new THREE.BoxGeometry(barWidth, 1, barWidth);
      const hue = (i / barCount) * 360;
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(hue / 360, 0.8, 0.6),
        shininess: 100,
        transparent: true,
        opacity: 0.9
      });

      const bar = new THREE.Mesh(geometry, material);
      bar.position.x = (i - barCount / 2) * barSpacing;
      bar.position.y = 0;
      bar.castShadow = true;
      bar.receiveShadow = true;

      scene.add(bar);
      bars.push(bar);
    }

    barsRef.current = bars;

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(barCount * barSpacing * 2, 50);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.3
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Handle resize
    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current || !mountRef.current) return;
      const w = mountRef.current.clientWidth || 800;
      const h = mountRef.current.clientHeight || 400;
      rendererRef.current.setSize(w, h, false);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => handleResize());
      ro.observe(mountRef.current);
      resizeObserverRef.current = ro;
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (resizeObserverRef.current && mountRef.current) {
        resizeObserverRef.current.disconnect();
      } else {
        window.removeEventListener('resize', () => {});
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!analyzerNode || !isPlaying) return;

    const animate = () => {
      if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

      const dataArray = new Uint8Array(analyzerNode.frequencyBinCount);
      analyzerNode.getByteFrequencyData(dataArray);

      // Update bars based on frequency data
      barsRef.current.forEach((bar, index) => {
        const dataIndex = Math.floor((index / barsRef.current.length) * dataArray.length);
        const value = dataArray[dataIndex] / 255;
        
        // Smooth scaling
        const targetHeight = Math.max(0.5, value * 30);
        bar.scale.y += (targetHeight - bar.scale.y) * 0.1;
        bar.position.y = (bar.scale.y - 1) / 2;

        // Color intensity based on amplitude
        const material = bar.material as THREE.MeshPhongMaterial;
        const hue = (index / barsRef.current.length) * 360;
        material.color.setHSL(hue / 360, 0.8, 0.3 + value * 0.5);
        material.emissive.setHSL(hue / 360, 0.5, value * 0.3);
      });

      // Rotate camera around the scene
      const time = Date.now() * 0.0005;
      cameraRef.current.position.x = Math.cos(time) * 60;
      cameraRef.current.position.z = Math.sin(time) * 60;
      cameraRef.current.lookAt(0, 5, 0);

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [analyzerNode, isPlaying]);

  return (
    <div className="w-full h-96 bg-black rounded-lg overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};
