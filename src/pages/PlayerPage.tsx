import { FC, useEffect, useState, useCallback } from 'react';
import { AudioContextManager } from '../audio/AudioContextManager';
import MultiTrackView from '../views/MultiTrackView';

interface PlayerPageProps {
  onLoadFile?: (file: File) => void | Promise<void>;
  className?: string;
}

const PlayerPage: FC<PlayerPageProps> = ({
  onLoadFile,
  className = '',
}) => {
  const [audioContextManager] = useState(() => new AudioContextManager());
  
  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      // Close the audio context when component unmounts
      if (audioContextManager.context.state !== 'closed') {
        audioContextManager.context.close();
      }
    };
  }, [audioContextManager]);
  
  // Handle file loading from parent component if needed
  const handleLoadFile = useCallback(async (file: File) => {
    if (onLoadFile) {
      return onLoadFile(file);
    }
    
    // Default handling if no onLoadFile prop provided
    const url = URL.createObjectURL(file);
    try {
      await audioContextManager.loadAudio(url);
    } catch (error) {
      console.error('Error loading audio file:', error);
    }
  }, [audioContextManager, onLoadFile]);

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <MultiTrackView 
        audioContextManager={audioContextManager}
        onLoadFile={handleLoadFile}
      />
    </div>
  );
};

export default PlayerPage;
