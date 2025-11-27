import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const VisualizerContainer = styled.div<{ isFullscreen: boolean }>`
  position: ${({ isFullscreen }) => (isFullscreen ? 'fixed' : 'relative')};
  top: 0;
  left: 0;
  width: ${({ isFullscreen }) => (isFullscreen ? '100vw' : '100%')};
  height: ${({ isFullscreen }) => (isFullscreen ? '100vh' : '400px')};
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  z-index: ${({ isFullscreen }) => (isFullscreen ? 1000 : 1)};
  overflow: hidden;
`;

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
`;

const FullscreenButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  z-index: 10;
  backdrop-filter: blur(5px);
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

interface SpectrumVisualizerProps {
  analyzer: AnalyserNode | null;
  width?: number;
  height?: number;
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  analyzer,
  width = 800,
  height = 400,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width, height });

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Update dimensions when fullscreen changes
  useEffect(() => {
    const handleResize = () => {
      if (document.fullscreenElement) {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      } else {
        setDimensions({ width, height });
      }
    };

    document.addEventListener('fullscreenchange', handleResize);
    return () => {
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, [width, height]);

  // Main visualization loop
  useEffect(() => {
    if (!analyzer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    // Set canvas dimensions
    canvas.width = dimensions.width * window.devicePixelRatio;
    canvas.height = dimensions.height * window.devicePixelRatio;
    canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set up analyzer
    analyzer.fftSize = 2048;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Animation loop
    const draw = () => {
      if (!canvasCtx) return;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      
      const WIDTH = dimensions.width;
      const HEIGHT = dimensions.height;
      
      analyzer.getByteFrequencyData(dataArray);
      
      // Clear canvas
      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
      
      // Draw gradient background
      const gradient = canvasCtx.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, '#0f0c29');
      gradient.addColorStop(1, '#24243e');
      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
      
      // Draw frequency bars
      const barWidth = (WIDTH / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * HEIGHT * 0.8;
        
        // Create gradient for bars
        const barGradient = canvasCtx.createLinearGradient(0, HEIGHT - barHeight, 0, HEIGHT);
        barGradient.addColorStop(0, '#00c6ff');
        barGradient.addColorStop(1, '#0072ff');
        
        canvasCtx.fillStyle = barGradient;
        canvasCtx.fillRect(
          x,
          HEIGHT - barHeight,
          barWidth - 1,
          barHeight
        );
        
        x += barWidth + 1;
      }
      
      // Add glow effect
      const glowGradient = canvasCtx.createRadialGradient(
        WIDTH / 2,
        HEIGHT / 2,
        0,
        WIDTH / 2,
        HEIGHT / 2,
        Math.max(WIDTH, HEIGHT) * 0.7
      );
      glowGradient.addColorStop(0, 'rgba(0, 198, 255, 0.1)');
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      canvasCtx.fillStyle = glowGradient;
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    };
    
    draw();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyzer, dimensions]);

  return (
    <VisualizerContainer isFullscreen={isFullscreen}>
      <Canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
      />
      <FullscreenButton onClick={toggleFullscreen}>
        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </FullscreenButton>
    </VisualizerContainer>
  );
};
