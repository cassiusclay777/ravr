import React, { useRef, useEffect } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import './Spectrogram.css'; // Assuming you have a CSS file for additional styles

const Spectrogram: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { analyzerNode } = useAudioPlayer();

  useEffect(() => {
    const analyser = analyzerNode;
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      if (canvasCtx) {
        canvasCtx.fillStyle = 'black';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i];

          const red = (i * barHeight) / 20;
          const green = barHeight / 2;
          const blue = 50;

          canvasCtx.fillStyle = `rgb(${red},${green},${blue})`;
          canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

          x += barWidth + 1;
        }
      }

      requestAnimationFrame(draw);
    };

    draw();
  }, [analyzerNode]);

  return (
    <canvas
      ref={canvasRef}
      className="spectrogram-canvas"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default Spectrogram;
