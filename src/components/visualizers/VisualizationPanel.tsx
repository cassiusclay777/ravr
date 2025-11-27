import React, { useState } from 'react';
import { Spectrogram } from './Spectrogram';
import { Spectrum3D } from './Spectrum3D';
import { Oscilloscope } from './Oscilloscope';
import { LUFSMeter } from './LUFSMeter';

type VisualizationType = 'spectrogram' | 'spectrum3d' | 'oscilloscope' | 'meters' | 'combo';

interface VisualizationPanelProps {
  analyser: AnalyserNode;
  targetLUFS?: number;
  className?: string;
}

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({
  analyser,
  targetLUFS = -14,
  className = ''
}) => {
  const [currentViz, setCurrentViz] = useState<VisualizationType>('spectrum3d');
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!fullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setFullscreen(!fullscreen);
  };

  const renderVisualization = () => {
    switch (currentViz) {
      case 'spectrogram':
        return <Spectrogram analyser={analyser} width={800} height={400} colorMap="jet" />;
      
      case 'spectrum3d':
        return <Spectrum3D analyser={analyser} width={800} height={600} />;
      
      case 'oscilloscope':
        return <Oscilloscope analyser={analyser} width={800} height={300} />;
      
      case 'meters':
        return (
          <div className="flex gap-4">
            <div className="flex-1">
              <Oscilloscope analyser={analyser} width={500} height={200} />
            </div>
            <div className="w-80">
              <LUFSMeter analyser={analyser} targetLUFS={targetLUFS} />
            </div>
          </div>
        );
      
      case 'combo':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Spectrogram analyser={analyser} width={400} height={300} colorMap="viridis" />
            <Oscilloscope analyser={analyser} width={400} height={300} />
            <Spectrum3D analyser={analyser} width={400} height={300} />
            <LUFSMeter analyser={analyser} targetLUFS={targetLUFS} />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {(['spectrum3d', 'spectrogram', 'oscilloscope', 'meters', 'combo'] as VisualizationType[]).map(type => (
            <button
              key={type}
              onClick={() => setCurrentViz(type)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                currentViz === type
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {type === 'spectrum3d' ? '3D Spectrum' :
               type === 'combo' ? 'Multi View' :
               type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        
        <button
          onClick={toggleFullscreen}
          className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors"
        >
          {fullscreen ? '🗙 Exit' : '⛶ Fullscreen'}
        </button>
      </div>
      
      <div className="flex justify-center items-center min-h-[400px]">
        {renderVisualization()}
      </div>
    </div>
  );
};
