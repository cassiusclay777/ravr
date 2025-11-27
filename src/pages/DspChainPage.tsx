import { useRef, useCallback } from 'react';
import DSPChainBuilder from '../components/DSPChainBuilder';
import { AudioContext } from 'standardized-audio-context';

export function DspChainPage() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleChainChange = useCallback((modules: any[]) => {
    console.log('Chain updated:', modules);
    // Handle chain updates here
  }, []);

  // Initialize audio context on component mount
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  if (!audioContextRef.current) {
    return <div>Initializing audio context...</div>;
  }

  return (
    <div className="text-white">
      <h1 className="text-4xl font-bold mb-6">DSP Chain</h1>
      <div className="bg-black/50 p-6 rounded-lg backdrop-blur-sm">
        <DSPChainBuilder 
          context={audioContextRef.current as any} 
          onChainChange={handleChainChange} 
        />
      </div>
    </div>
  );
}
