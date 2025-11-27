import React, { useState, useEffect, useCallback } from 'react';
import { useMobileDetection } from './MobileOptimizations';

interface VoiceCommand {
  command: string;
  action: () => void;
  aliases?: string[];
}

interface VoiceControlProps {
  commands: VoiceCommand[];
  onCommandRecognized?: (command: string) => void;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({ 
  commands, 
  onCommandRecognized 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const { isAndroid, isMobile } = useMobileDetection();

  useEffect(() => {
    // Check if SpeechRecognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    interface SpeechRecognitionEvent extends Event {
      resultIndex: number;
      results: SpeechRecognitionResultList;
    }
    
    interface SpeechRecognitionResultList {
      [index: number]: SpeechRecognitionResult;
      length: number;
    }
    
    interface SpeechRecognitionResult {
      [index: number]: SpeechRecognitionAlternative;
      isFinal: boolean;
      length: number;
    }
    
    interface SpeechRecognitionAlternative {
      transcript: string;
      confidence: number;
    }
    
    interface SpeechRecognitionErrorEvent extends Event {
      error: string;
      message: string;
    }
    
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'cs-CZ'; // Czech language
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
        navigator.vibrate?.(50);
      };

      recognitionInstance.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript.toLowerCase();
        setTranscript(transcriptText);

        if (event.results[current].isFinal) {
          processVoiceCommand(transcriptText);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
        setTranscript('');
      };

      setRecognition(recognitionInstance);
      setIsSupported(true);
    }
  }, []);

  const processVoiceCommand = useCallback((text: string) => {
    const normalizedText = text.toLowerCase().trim();
    
    for (const cmd of commands) {
      const triggers = [cmd.command.toLowerCase(), ...(cmd.aliases?.map(a => a.toLowerCase()) || [])];
      
      if (triggers.some(trigger => normalizedText.includes(trigger))) {
        cmd.action();
        onCommandRecognized?.(cmd.command);
        navigator.vibrate?.(100);
        return;
      }
    }
  }, [commands, onCommandRecognized]);

  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={isListening ? stopListening : startListening}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center
          transition-all shadow-lg touch-manipulation
          ${isListening 
            ? 'bg-red-600 animate-pulse shadow-red-500/50' 
            : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/30'
          }
        `}
        style={{ minWidth: '56px', minHeight: '56px' }}
      >
        <span className="text-2xl">{isListening ? '🔴' : '🎤'}</span>
      </button>

      {/* Transcript Display */}
      {transcript && (
        <div className="mt-2 bg-black/90 backdrop-blur-xl rounded-xl p-3 text-white text-sm max-w-xs shadow-xl border border-white/10">
          <p className="font-semibold mb-1">Poslouchám:</p>
          <p className="text-white/80">{transcript}</p>
        </div>
      )}
    </div>
  );
};

// Predefined voice commands hook
export const useVoiceCommands = (
  isPlaying: boolean,
  onPlayPause: () => void,
  onStop: () => void,
  onNext?: () => void,
  onPrevious?: () => void,
  onVolumeUp?: () => void,
  onVolumeDown?: () => void,
  onMute?: () => void
) => {
  const commands: VoiceCommand[] = [
    {
      command: 'přehrát',
      action: () => !isPlaying && onPlayPause(),
      aliases: ['play', 'spustit', 'pusť'],
    },
    {
      command: 'pauza',
      action: () => isPlaying && onPlayPause(),
      aliases: ['pause', 'pozastav', 'zastav'],
    },
    {
      command: 'stop',
      action: onStop,
      aliases: ['zastavit', 'vypnout'],
    },
    {
      command: 'další',
      action: () => onNext?.(),
      aliases: ['next', 'další skladba', 'skip', 'přeskočit'],
    },
    {
      command: 'předchozí',
      action: () => onPrevious?.(),
      aliases: ['previous', 'zpět', 'zpátky', 'předešlá'],
    },
    {
      command: 'hlasitěji',
      action: () => onVolumeUp?.(),
      aliases: ['volume up', 'zvýšit hlasitost', 'nahlas', 'víc'],
    },
    {
      command: 'tišeji',
      action: () => onVolumeDown?.(),
      aliases: ['volume down', 'snížit hlasitost', 'potichu', 'méně'],
    },
    {
      command: 'ztlumit',
      action: () => onMute?.(),
      aliases: ['mute', 'ticho', 'vypnout zvuk'],
    },
  ];

  return commands;
};

// Voice Control Settings Panel
export const VoiceControlSettings: React.FC<{
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}> = ({ isEnabled, onToggle }) => {
  const [testMode, setTestMode] = useState(false);
  const { isAndroid, isMobile } = useMobileDetection();

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">🎤 Hlasové ovládání</h3>
          <p className="text-white/60 text-sm">Ovládejte přehrávač hlasem</p>
        </div>
        <button
          onClick={() => onToggle(!isEnabled)}
          className={`
            w-16 h-8 rounded-full transition-all relative
            ${isEnabled ? 'bg-cyan-600' : 'bg-white/20'}
          `}
        >
          <div className={`
            w-6 h-6 rounded-full bg-white absolute top-1 transition-transform
            ${isEnabled ? 'translate-x-9' : 'translate-x-1'}
          `} />
        </button>
      </div>

      {isEnabled && (
        <div className="space-y-3 text-sm">
          <div className="bg-black/30 rounded-lg p-3">
            <p className="text-white/80 font-semibold mb-2">📋 Dostupné příkazy:</p>
            <ul className="space-y-1 text-white/60">
              <li>• "Přehrát" / "Play" - Spustí přehrávání</li>
              <li>• "Pauza" / "Pause" - Pozastaví přehrávání</li>
              <li>• "Stop" - Zastaví přehrávání</li>
              <li>• "Další" / "Next" - Další skladba</li>
              <li>• "Předchozí" / "Previous" - Předchozí skladba</li>
              <li>• "Hlasitěji" / "Volume up" - Zvýší hlasitost</li>
              <li>• "Tišeji" / "Volume down" - Sníží hlasitost</li>
              <li>• "Ztlumit" / "Mute" - Ztlumí zvuk</li>
            </ul>
          </div>

          <div className="bg-cyan-600/20 rounded-lg p-3 border border-cyan-600/30">
            <p className="text-cyan-400 text-xs">
              💡 Tip: Klepněte na ikonu mikrofonu v pravém horním rohu a řekněte příkaz
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
