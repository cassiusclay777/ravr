import React, { useEffect, useRef } from "react";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { usePlayer } from "@/state/playerStore";

export function NowPlaying() {
  const {
    load: loadAudio,
    toggle,
    isPlaying,
    currentTime,
    duration,
    setVolume,
    volume,
    seek,
  } = useAudioEngine();
  
  const { current, setCurrent } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ensure the audio element exists in the DOM
  useEffect(() => {
    let audioElement = document.getElementById('ravr-audio') as HTMLAudioElement;
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = 'ravr-audio';
      audioElement.className = 'hidden';
      document.body.appendChild(audioElement);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create a URL for the file
    const url = URL.createObjectURL(file);
    
    // Update the player state
    setCurrent({
      id: URL.createObjectURL(file), // Use URL as ID for now
      name: file.name,
      url
    });
    
    // Load the audio
    loadAudio(url);
  };

  return (
    <section className="fixed bottom-0 left-0 right-0 bg-ravr-panel/90 backdrop-blur-sm border-t border-white/10 p-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        <button
          onClick={toggle}
          className="rounded-full w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 transition"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <PauseIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <div className="text-sm font-medium truncate max-w-md">
            {current?.name || 'No track selected'}
          </div>
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-gray-400 w-10">
              {format(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={Number.isFinite(duration) ? duration : 0}
              step={0.1}
              value={Number.isFinite(currentTime) ? currentTime : 0}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
            <span className="text-xs text-gray-400 w-10 text-right">
              {format(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="text-gray-400 hover:text-white" aria-label="Volume control" title="Volume control">
            <VolumeIcon className="w-5 h-5" />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
          
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="ml-2 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition"
          >
            Open File
          </button>
        </div>
      </div>
    </section>
  );
}

// Simple icon components
function PlayIcon({ className }: { readonly className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PauseIcon({ className }: { readonly className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function VolumeIcon({ className }: { readonly className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 5v14m0-14a9 9 0 00-9 9 9 9 0 009 9" />
    </svg>
  );
}

function format(s:number){
  if(!isFinite(s)) return "0:00";
  const m = Math.floor(s/60);
  const r = Math.floor(s%60).toString().padStart(2,"0");
  return `${m}:${r}`;
}